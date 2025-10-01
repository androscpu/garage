from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from backend.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    RECEPTIONIST = "receptionist"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    GUEST = "guest"

class RoomStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    OUT_OF_ORDER = "out_of_order"

class RoomType(str, enum.Enum):
    SINGLE = "single"
    DOUBLE = "double"
    SUITE = "suite"
    DELUXE = "deluxe"
    PRESIDENTIAL = "presidential"

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class HousekeepingTaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"

class HousekeepingTaskType(str, enum.Enum):
    CLEANING = "cleaning"
    DEEP_CLEANING = "deep_cleaning"
    TURNDOWN = "turndown"
    LAUNDRY = "laundry"
    MAINTENANCE = "maintenance"
    INSPECTION = "inspection"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    role = Column(Enum(UserRole), default=UserRole.GUEST)
    is_active = Column(Boolean, default=True)
    extension_number = Column(String, nullable=True)  # 3CX extension
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bookings = relationship("Booking", back_populates="guest", foreign_keys="Booking.guest_id")
    housekeeping_tasks = relationship("HousekeepingTask", back_populates="assigned_to_user")
    payments = relationship("Payment", back_populates="user")


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    city = Column(String)
    country = Column(String)
    phone = Column(String)
    email = Column(String)
    description = Column(Text)
    star_rating = Column(Integer)
    amenities = Column(JSON)  # List of amenities
    policies = Column(JSON)  # Check-in/out times, cancellation policy, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    rooms = relationship("Room", back_populates="hotel")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"))
    room_number = Column(String, nullable=False)
    room_type = Column(Enum(RoomType), nullable=False)
    floor = Column(Integer)
    status = Column(Enum(RoomStatus), default=RoomStatus.AVAILABLE)
    base_price = Column(Float, nullable=False)
    max_occupancy = Column(Integer, default=2)
    bed_type = Column(String)
    size_sqm = Column(Float)
    amenities = Column(JSON)  # Room-specific amenities
    description = Column(Text)
    images = Column(JSON)  # List of image URLs
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")
    housekeeping_tasks = relationship("HousekeepingTask", back_populates="room")


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String)
    city = Column(String)
    country = Column(String)
    passport_number = Column(String)
    id_number = Column(String)
    date_of_birth = Column(DateTime)
    nationality = Column(String)
    preferences = Column(JSON)  # Guest preferences
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bookings = relationship("Booking", back_populates="main_guest")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String, unique=True, index=True, nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id"))
    main_guest_id = Column(Integer, ForeignKey("guests.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    check_in_date = Column(DateTime, nullable=False)
    check_out_date = Column(DateTime, nullable=False)
    actual_check_in = Column(DateTime, nullable=True)
    actual_check_out = Column(DateTime, nullable=True)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    number_of_guests = Column(Integer, default=1)
    number_of_adults = Column(Integer, default=1)
    number_of_children = Column(Integer, default=0)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    special_requests = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    guest = relationship("User", back_populates="bookings", foreign_keys=[guest_id])
    main_guest = relationship("Guest", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    payment_method = Column(String)  # card, cash, bank_transfer
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String)  # Stripe payment intent ID
    stripe_charge_id = Column(String)
    description = Column(Text)
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="payments")
    user = relationship("User", back_populates="payments")


class HousekeepingTask(Base):
    __tablename__ = "housekeeping_tasks"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    task_type = Column(Enum(HousekeepingTaskType), nullable=False)
    status = Column(Enum(HousekeepingTaskStatus), default=HousekeepingTaskStatus.PENDING)
    priority = Column(Integer, default=0)  # 0=normal, 1=high, 2=urgent
    scheduled_time = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text)
    notes = Column(Text)
    checklist = Column(JSON)  # Task checklist items
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    room = relationship("Room", back_populates="housekeeping_tasks")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to], back_populates="housekeeping_tasks")


class PhoneCall(Base):
    __tablename__ = "phone_calls"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String, unique=True)  # 3CX call ID
    from_number = Column(String)
    to_number = Column(String)
    from_extension = Column(String)
    to_extension = Column(String)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    call_type = Column(String)  # internal, external, room_to_reception, etc.
    duration = Column(Integer)  # in seconds
    status = Column(String)  # answered, missed, busy
    recording_url = Column(String, nullable=True)
    notes = Column(Text)
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    entity_type = Column(String)  # booking, room, payment, etc.
    entity_id = Column(Integer)
    changes = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
