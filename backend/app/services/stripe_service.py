"""
Stripe Payment Service
Handles Stripe checkout session creation and payment processing
"""

import stripe
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for handling Stripe payments"""

    def __init__(self):
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.price_per_photo = settings.STRIPE_PRICE_PER_PHOTO

    def create_checkout_session(
        self,
        order_id: str,
        photo_count: int,
        customer_email: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, str]:
        """
        Create a Stripe Checkout Session for an order

        Args:
            order_id: UUID of the order
            photo_count: Number of photos in the order
            customer_email: Customer's email address
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled

        Returns:
            Dict with checkout session URL and session ID

        Raises:
            stripe.error.StripeError: If checkout session creation fails
        """
        try:
            # Calculate total amount (in cents for Stripe)
            unit_amount = int(self.price_per_photo * 100)  # $6.00 -> 600 cents
            total_amount = unit_amount * photo_count

            logger.info(
                f"Creating checkout session for order {order_id}: "
                f"{photo_count} photos × ${self.price_per_photo} = ${total_amount / 100}"
            )

            # Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': 'usd',
                            'unit_amount': unit_amount,
                            'product_data': {
                                'name': 'Cherished Motion Video',
                                'description': f'Animated video from {photo_count} photo{"s" if photo_count != 1 else ""}',
                            },
                        },
                        'quantity': photo_count,
                    }
                ],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=customer_email,
                metadata={
                    'order_id': order_id,
                    'photo_count': photo_count,
                },
                # Allow promotion codes
                allow_promotion_codes=True,
            )

            logger.info(f"Checkout session created: {session.id}")

            return {
                'checkout_url': session.url,
                'session_id': session.id
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            raise

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> stripe.Event:
        """
        Verify that a webhook request came from Stripe

        Args:
            payload: Raw request body
            signature: Stripe-Signature header value

        Returns:
            Verified Stripe Event object

        Raises:
            ValueError: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )
            return event

        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise ValueError("Invalid signature")

    def extract_payment_info(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Extract payment information from a Stripe event

        Args:
            event: Stripe Event object (checkout.session.completed)

        Returns:
            Dict with order_id, payment_intent_id, amount_paid, customer_email

        Raises:
            ValueError: If order_id is missing from metadata
        """
        session = event['data']['object']

        # Check if metadata exists and has order_id
        metadata = session.get('metadata', {})
        if not metadata or 'order_id' not in metadata:
            raise ValueError("Missing order_id in checkout session metadata")

        return {
            'order_id': metadata['order_id'],
            'session_id': session['id'],
            'payment_intent_id': session.get('payment_intent'),
            'amount_paid': session['amount_total'] / 100,  # Convert cents to dollars
            'customer_email': session.get('customer_email'),
            'payment_status': session['payment_status'],
        }


# Singleton instance
stripe_service = StripeService()
