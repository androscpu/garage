import os
from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def payments_health():
    return {"payments": "ok", "provider": "stripe", "configured": bool(os.getenv("STRIPE_API_KEY"))}


@router.post("/intent")
def create_payment_intent():
    # Placeholder. Later: Stripe PaymentIntent
    return {"client_secret": "stub"}

