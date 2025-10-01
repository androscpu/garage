from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def housekeeping_health():
    return {"housekeeping": "ok"}


@router.get("/tasks")
def list_tasks():
    return {"tasks": []}

