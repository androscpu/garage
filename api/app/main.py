from fastapi import FastAPI
from .routers import pms, housekeeping, booking, payments, telephony


app = FastAPI(title="Cloud Hotel System", version="0.1.0")


@app.get("/")
def root():
    return {"status": "ok", "service": "cloud-hotel"}


app.include_router(pms.router, prefix="/pms", tags=["pms"])
app.include_router(housekeeping.router, prefix="/housekeeping", tags=["housekeeping"])
app.include_router(booking.router, prefix="/booking", tags=["booking"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(telephony.router, prefix="/telephony", tags=["telephony"])

