from __future__ import annotations

import asyncio
import logging
from collections import deque
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.models.billing import UsageEventType, UsageLog
from app.models.workflow import (
    ExecutionStatus,
    NodeExecution,
    NodeType,
    RunStatus,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
    WorkflowRun,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


class WorkflowExecutor:
    def __init__(self, db: Session, run_id: UUID):
        self.db = db
        self.run_id = run_id
        self.run: WorkflowRun | None = None
        self.workflow: Workflow | None = None
        self.nodes: dict[UUID, WorkflowNode] = {}
        self.edges: list[WorkflowEdge] = []
        self.adjacency: dict[UUID, list[WorkflowEdge]] = {}
        self.in_degree: dict[UUID, int] = {}

    def _load(self) -> None:
        self.run = (
            self.db.query(WorkflowRun)
            .filter(WorkflowRun.id == self.run_id)
            .first()
        )
        if not self.run:
            msg = f"WorkflowRun {self.run_id} not found"
            raise ValueError(msg)

        self.workflow = (
            self.db.query(Workflow)
            .filter(Workflow.id == self.run.workflow_id)
            .first()
        )
        if not self.workflow:
            msg = f"Workflow {self.run.workflow_id} not found"
            raise ValueError(msg)

        self.nodes = {n.id: n for n in self.workflow.nodes}
        self.edges = list(self.workflow.edges)

        self.adjacency = {nid: [] for nid in self.nodes}
        self.in_degree = {nid: 0 for nid in self.nodes}

        for edge in self.edges:
            if edge.from_node_id in self.adjacency:
                self.adjacency[edge.from_node_id].append(edge)
            if edge.to_node_id in self.in_degree:
                self.in_degree[edge.to_node_id] += 1

    def _validate_dag(self) -> None:
        visited: set[UUID] = set()
        in_stack: set[UUID] = set()

        def dfs(node_id: UUID) -> None:
            visited.add(node_id)
            in_stack.add(node_id)
            for edge in self.adjacency.get(node_id, []):
                if edge.to_node_id in in_stack:
                    msg = f"Cycle detected involving node {edge.to_node_id}"
                    raise ValueError(msg)
                if edge.to_node_id not in visited:
                    dfs(edge.to_node_id)
            in_stack.discard(node_id)

        for nid in self.nodes:
            if nid not in visited:
                dfs(nid)

    def _find_start_nodes(self) -> list[UUID]:
        start_nodes = [
            nid
            for nid, degree in self.in_degree.items()
            if degree == 0
        ]
        if not start_nodes:
            msg = "No entry node found — the DAG has no root"
            raise ValueError(msg)
        return start_nodes

    def _handler_for(self, node: WorkflowNode) -> type[BaseNode]:
        handler_type = node.config.get("handler")
        if not handler_type:
            msg = f"Node {node.id} has no 'handler' in config"
            raise ValueError(msg)
        return NodeRegistry.get(handler_type)

    def _should_skip(self, node_id: UUID, skip_set: set[UUID]) -> bool:
        return node_id in skip_set

    def _edge_matches_branch(self, edge: WorkflowEdge, node_result: NodeResult | None) -> bool:
        branch = node_result.branch if node_result else None
        if edge.condition_config is None:
            return branch is None
        expected = edge.condition_config.get("match")
        if expected is None:
            return branch is None
        return branch == expected

    def _create_execution(
        self,
        node: WorkflowNode,
        status: ExecutionStatus,
        input_data: dict | None = None,
        output_data: dict | None = None,
        logs: list | None = None,
        error_message: str | None = None,
    ) -> NodeExecution:
        execution = NodeExecution(
            run_id=self.run_id,
            node_id=node.id,
            status=status,
            input_data=input_data or {},
            output_data=output_data or {},
            logs=logs or [],
            error_message=error_message,
            retry_count=0,
            started_at=datetime.now(timezone.utc) if status in (ExecutionStatus.RUNNING, ExecutionStatus.SUCCESS, ExecutionStatus.FAILED) else None,
            finished_at=datetime.now(timezone.utc) if status in (ExecutionStatus.SUCCESS, ExecutionStatus.FAILED, ExecutionStatus.SKIPPED) else None,
        )
        self.db.add(execution)
        self.db.flush()
        return execution

    def _simulate_node(self, node: WorkflowNode, context: dict) -> NodeResult:
        logger.info("Node executing (simulated): %s label=%s", node.id, node.label)
        output = {
            "simulated": True,
            "handler": node.config.get("handler", "unknown"),
            "input_keys": list(context.keys()),
        }
        return NodeResult(
            output_data=output,
            logs=[{"level": "info", "message": f"Simulated execution for {node.label}"}],
        )

    async def execute(self) -> None:
        logger.info("Workflow execution started for run_id=%s", self.run_id)

        try:
            self._load()
            self._validate_dag()
            self.run.status = RunStatus.RUNNING
            self.db.flush()

            logger.info("Workflow started: run_id=%s workflow_id=%s", self.run_id, self.workflow.id if self.workflow else "?")
            context: dict = {"triggered_at": self.run.started_at.isoformat()}
            skip_set: set[UUID] = set()
            finished: set[UUID] = set()
            node_results: dict[UUID, NodeResult] = {}

            ready = deque(self._find_start_nodes())

            while ready:
                node_id = ready.popleft()
                if self._should_skip(node_id, skip_set):
                    continue

                node = self.nodes[node_id]
                try:
                    handler_cls = self._handler_for(node)
                except ValueError:
                    logger.warning("Handler not found for node %s label=%s handler=%s — simulating", node.id, node.label, node.config.get("handler"))
                    handler_cls = None

                logger.info("Node executing: %s label=%s handler=%s", node.id, node.label, node.config.get("handler", "none"))

                input_data = dict(context)

                execution = self._create_execution(node, ExecutionStatus.RUNNING, input_data=input_data)
                self.db.flush()

                last_error: str | None = None
                success = False

                for attempt in range(1, MAX_RETRIES + 1):
                    try:
                        if handler_cls is not None:
                            handler_instance = handler_cls()
                            result = await handler_instance.execute(context, node.config)
                        else:
                            result = self._simulate_node(node, context)

                        execution.status = ExecutionStatus.SUCCESS
                        execution.output_data = result.output_data
                        execution.logs = result.logs
                        execution.finished_at = datetime.now(timezone.utc)
                        execution.retry_count = attempt - 1

                        context[str(node.id)] = result.output_data
                        node_results[node.id] = result
                        finished.add(node_id)
                        success = True

                        logger.info("Node finished: %s label=%s status=success", node.id, node.label)

                        handler_type = node.config.get("handler", "")
                        if handler_type in ("ai_extract", "ai_summarize"):
                            self.db.add(UsageLog(
                                organization_id=self.run.organization_id,
                                event_type=UsageEventType.AI_CALL,
                                event_metadata={
                                    "run_id": str(self.run_id),
                                    "node_id": str(node.id),
                                    "handler": handler_type,
                                    "workflow_id": str(self.workflow.id) if self.workflow else None,
                                },
                            ))
                        break

                    except Exception as exc:
                        last_error = str(exc)
                        logger.warning(
                            "Node %s attempt %d/%d failed: %s",
                            node.id, attempt, MAX_RETRIES, last_error,
                        )

                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(RETRY_DELAY_SECONDS * attempt)
                            execution.retry_count = attempt

                if not success:
                    execution.status = ExecutionStatus.FAILED
                    execution.error_message = last_error
                    execution.finished_at = datetime.now(timezone.utc)
                    self.db.flush()

                    self.run.status = RunStatus.FAILED
                    self.run.error_message = f"Node {node.id} failed after {MAX_RETRIES} retries: {last_error}"
                    self.run.finished_at = datetime.now(timezone.utc)
                    self.db.flush()

                    self.db.add(UsageLog(
                        organization_id=self.run.organization_id,
                        event_type=UsageEventType.WORKFLOW_RUN,
                        event_metadata={
                            "run_id": str(self.run_id),
                            "workflow_id": str(self.workflow.id) if self.workflow else None,
                            "status": "failed",
                            "error": f"Node {node.id} failed: {last_error}",
                        },
                    ))
                    self.db.flush()
                    return

                self.db.flush()

                node_result = node_results.get(node_id)

                for edge in self.adjacency.get(node_id, []):
                    if not self._edge_matches_branch(edge, node_result):
                        skip_set.add(edge.to_node_id)
                        skipped_node = self.nodes.get(edge.to_node_id)
                        if skipped_node:
                            self._create_execution(
                                skipped_node,
                                ExecutionStatus.SKIPPED,
                                input_data=dict(context),
                                logs=[{"level": "info", "message": f"Skipped: condition branch '{node_result.branch if node_result else None}' did not match edge condition"}],
                            )
                        continue

                    self.in_degree[edge.to_node_id] -= 1
                    if self.in_degree[edge.to_node_id] == 0:
                        ready.append(edge.to_node_id)

                if not self.adjacency.get(node_id):
                    logger.info("Node %s is a terminal node — no outgoing edges", node_id)

            self.run.status = RunStatus.SUCCESS
            self.run.finished_at = datetime.now(timezone.utc)
            self.db.flush()
            logger.info("Workflow completed: run_id=%s status=success nodes_executed=%d", self.run_id, len(finished))

            self.db.add(UsageLog(
                organization_id=self.run.organization_id,
                event_type=UsageEventType.WORKFLOW_RUN,
                event_metadata={
                    "run_id": str(self.run_id),
                    "workflow_id": str(self.workflow.id) if self.workflow else None,
                    "status": "success",
                },
            ))
            self.db.flush()

        except Exception as exc:
            logger.exception("Workflow run %s failed with unhandled error", self.run_id)
            self.run.status = RunStatus.FAILED
            self.run.error_message = str(exc)
            self.run.finished_at = datetime.now(timezone.utc)
            self.db.flush()
            logger.info("Workflow completed: run_id=%s status=failed error=%s", self.run_id, str(exc))

            self.db.add(UsageLog(
                organization_id=self.run.organization_id,
                event_type=UsageEventType.WORKFLOW_RUN,
                event_metadata={
                    "run_id": str(self.run_id),
                    "workflow_id": str(self.workflow.id) if self.workflow else None,
                    "status": "failed",
                    "error": str(exc),
                },
            ))
            self.db.flush()
