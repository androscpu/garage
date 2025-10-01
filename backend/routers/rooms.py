from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Room, User, UserRole
from backend.schemas import RoomCreate, RoomUpdate, RoomResponse, RoomAvailability
from backend.auth import get_current_active_user, require_role
from backend.services.booking_service import booking_service

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


@router.post("", response_model=RoomResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new room"""
    room = Room(**room_data.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("", response_model=List[RoomResponse])
async def get_rooms(
    hotel_id: Optional[int] = None,
    room_type: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get all rooms with optional filters"""
    query = select(Room).where(Room.is_active == is_active)
    
    if hotel_id:
        query = query.where(Room.hotel_id == hotel_id)
    
    if room_type:
        query = query.where(Room.room_type == room_type)
    
    result = await db.execute(query)
    rooms = result.scalars().all()
    return list(rooms)


@router.get("/available", response_model=List[RoomResponse])
async def get_available_rooms(
    check_in: datetime = Query(..., description="Check-in date"),
    check_out: datetime = Query(..., description="Check-out date"),
    hotel_id: Optional[int] = None,
    room_type: Optional[str] = None,
    min_occupancy: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get available rooms for specific dates"""
    available_rooms = await booking_service.get_available_rooms(
        db=db,
        check_in=check_in,
        check_out=check_out,
        hotel_id=hotel_id,
        room_type=room_type,
        min_occupancy=min_occupancy
    )
    return available_rooms


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific room"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return room


@router.put("/{room_id}", response_model=RoomResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def update_room(
    room_id: int,
    room_data: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a room"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Update fields
    update_data = room_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)
    
    await db.commit()
    await db.refresh(room)
    
    return room


@router.delete("/{room_id}", dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a room (soft delete by setting is_active to False)"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room.is_active = False
    await db.commit()
    
    return {"message": "Room deleted successfully"}
