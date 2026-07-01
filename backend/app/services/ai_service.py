from __future__ import annotations

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.services.prompts import (
    CLASSIFY_SYSTEM_PROMPT,
    EXTRACT_SYSTEM_PROMPT,
    STRUCTURED_EXTRACT_SYSTEM_PROMPT,
    SUMMARIZE_SYSTEM_PROMPT,
)
from app.services.structured_output_models import (
    DocumentClassification,
    DocumentExtraction,
    DocumentIntelligenceResult,
    DocumentSummary,
    ExtractionResult,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


MAX_RETRIES = 3
BASE_DELAY = 1.0
MAX_DELAY = 10.0


class AIProvider(ABC):
    @abstractmethod
    async def chat(self, system_prompt: str, user_text: str, response_model: type[T]) -> T:
        ...


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o", base_url: str | None = None) -> None:
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url) if base_url else AsyncOpenAI(api_key=api_key)
        self.model = model
        self.base_url = base_url

    async def chat(self, system_prompt: str, user_text: str, response_model: type[T]) -> T:
        last_error: Exception | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_text},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=4096,
                )

                content = response.choices[0].message.content
                if not content:
                    msg = "Empty response from OpenAI"
                    raise ValueError(msg)

                validated = response_model.model_validate_json(content)
                return validated

            except ValidationError as exc:
                logger.warning(
                    "OpenAI response validation failed (attempt %d/%d): %s",
                    attempt, MAX_RETRIES, exc,
                )
                last_error = exc

            except Exception as exc:
                logger.warning(
                    "OpenAI API call failed (attempt %d/%d): %s",
                    attempt, MAX_RETRIES, exc,
                )
                last_error = exc

            if attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                await asyncio.sleep(delay)

        msg = f"OpenAI request failed after {MAX_RETRIES} retries: {last_error}"
        raise RuntimeError(msg)


class DocumentIntelligenceService:
    def __init__(self, provider: AIProvider | None = None) -> None:
        self._provider = provider or self._default_provider()

    def _default_provider(self) -> AIProvider:
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not set — using NullProvider")
            return NullProvider()
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL, base_url=settings.OPENAI_BASE_URL)

    async def classify(self, text: str) -> DocumentClassification:
        result = await self._provider.chat(
            CLASSIFY_SYSTEM_PROMPT, text, DocumentClassification,
        )
        return result

    async def extract(self, text: str) -> DocumentExtraction:
        result = await self._provider.chat(
            EXTRACT_SYSTEM_PROMPT, text, DocumentExtraction,
        )
        return result

    async def summarize(self, text: str) -> DocumentSummary:
        result = await self._provider.chat(
            SUMMARIZE_SYSTEM_PROMPT, text, DocumentSummary,
        )
        return result

    async def analyze(self, text: str) -> DocumentIntelligenceResult:
        start = time.monotonic()

        classification_task = self.classify(text)
        extraction_task = self.extract(text)
        summary_task = self.summarize(text)

        results = await asyncio.gather(
            classification_task,
            extraction_task,
            summary_task,
            return_exceptions=True,
        )

        elapsed_ms = int((time.monotonic() - start) * 1000)

        classification: DocumentClassification
        extraction: DocumentExtraction
        summary: DocumentSummary

        classification_result, extraction_result, summary_result = results

        if isinstance(classification_result, Exception):
            logger.error("Classification failed: %s", classification_result)
            classification = DocumentClassification(
                document_type="other",
                confidence=0.0,
                reasoning=f"Classification error: {classification_result}",
            )
        else:
            classification = classification_result

        if isinstance(extraction_result, Exception):
            logger.error("Extraction failed: %s", extraction_result)
            extraction = DocumentExtraction()
        else:
            extraction = extraction_result

        if isinstance(summary_result, Exception):
            logger.error("Summarization failed: %s", summary_result)
            summary = DocumentSummary(
                summary="Summarization failed.",
                key_points=[],
                document_type=classification.document_type,
            )
        else:
            summary = summary_result

        return DocumentIntelligenceResult(
            classification=classification,
            extraction=extraction,
            summary=summary,
            processing_time_ms=elapsed_ms,
        )

    async def structured_extract(
        self,
        text: str,
        schema_json: str,
        workflow_context: dict | None = None,
    ) -> dict:
        client: AsyncOpenAI | None = getattr(self._provider, "client", None)
        base_url: str | None = getattr(self._provider, "base_url", None)
        model: str = getattr(self._provider, "model", settings.OPENAI_MODEL)

        if client is None:
            if not settings.OPENAI_API_KEY:
                return {"error": "UNRESOLVABLE", "reason": "No AI provider configured"}
            kwargs = {"api_key": settings.OPENAI_API_KEY}
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            client = AsyncOpenAI(**kwargs)

        user_message = ""
        if workflow_context:
            user_message += f"WORKFLOW CONTEXT:\n{json.dumps(workflow_context, indent=2)}\n\n"
        user_message += f"INPUT:\n{text}\n\n"
        user_message += f"OUTPUT SCHEMA:\n{schema_json}"

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": STRUCTURED_EXTRACT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0.05,
                max_tokens=4096,
            )

            content = response.choices[0].message.content
            if not content:
                return {"error": "UNRESOLVABLE", "reason": "Empty response from AI provider"}

            parsed = json.loads(content)

            if isinstance(parsed, dict) and "error" in parsed:
                return parsed

            return parsed

        except json.JSONDecodeError:
            return {"error": "UNRESOLVABLE", "reason": "AI response was not valid JSON"}
        except Exception as exc:
            logger.exception("Structured extraction failed")
            return {"error": "UNRESOLVABLE", "reason": str(exc)}

    async def extract_text(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> ExtractionResult:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if ext in ("txt", "md", "csv", "json", "xml", "html"):
            text = file_bytes.decode("utf-8", errors="replace")
            return ExtractionResult(text=text)

        if ext in ("pdf",):
            return ExtractionResult(
                text="",
                error="PDF text extraction requires a PDF parser (pdfplumber / PyMuPDF). Install and wire into this method.",
            )

        if ext in ("png", "jpg", "jpeg", "tiff", "bmp"):
            return ExtractionResult(
                text="",
                error="Image OCR requires an OCR engine (Tesseract / OCRmyPDF). Install and wire into this method.",
            )

        if ext in ("docx", "doc"):
            return ExtractionResult(
                text="",
                error="DOCX text extraction requires python-docx. Install and wire into this method.",
            )

        return ExtractionResult(
            text="",
            error=f"Unsupported file type: .{ext}",
        )


class NullProvider(AIProvider):
    async def chat(self, system_prompt: str, user_text: str, response_model: type[T]) -> T:
        msg = "No AI provider configured — set OPENAI_API_KEY"
        raise RuntimeError(msg)
