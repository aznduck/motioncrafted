"""
Stripe Webhook Handler
Processes Stripe payment events
"""

from fastapi import APIRouter, Request, HTTPException, status
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.services.stripe_service import stripe_service
from app.models.database_helpers import db_helpers
from app.services.order_processor import order_processor

logger = logging.getLogger(__name__)

router = APIRouter()

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=4)


def run_order_processing_sync(order_id: str):
    """Wrapper to run async order processing in a sync context"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(order_processor.process_order(order_id))
    finally:
        loop.close()


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events

    This endpoint receives payment notifications from Stripe.
    When a payment succeeds, it triggers order processing.

    Events handled:
    - checkout.session.completed: Payment successful, start order processing
    """
    # Get raw body and signature
    payload = await request.body()
    signature = request.headers.get('stripe-signature')

    if not signature:
        logger.error("Missing Stripe signature header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing signature"
        )

    # Verify webhook signature
    try:
        event = stripe_service.verify_webhook_signature(payload, signature)
    except ValueError as e:
        logger.error(f"Invalid webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    # Handle the event
    event_type = event['type']
    logger.info(f"Received Stripe webhook: {event_type}")

    if event_type == 'checkout.session.completed':
        # Payment successful!
        try:
            payment_info = stripe_service.extract_payment_info(event)
        except ValueError as e:
            # Missing order_id in metadata (e.g., from stripe trigger command)
            logger.warning(f"Ignoring checkout session without order_id: {str(e)}")
            return {"status": "ignored", "reason": "missing_order_id"}

        order_id = payment_info['order_id']
        logger.info(
            f"Payment successful for order {order_id}: "
            f"${payment_info['amount_paid']} paid"
        )

        # Update order payment status
        try:
            order = db_helpers.get_order_by_id(order_id)

            if not order:
                logger.error(f"Order not found: {order_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found"
                )

            # Update payment status and move to pending (ready to process)
            result = db_helpers.client.table('orders').update({
                'payment_status': 'paid',
                'status': 'pending'
            }).eq('id', order_id).execute()

            logger.info(f"Order {order_id} updated: payment_status=paid, status=pending")

            # Trigger order processing in background (non-blocking!)
            asyncio.get_event_loop().run_in_executor(
                executor,
                run_order_processing_sync,
                order_id
            )

            logger.info(f"Order processing started for {order_id}")

        except Exception as e:
            logger.error(f"Failed to process payment webhook: {str(e)}")
            # Don't raise exception - return 200 to Stripe even if processing fails
            # We can manually retry failed orders later

    else:
        # Other event types we don't handle yet
        logger.info(f"Unhandled event type: {event_type}")

    # Return 200 to acknowledge receipt
    return {"status": "success"}
