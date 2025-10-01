from fastapi import APIRouter, Request


router = APIRouter()


@router.get("/health")
def telephony_health():
    return {"telephony": "ok", "system": "3CX"}


@router.post("/webhook")
async def three_cx_webhook(request: Request):
    payload = await request.json()
    # Placeholder: validate and process 3CX events
    return {"received": True, "type": payload.get("event", "unknown")}


@router.post("/click-to-call")
async def click_to_call(destination: str):
    # Placeholder: initiate call via 3CX API
    return {"initiated": True, "to": destination}

