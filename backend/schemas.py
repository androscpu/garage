from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.models import UserRole, RoomStatus, RoomType, BookingStatus, PaymentStatus, HousekeepingTaskStatus, HousekeepingTaskType

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.GUEST

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    extension_number: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    extension_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Hotel Schemas
class HotelBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    amenities: Optional[List[str]] = []
    policies: Optional[Dict[str, Any]] = {}

class HotelCreate(HotelBase):
    pass

class HotelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    amenities: Optional[List[str]] = None
    policies: Optional[Dict[str, Any]] = None

class HotelResponse(HotelBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    room_type: RoomType
    floor: Optional[int] = None
    base_price: float
    max_occupancy: int = 2
    bed_type: Optional[str] = None
    size_sqm: Optional[float] = None
    amenities: Optional[List[str]] = []
    description: Optional[str] = None
    images: Optional[List[str]] = []

class RoomCreate(RoomBase):
    hotel_id: int

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[RoomType] = None
    floor: Optional[int] = None
    status: Optional[RoomStatus] = None
    base_price: Optional[float] = None
    max_occupancy: Optional[int] = None
    bed_type: Optional[str] = None
    size_sqm: Optional[float] = None
    amenities: Optional[List[str]] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None

class RoomResponse(RoomBase):
    id: int
    hotel_id: int
    status: RoomStatus
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Guest Schemas
class GuestBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    passport_number: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    nationality: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None

class GuestCreate(GuestBase):
    user_id: Optional[int] = None

class GuestUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    passport_number: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    nationality: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class GuestResponse(GuestBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Booking Schemas
class BookingBase(BaseModel):
    room_id: int
    check_in_date: datetime
    check_out_date: datetime
    number_of_guests: int = 1
    number_of_adults: int = 1
    number_of_children: int = 0
    special_requests: Optional[str] = None
    notes: Optional[str] = None

    @validator('check_out_date')
    def check_dates(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v

class BookingCreate(BookingBase):
    guest_id: int
    main_guest_id: int

class BookingUpdate(BaseModel):
    room_id: Optional[int] = None
    check_in_date: Optional[datetime] = None
    check_out_date: Optional[datetime] = None
    status: Optional[BookingStatus] = None
    number_of_guests: Optional[int] = None
    number_of_adults: Optional[int] = None
    number_of_children: Optional[int] = None
    special_requests: Optional[str] = None
    notes: Optional[str] = None

class BookingResponse(BookingBase):
    id: int
    booking_reference: str
    guest_id: int
    main_guest_id: int
    status: BookingStatus
    total_amount: float
    paid_amount: float
    actual_check_in: Optional[datetime] = None
    actual_check_out: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    amount: float
    currency: str = "USD"
    payment_method: str
    description: Optional[str] = None

class PaymentCreate(PaymentBase):
    booking_id: int
    user_id: int

class PaymentResponse(PaymentBase):
    id: int
    booking_id: int
    user_id: int
    status: PaymentStatus
    transaction_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime

    class Config:
        from_attributes = True

# Housekeeping Schemas
class HousekeepingTaskBase(BaseModel):
    room_id: int
    task_type: HousekeepingTaskType
    priority: int = Field(default=0, ge=0, le=2)
    scheduled_time: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[List[Dict[str, Any]]] = []

class HousekeepingTaskCreate(HousekeepingTaskBase):
    assigned_to: Optional[int] = None

class HousekeepingTaskUpdate(BaseModel):
    assigned_to: Optional[int] = None
    status: Optional[HousekeepingTaskStatus] = None
    priority: Optional[int] = Field(None, ge=0, le=2)
    scheduled_time: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[List[Dict[str, Any]]] = None

class HousekeepingTaskResponse(HousekeepingTaskBase):
    id: int
    assigned_to: Optional[int] = None
    status: HousekeepingTaskStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# 3CX Phone Integration Schemas
class PhoneCallBase(BaseModel):
    from_number: str
    to_number: str
    from_extension: Optional[str] = None
    to_extension: Optional[str] = None
    call_type: str
    status: str

class PhoneCallCreate(PhoneCallBase):
    call_id: str
    room_id: Optional[int] = None
    booking_id: Optional[int] = None
    duration: Optional[int] = 0
    recording_url: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class PhoneCallResponse(PhoneCallBase):
    id: int
    call_id: str
    room_id: Optional[int] = None
    booking_id: Optional[int] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard & Analytics Schemas
class DashboardStats(BaseModel):
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    cleaning_rooms: int
    total_bookings_today: int
    total_revenue_today: float
    total_revenue_month: float
    occupancy_rate: float
    pending_housekeeping_tasks: int
    pending_payments: int

class RoomAvailability(BaseModel):
    room_id: int
    room_number: str
    room_type: RoomType
    is_available: bool
    current_booking_id: Optional[int] = None
    next_available_date: Optional[datetime] = None
