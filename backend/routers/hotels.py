from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from backend.database import get_db
from backend.models import Hotel, User, UserRole
from backend.schemas import HotelCreate, HotelUpdate, HotelResponse
from backend.auth import get_current_active_user, require_role

router = APIRouter(prefix="/api/hotels", tags=["Hotels"])


@router.post("", response_model=HotelResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def create_hotel(
    hotel_data: HotelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new hotel"""
    hotel = Hotel(**hotel_data.model_dump())
    db.add(hotel)
    await db.commit()
    await db.refresh(hotel)
    return hotel


@router.get("", response_model=List[HotelResponse])
async def get_hotels(db: AsyncSession = Depends(get_db)):
    """Get all hotels"""
    result = await db.execute(select(Hotel))
    hotels = result.scalars().all()
    return list(hotels)


@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel(hotel_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific hotel"""
    result = await db.execute(select(Hotel).where(Hotel.id == hotel_id))
    hotel = result.scalar_one_or_none()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return hotel


@router.put("/{hotel_id}", response_model=HotelResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def update_hotel(
    hotel_id: int,
    hotel_data: HotelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a hotel"""
    result = await db.execute(select(Hotel).where(Hotel.id == hotel_id))
    hotel = result.scalar_one_or_none()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Update fields
    update_data = hotel_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hotel, field, value)
    
    await db.commit()
    await db.refresh(hotel)
    
    return hotel


@router.delete("/{hotel_id}", dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_hotel(
    hotel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a hotel"""
    result = await db.execute(select(Hotel).where(Hotel.id == hotel_id))
    hotel = result.scalar_one_or_none()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    await db.delete(hotel)
    await db.commit()
    
    return {"message": "Hotel deleted successfully"}
