from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timedelta
from typing import List, Optional
import secrets
import string

from backend.models import Booking, Room, RoomStatus, BookingStatus
from backend.schemas import BookingCreate, BookingUpdate


class BookingService:
    """Service for handling booking operations"""
    
    @staticmethod
    def generate_booking_reference() -> str:
        """Generate a unique booking reference"""
        letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(3))
        numbers = ''.join(secrets.choice(string.digits) for _ in range(6))
        return f"{letters}{numbers}"
    
    async def check_room_availability(
        self,
        db: AsyncSession,
        room_id: int,
        check_in: datetime,
        check_out: datetime,
        exclude_booking_id: Optional[int] = None
    ) -> bool:
        """Check if a room is available for the given dates"""
        query = select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.PENDING
                ]),
                or_(
                    # New booking overlaps with existing booking
                    and_(
                        Booking.check_in_date < check_out,
                        Booking.check_out_date > check_in
                    )
                )
            )
        )
        
        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)
        
        result = await db.execute(query)
        conflicting_bookings = result.scalars().all()
        
        return len(conflicting_bookings) == 0
    
    async def get_available_rooms(
        self,
        db: AsyncSession,
        check_in: datetime,
        check_out: datetime,
        hotel_id: Optional[int] = None,
        room_type: Optional[str] = None,
        min_occupancy: Optional[int] = None
    ) -> List[Room]:
        """Get all available rooms for the given criteria"""
        # Get all rooms matching criteria
        query = select(Room).where(
            and_(
                Room.is_active == True,
                Room.status != RoomStatus.OUT_OF_ORDER
            )
        )
        
        if hotel_id:
            query = query.where(Room.hotel_id == hotel_id)
        
        if room_type:
            query = query.where(Room.room_type == room_type)
        
        if min_occupancy:
            query = query.where(Room.max_occupancy >= min_occupancy)
        
        result = await db.execute(query)
        all_rooms = result.scalars().all()
        
        # Filter out rooms with conflicting bookings
        available_rooms = []
        for room in all_rooms:
            is_available = await self.check_room_availability(
                db, room.id, check_in, check_out
            )
            if is_available:
                available_rooms.append(room)
        
        return available_rooms
    
    async def calculate_booking_amount(
        self,
        db: AsyncSession,
        room_id: int,
        check_in: datetime,
        check_out: datetime
    ) -> float:
        """Calculate total amount for a booking"""
        result = await db.execute(select(Room).where(Room.id == room_id))
        room = result.scalar_one_or_none()
        
        if not room:
            raise ValueError("Room not found")
        
        # Calculate number of nights
        nights = (check_out - check_in).days
        
        if nights <= 0:
            raise ValueError("Check-out must be after check-in")
        
        # Basic calculation - can be extended with seasonal pricing, discounts, etc.
        total_amount = room.base_price * nights
        
        return total_amount
    
    async def create_booking(
        self,
        db: AsyncSession,
        booking_data: BookingCreate
    ) -> Booking:
        """Create a new booking"""
        # Check availability
        is_available = await self.check_room_availability(
            db,
            booking_data.room_id,
            booking_data.check_in_date,
            booking_data.check_out_date
        )
        
        if not is_available:
            raise ValueError("Room is not available for the selected dates")
        
        # Calculate total amount
        total_amount = await self.calculate_booking_amount(
            db,
            booking_data.room_id,
            booking_data.check_in_date,
            booking_data.check_out_date
        )
        
        # Generate booking reference
        booking_reference = self.generate_booking_reference()
        
        # Create booking
        booking = Booking(
            **booking_data.model_dump(),
            booking_reference=booking_reference,
            total_amount=total_amount,
            status=BookingStatus.PENDING
        )
        
        db.add(booking)
        await db.commit()
        await db.refresh(booking)
        
        return booking
    
    async def confirm_booking(
        self,
        db: AsyncSession,
        booking_id: int
    ) -> Booking:
        """Confirm a pending booking"""
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status != BookingStatus.PENDING:
            raise ValueError("Only pending bookings can be confirmed")
        
        booking.status = BookingStatus.CONFIRMED
        await db.commit()
        await db.refresh(booking)
        
        return booking
    
    async def check_in(
        self,
        db: AsyncSession,
        booking_id: int
    ) -> Booking:
        """Check in a guest"""
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status != BookingStatus.CONFIRMED:
            raise ValueError("Only confirmed bookings can be checked in")
        
        booking.status = BookingStatus.CHECKED_IN
        booking.actual_check_in = datetime.utcnow()
        
        # Update room status
        result = await db.execute(select(Room).where(Room.id == booking.room_id))
        room = result.scalar_one_or_none()
        if room:
            room.status = RoomStatus.OCCUPIED
        
        await db.commit()
        await db.refresh(booking)
        
        return booking
    
    async def check_out(
        self,
        db: AsyncSession,
        booking_id: int
    ) -> Booking:
        """Check out a guest"""
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status != BookingStatus.CHECKED_IN:
            raise ValueError("Only checked-in bookings can be checked out")
        
        booking.status = BookingStatus.CHECKED_OUT
        booking.actual_check_out = datetime.utcnow()
        
        # Update room status to cleaning
        result = await db.execute(select(Room).where(Room.id == booking.room_id))
        room = result.scalar_one_or_none()
        if room:
            room.status = RoomStatus.CLEANING
        
        await db.commit()
        await db.refresh(booking)
        
        return booking
    
    async def cancel_booking(
        self,
        db: AsyncSession,
        booking_id: int
    ) -> Booking:
        """Cancel a booking"""
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED]:
            raise ValueError("Cannot cancel this booking")
        
        booking.status = BookingStatus.CANCELLED
        
        await db.commit()
        await db.refresh(booking)
        
        return booking


# Global instance
booking_service = BookingService()
