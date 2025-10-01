from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models import (
    Room, Booking, Payment, HousekeepingTask, 
    RoomStatus, BookingStatus, PaymentStatus, HousekeepingTaskStatus,
    User, UserRole
)
from backend.schemas import DashboardStats
from backend.auth import get_current_active_user, require_role

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard statistics"""
    
    # Total rooms
    result = await db.execute(select(func.count(Room.id)).where(Room.is_active == True))
    total_rooms = result.scalar() or 0
    
    # Available rooms
    result = await db.execute(
        select(func.count(Room.id)).where(
            and_(Room.is_active == True, Room.status == RoomStatus.AVAILABLE)
        )
    )
    available_rooms = result.scalar() or 0
    
    # Occupied rooms
    result = await db.execute(
        select(func.count(Room.id)).where(
            and_(Room.is_active == True, Room.status == RoomStatus.OCCUPIED)
        )
    )
    occupied_rooms = result.scalar() or 0
    
    # Cleaning rooms
    result = await db.execute(
        select(func.count(Room.id)).where(
            and_(Room.is_active == True, Room.status == RoomStatus.CLEANING)
        )
    )
    cleaning_rooms = result.scalar() or 0
    
    # Today's bookings
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    result = await db.execute(
        select(func.count(Booking.id)).where(
            and_(
                Booking.created_at >= today_start,
                Booking.created_at < today_end
            )
        )
    )
    total_bookings_today = result.scalar() or 0
    
    # Today's revenue
    result = await db.execute(
        select(func.sum(Payment.amount)).where(
            and_(
                Payment.created_at >= today_start,
                Payment.created_at < today_end,
                Payment.status == PaymentStatus.COMPLETED
            )
        )
    )
    total_revenue_today = result.scalar() or 0.0
    
    # This month's revenue
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    result = await db.execute(
        select(func.sum(Payment.amount)).where(
            and_(
                Payment.created_at >= month_start,
                Payment.status == PaymentStatus.COMPLETED
            )
        )
    )
    total_revenue_month = result.scalar() or 0.0
    
    # Occupancy rate
    occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0
    
    # Pending housekeeping tasks
    result = await db.execute(
        select(func.count(HousekeepingTask.id)).where(
            HousekeepingTask.status.in_([
                HousekeepingTaskStatus.PENDING,
                HousekeepingTaskStatus.IN_PROGRESS
            ])
        )
    )
    pending_housekeeping_tasks = result.scalar() or 0
    
    # Pending payments
    result = await db.execute(
        select(func.count(Payment.id)).where(
            Payment.status == PaymentStatus.PENDING
        )
    )
    pending_payments = result.scalar() or 0
    
    return DashboardStats(
        total_rooms=total_rooms,
        available_rooms=available_rooms,
        occupied_rooms=occupied_rooms,
        cleaning_rooms=cleaning_rooms,
        total_bookings_today=total_bookings_today,
        total_revenue_today=float(total_revenue_today),
        total_revenue_month=float(total_revenue_month),
        occupancy_rate=round(occupancy_rate, 2),
        pending_housekeeping_tasks=pending_housekeeping_tasks,
        pending_payments=pending_payments
    )


@router.get("/recent-bookings", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def get_recent_bookings(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent bookings"""
    result = await db.execute(
        select(Booking).order_by(Booking.created_at.desc()).limit(limit)
    )
    bookings = result.scalars().all()
    return list(bookings)


@router.get("/upcoming-checkins", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def get_upcoming_checkins(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming check-ins for today"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.check_in_date >= today_start,
                Booking.check_in_date < today_end,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).order_by(Booking.check_in_date)
    )
    bookings = result.scalars().all()
    return list(bookings)


@router.get("/upcoming-checkouts", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST]))])
async def get_upcoming_checkouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming check-outs for today"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.check_out_date >= today_start,
                Booking.check_out_date < today_end,
                Booking.status == BookingStatus.CHECKED_IN
            )
        ).order_by(Booking.check_out_date)
    )
    bookings = result.scalars().all()
    return list(bookings)


@router.get("/revenue-chart", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def get_revenue_chart(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get revenue data for chart (last N days)"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.date(Payment.created_at).label('date'),
            func.sum(Payment.amount).label('revenue')
        ).where(
            and_(
                Payment.created_at >= start_date,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at))
    )
    
    data = result.all()
    
    return [
        {"date": str(row.date), "revenue": float(row.revenue)}
        for row in data
    ]


@router.get("/occupancy-chart", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def get_occupancy_chart(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get occupancy data for chart (last N days)"""
    # Get total rooms
    result = await db.execute(select(func.count(Room.id)).where(Room.is_active == True))
    total_rooms = result.scalar() or 1
    
    occupancy_data = []
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i - 1)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_start + timedelta(days=1)
        
        # Count occupied rooms for this date
        result = await db.execute(
            select(func.count(Booking.id)).where(
                and_(
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
                    Booking.check_in_date <= date_end,
                    Booking.check_out_date >= date_start
                )
            )
        )
        occupied = result.scalar() or 0
        
        occupancy_rate = (occupied / total_rooms * 100) if total_rooms > 0 else 0
        
        occupancy_data.append({
            "date": date_start.strftime("%Y-%m-%d"),
            "occupancy_rate": round(occupancy_rate, 2),
            "occupied_rooms": occupied,
            "total_rooms": total_rooms
        })
    
    return occupancy_data
