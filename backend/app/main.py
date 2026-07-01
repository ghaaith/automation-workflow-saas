import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.database import engine, Base
import app.engine  # noqa: F401 — triggers NodeRegistry.register decorators
from app.models import User, Organization, OrganizationMember, Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, NodeExecution, WorkflowTemplate, WorkflowTriggerLog, Integration, Document, Job  # noqa: F401
from app.engine.router import router as engine_router
from app.engine.triggers.router import router as triggers_router
from app.routers import auth, organizations, users
from app.routers.templates import router as templates_router
from app.routers.workflows import router as workflows_router
from app.routers.integrations import router as integrations_router
from app.routers.external_webhooks import router as external_webhooks_router
from app.routers.billing import router as billing_router, admin_router
from app.routers.documents import router as documents_router
from app.routers.jobs import router as jobs_router
from app.services.seed_plans import seed_plans

app = FastAPI(
    title="AI Workflow SaaS",
    description="Multi-Tenant AI Workflow SaaS Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(organizations.router)
app.include_router(engine_router)
app.include_router(triggers_router)
app.include_router(templates_router)
app.include_router(workflows_router)
app.include_router(integrations_router)
app.include_router(external_webhooks_router)
app.include_router(billing_router)
app.include_router(admin_router)
app.include_router(documents_router)
app.include_router(jobs_router)


@app.on_event("startup")
def on_startup():
    _wait_for_db(max_retries=15, delay=2)
    Base.metadata.create_all(bind=engine)

    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        seed_plans(db)
    finally:
        db.close()


def _wait_for_db(max_retries: int = 15, delay: int = 2) -> None:
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError:
            if attempt == max_retries:
                raise
            time.sleep(delay)
