from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os

from backend.database import get_db
from backend.models import Payment, Booking, User, UserRole, PaymentStatus
from backend.schemas import PaymentCreate, PaymentResponse
from backend.auth import get_current_active_user, require_role
from backend.services.payment_service import payment_service

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a payment for a booking"""
    # Verify booking exists
    result = await db.execute(select(Booking).where(Booking.id == payment_data.booking_id))
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    if current_user.role == UserRole.GUEST and booking.guest_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to make payment for this booking")
    
    # Create payment intent with Stripe
    result = await payment_service.create_payment_intent(
        amount=payment_data.amount,
        currency=payment_data.currency,
        customer_email=current_user.email,
        metadata={
            "booking_id": str(payment_data.booking_id),
            "user_id": str(current_user.id)
        }
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Create payment record
    payment = Payment(
        booking_id=payment_data.booking_id,
        user_id=current_user.id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_method=payment_data.payment_method,
        description=payment_data.description,
        status=PaymentStatus.PENDING,
        transaction_id=result.get("payment_intent_id"),
        metadata={"client_secret": result.get("client_secret")}
    )
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    return payment


@router.get("", response_model=List[PaymentResponse])
async def get_payments(
    booking_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get payments"""
    query = select(Payment)
    
    # Regular users can only see their own payments
    if current_user.role == UserRole.GUEST:
        query = query.where(Payment.user_id == current_user.id)
    
    if booking_id:
        query = query.where(Payment.booking_id == booking_id)
    
    query = query.order_by(Payment.created_at.desc())
    
    result = await db.execute(query)
    payments = result.scalars().all()
    return list(payments)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific payment"""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check permissions
    if current_user.role == UserRole.GUEST and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    return payment


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Confirm a payment"""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check permissions
    if current_user.role == UserRole.GUEST and payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to confirm this payment")
    
    # Verify payment with Stripe
    if payment.transaction_id:
        stripe_result = await payment_service.confirm_payment(payment.transaction_id)
        
        if "error" in stripe_result:
            raise HTTPException(status_code=400, detail=stripe_result["error"])
        
        if stripe_result.get("status") == "succeeded":
            payment.status = PaymentStatus.COMPLETED
            
            # Update booking paid amount
            result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
            booking = result.scalar_one_or_none()
            if booking:
                booking.paid_amount += payment.amount
            
            await db.commit()
            await db.refresh(payment)
    
    return payment


@router.post("/{payment_id}/refund", response_model=PaymentResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def refund_payment(
    payment_id: int,
    amount: float = None,
    reason: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Refund a payment"""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only refund completed payments")
    
    # Process refund with Stripe
    if payment.transaction_id:
        stripe_result = await payment_service.create_refund(
            payment.transaction_id,
            amount=amount,
            reason=reason
        )
        
        if "error" in stripe_result:
            raise HTTPException(status_code=400, detail=stripe_result["error"])
        
        payment.status = PaymentStatus.REFUNDED
        
        # Update booking paid amount
        result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
        booking = result.scalar_one_or_none()
        if booking:
            refund_amount = amount if amount else payment.amount
            booking.paid_amount -= refund_amount
        
        await db.commit()
        await db.refresh(payment)
    
    return payment


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    import stripe
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        
        # Update payment status
        result = await db.execute(
            select(Payment).where(Payment.transaction_id == payment_intent["id"])
        )
        payment = result.scalar_one_or_none()
        
        if payment:
            payment.status = PaymentStatus.COMPLETED
            payment.stripe_charge_id = payment_intent.get("latest_charge")
            
            # Update booking paid amount
            result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
            booking = result.scalar_one_or_none()
            if booking:
                booking.paid_amount += payment.amount
            
            await db.commit()
    
    return {"status": "success"}
