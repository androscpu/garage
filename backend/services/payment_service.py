import stripe
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


class PaymentService:
    """Service for handling payments through Stripe"""
    
    def __init__(self):
        self.stripe = stripe
    
    async def create_payment_intent(
        self,
        amount: float,
        currency: str = "usd",
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe payment intent"""
        try:
            # Convert amount to cents
            amount_cents = int(amount * 100)
            
            intent_data = {
                "amount": amount_cents,
                "currency": currency,
                "automatic_payment_methods": {"enabled": True},
            }
            
            if customer_email:
                intent_data["receipt_email"] = customer_email
            
            if metadata:
                intent_data["metadata"] = metadata
            
            intent = self.stripe.PaymentIntent.create(**intent_data)
            
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "amount": amount,
                "currency": currency,
                "status": intent.status
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            return {"error": str(e)}
    
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm a payment intent"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
                "amount": intent.amount / 100,
                "currency": intent.currency
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return {"error": str(e)}
    
    async def cancel_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Cancel a payment intent"""
        try:
            intent = self.stripe.PaymentIntent.cancel(payment_intent_id)
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
                "message": "Payment cancelled successfully"
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error cancelling payment: {str(e)}")
            return {"error": str(e)}
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a refund for a payment"""
        try:
            refund_data = {"payment_intent": payment_intent_id}
            
            if amount:
                refund_data["amount"] = int(amount * 100)
            
            if reason:
                refund_data["reason"] = reason
            
            refund = self.stripe.Refund.create(**refund_data)
            
            return {
                "refund_id": refund.id,
                "payment_intent_id": payment_intent_id,
                "amount": refund.amount / 100,
                "currency": refund.currency,
                "status": refund.status
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            return {"error": str(e)}
    
    async def create_customer(
        self,
        email: str,
        name: str,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe customer"""
        try:
            customer_data = {
                "email": email,
                "name": name,
            }
            
            if phone:
                customer_data["phone"] = phone
            
            if metadata:
                customer_data["metadata"] = metadata
            
            customer = self.stripe.Customer.create(**customer_data)
            
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            return {"error": str(e)}
    
    async def get_payment_methods(self, customer_id: str) -> list:
        """Get all payment methods for a customer"""
        try:
            payment_methods = self.stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )
            return payment_methods.data
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error getting payment methods: {str(e)}")
            return []
    
    async def create_checkout_session(
        self,
        amount: float,
        currency: str,
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe checkout session"""
        try:
            amount_cents = int(amount * 100)
            
            session_data = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price_data": {
                        "currency": currency,
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": "Hotel Booking",
                        },
                    },
                    "quantity": 1,
                }],
                "mode": "payment",
                "success_url": success_url,
                "cancel_url": cancel_url,
            }
            
            if customer_email:
                session_data["customer_email"] = customer_email
            
            if metadata:
                session_data["metadata"] = metadata
            
            session = self.stripe.checkout.Session.create(**session_data)
            
            return {
                "session_id": session.id,
                "url": session.url
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return {"error": str(e)}


# Global instance
payment_service = PaymentService()
