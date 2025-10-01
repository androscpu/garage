from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db


router = APIRouter()


@router.get("/health")
def pms_health():
    return {"pms": "ok"}


@router.get("/rooms")
def list_rooms(db: Session = Depends(get_db)):
    # Placeholder
    return {"rooms": []}


@router.get("/reservations")
def list_reservations(db: Session = Depends(get_db)):
    # Placeholder
    return {"reservations": []}

