from __future__ import annotations

from datetime import date as date_type
from typing import Literal

from pydantic import BaseModel, Field


class MoneyAmount(BaseModel):
    value: float = Field(description="Numeric amount")
    currency: str = Field(default="USD", description="Currency code")
    context: str | None = Field(default=None, description="What this amount refers to")


class ExtractedEntity(BaseModel):
    name: str = Field(description="Entity name or label")
    type: str = Field(description="Entity type: person, organization, date, amount, product, location, etc.")
    value: str = Field(description="Extracted value as text")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0-1")


class DocumentClassification(BaseModel):
    document_type: Literal["invoice", "cv", "contract", "other"] = Field(
        description="Classified document type"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score for the classification")
    reasoning: str = Field(description="Brief reasoning behind the classification")


class DocumentExtraction(BaseModel):
    entities: list[ExtractedEntity] = Field(default_factory=list, description="All extracted entities")
    amounts: list[MoneyAmount] = Field(default_factory=list, description="Monetary amounts found")
    names: list[str] = Field(default_factory=list, description="Person or organization names")
    dates: list[str] = Field(default_factory=list, description="Dates found in ISO format or original text")


class DocumentSummary(BaseModel):
    summary: str = Field(description="Concise summary of the document")
    key_points: list[str] = Field(default_factory=list, description="Key bullet points")
    document_type: str = Field(description="Detected document type for context")


class DocumentIntelligenceResult(BaseModel):
    classification: DocumentClassification
    extraction: DocumentExtraction
    summary: DocumentSummary
    processing_time_ms: int = Field(description="Total processing time in milliseconds")


class ExtractionResult(BaseModel):
    text: str = Field(description="Extracted text content from the document")
    pages: int | None = Field(default=None, description="Number of pages if available")
    error: str | None = Field(default=None, description="Error message if extraction failed")
