from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def booking_health():
    return {"booking": "ok"}


@router.get("/availability")
def search_availability():
    # Placeholder
    return {"availability": []}

