from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from backend.database import get_db
from backend.models import PhoneCall, User, UserRole, Room, Booking
from backend.schemas import PhoneCallCreate, PhoneCallResponse
from backend.auth import get_current_active_user, require_role
from backend.services.threecx_service import threecx_service

router = APIRouter(prefix="/api/3cx", tags=["3CX Phone System"])


@router.post("/calls/make", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def make_call(
    from_extension: str = Body(...),
    to_number: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Initiate a call through 3CX"""
    result = await threecx_service.make_call(from_extension, to_number)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/calls/transfer", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def transfer_call(
    call_id: str = Body(...),
    to_extension: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Transfer an active call to another extension"""
    result = await threecx_service.transfer_call(call_id, to_extension)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/calls/active", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def get_active_calls(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all active calls in the system"""
    calls = await threecx_service.get_active_calls()
    return {"calls": calls}


@router.get("/calls/{call_id}", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def get_call_status(
    call_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get status of a specific call"""
    result = await threecx_service.get_call_status(call_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.get("/calls/history", response_model=List[PhoneCallResponse])
async def get_call_history(
    extension: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get call history from the database"""
    query = select(PhoneCall)
    
    if extension:
        query = query.where(
            (PhoneCall.from_extension == extension) | 
            (PhoneCall.to_extension == extension)
        )
    
    query = query.order_by(PhoneCall.created_at.desc()).limit(100)
    
    result = await db.execute(query)
    calls = result.scalars().all()
    return list(calls)


@router.post("/calls/log", response_model=PhoneCallResponse)
async def log_call(
    call_data: PhoneCallCreate,
    db: AsyncSession = Depends(get_db)
):
    """Log a call (webhook from 3CX)"""
    # Try to associate call with room/booking
    room_id = None
    booking_id = None
    
    if call_data.to_extension:
        # Try to find room by extension
        result = await db.execute(
            select(Room).where(Room.room_number.like(f"%{call_data.to_extension[-3:]}%"))
        )
        room = result.scalar_one_or_none()
        
        if room:
            room_id = room.id
            
            # Try to find active booking for this room
            result = await db.execute(
                select(Booking).where(
                    Booking.room_id == room_id,
                    Booking.status == "checked_in"
                )
            )
            booking = result.scalar_one_or_none()
            if booking:
                booking_id = booking.id
    
    # Create phone call record
    call = PhoneCall(
        **call_data.model_dump(),
        room_id=room_id,
        booking_id=booking_id
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    return call


@router.post("/extensions/create", dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_extension(
    extension_number: str = Body(...),
    name: str = Body(...),
    email: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new extension in 3CX"""
    result = await threecx_service.create_extension(extension_number, name, email)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/extensions/{extension}", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def get_extension_info(
    extension: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get information about an extension"""
    result = await threecx_service.get_extension_info(extension)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/presence", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def set_presence(
    extension: str = Body(...),
    status: str = Body(...),  # Available, Away, DND, etc.
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Set presence status for an extension"""
    result = await threecx_service.set_presence(extension, status)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/rooms/{room_number}/extension")
async def get_room_extension(
    room_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the phone extension for a room"""
    extension = await threecx_service.get_room_extension(room_number)
    return {"room_number": room_number, "extension": extension}


@router.post("/calls/park", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def park_call(
    call_id: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Park a call"""
    result = await threecx_service.park_call(call_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/sms/send", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def send_sms(
    to_number: str = Body(...),
    message: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send SMS through 3CX"""
    result = await threecx_service.send_sms(to_number, message)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
