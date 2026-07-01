from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.models.organization import Organization
from app.models.workflow import NodeType, Workflow, WorkflowEdge, WorkflowNode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    position: dict
    config: dict = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None


class WorkflowDefinition(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class WorkflowCreate(BaseModel):
    name: str
    description: str | None = None
    trigger_type: str = "manual"
    workflow_definition: WorkflowDefinition | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_type: str | None = None
    is_active: bool | None = None
    workflow_definition: WorkflowDefinition | None = None


class WorkflowResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    trigger_type: str
    is_active: bool
    workflow_definition: dict | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowResponse]
    total: int


def validate_dag(definition: WorkflowDefinition) -> list[str]:
    errors: list[str] = []
    node_ids = {n.id for n in definition.nodes}

    for edge in definition.edges:
        if edge.source not in node_ids:
            errors.append(f"Edge '{edge.id}': source node '{edge.source}' not found")
        if edge.target not in node_ids:
            errors.append(f"Edge '{edge.id}': target node '{edge.target}' not found")

    if not definition.nodes:
        return errors

    adjacency = {n.id: [] for n in definition.nodes}
    in_degree = {n.id: 0 for n in definition.nodes}

    for edge in definition.edges:
        if edge.source in adjacency and edge.target in in_degree:
            adjacency[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    visited: set[str] = set()
    in_stack: set[str] = set()

    def dfs(node_id: str) -> None:
        visited.add(node_id)
        in_stack.add(node_id)
        for neighbor in adjacency.get(node_id, []):
            if neighbor in in_stack:
                errors.append(f"Cycle detected: node '{node_id}' -> '{neighbor}'")
                return
            if neighbor not in visited:
                dfs(neighbor)
        in_stack.discard(node_id)

    for nid in definition.nodes:
        if nid.id not in visited:
            dfs(nid.id)

    start_nodes = [nid for nid, deg in in_degree.items() if deg == 0]
    if not start_nodes and definition.nodes:
        errors.append("No entry node found: all nodes have incoming edges (cycle or disconnected)")

    return errors


def _serialize_definition(definition: WorkflowDefinition | None) -> dict | None:
    if definition is None:
        return None
    return definition.model_dump()


FRONTEND_TYPE_TO_NODE_TYPE = {
    "trigger": NodeType.TRIGGER,
    "ai_action": NodeType.AI,
    "condition": NodeType.CONDITION,
    "output": NodeType.ACTION,
}


def _sync_nodes_and_edges(db: Session, workflow: Workflow, definition: WorkflowDefinition) -> None:
    for node in workflow.nodes:
        db.delete(node)
    for edge in workflow.edges:
        db.delete(edge)
    db.flush()

    frontend_id_to_uuid: dict[str, UUID] = {}

    for gn in definition.nodes:
        node_type = FRONTEND_TYPE_TO_NODE_TYPE.get(gn.type, NodeType.OUTPUT)
        db_node = WorkflowNode(
            workflow_id=workflow.id,
            type=node_type,
            label=gn.label,
            config={**gn.config, "_frontend_id": gn.id},
            position_x=gn.position.get("x", 0.0),
            position_y=gn.position.get("y", 0.0),
        )
        db.add(db_node)
        db.flush()
        frontend_id_to_uuid[gn.id] = db_node.id
        logger.info("Node synced to workflow_nodes: %s (%s)", gn.label, gn.type)

    LABEL_TO_MATCH = {
        "Yes": "true",
        "No": "false",
        "true": "true",
        "false": "false",
    }

    for ge in definition.edges:
        source_uuid = frontend_id_to_uuid.get(ge.source)
        target_uuid = frontend_id_to_uuid.get(ge.target)
        if source_uuid is None or target_uuid is None:
            logger.warning("Edge %s skipped: missing node mapping", ge.id)
            continue
        condition_config = None
        if ge.label:
            match_value = LABEL_TO_MATCH.get(ge.label, ge.label)
            condition_config = {"match": match_value, "label": ge.label}
        db_edge = WorkflowEdge(
            workflow_id=workflow.id,
            from_node_id=source_uuid,
            to_node_id=target_uuid,
            condition_config=condition_config,
        )
        db.add(db_edge)
        db.flush()
        logger.info("Edge synced to workflow_edges: %s -> %s", ge.source, ge.target)


def _workflow_to_response(workflow: Workflow) -> WorkflowResponse:
    return WorkflowResponse(
        id=workflow.id,
        organization_id=workflow.organization_id,
        name=workflow.name,
        description=workflow.description,
        trigger_type=workflow.trigger_type.value if hasattr(workflow.trigger_type, 'value') else workflow.trigger_type,
        is_active=workflow.is_active,
        workflow_definition=workflow.workflow_definition,
        created_at=workflow.created_at.isoformat(),
        updated_at=workflow.updated_at.isoformat(),
    )


@router.get("")
def list_workflows(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> WorkflowListResponse:
    query = (
        db.query(Workflow)
        .filter(Workflow.organization_id == org.id)
    )

    total = query.count()
    workflows = (
        query.order_by(Workflow.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return WorkflowListResponse(
        workflows=[_workflow_to_response(w) for w in workflows],
        total=total,
    )


@router.get("/{workflow_id}")
def get_workflow(
    workflow_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.organization_id == org.id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return _workflow_to_response(workflow)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(
    body: WorkflowCreate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    definition = body.workflow_definition
    if definition:
        dag_errors = validate_dag(definition)
        if dag_errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Invalid workflow graph", "errors": dag_errors},
            )

    workflow = Workflow(
        organization_id=org.id,
        name=body.name,
        description=body.description,
        trigger_type=body.trigger_type,
        workflow_definition=_serialize_definition(definition),
    )
    db.add(workflow)
    db.flush()

    if definition:
        _sync_nodes_and_edges(db, workflow, definition)

    db.commit()
    db.refresh(workflow)
    logger.info("Workflow created successfully: %s", workflow.id)
    return _workflow_to_response(workflow)


@router.put("/{workflow_id}")
def update_workflow(
    workflow_id: UUID,
    body: WorkflowUpdate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.organization_id == org.id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    if body.workflow_definition is not None:
        dag_errors = validate_dag(body.workflow_definition)
        if dag_errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Invalid workflow graph", "errors": dag_errors},
            )

    update_data = body.model_dump(exclude_unset=True, exclude={"workflow_definition"})
    for key, value in update_data.items():
        setattr(workflow, key, value)

    if body.workflow_definition is not None:
        workflow.workflow_definition = _serialize_definition(body.workflow_definition)
        _sync_nodes_and_edges(db, workflow, body.workflow_definition)

    db.commit()
    db.refresh(workflow)
    logger.info("Workflow saved successfully: %s", workflow.id)
    return _workflow_to_response(workflow)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_workflow(
    workflow_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> None:
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.organization_id == org.id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    db.delete(workflow)
    db.commit()
