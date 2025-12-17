"""
Email Service using Resend
Handles sending delivery emails to customers
"""

import resend
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY


class EmailService:
    """Service for handling email delivery via Resend"""

    #todo might have to change this to an actual email later on
    def __init__(self):
        self.from_email = "Cherished Motion <noreply@cherishedmotion.com>"

    def send_delivery_email(
        self,
        to_email: str,
        customer_name: str,
        order_id: str,
        delivery_url: str
    ) -> Dict[str, Any]:
        """
        Send video delivery email to customer

        Args:
            to_email: Customer's email address
            customer_name: Customer's name
            order_id: Order ID
            delivery_url: URL to view/download the video

        Returns:
            Dict with email sending result

        Raises:
            Exception: If email sending fails
        """
        try:
            logger.info(f"Sending delivery email to {to_email} for order {order_id}")

            # Create HTML email content
            html_content = self._create_delivery_email_html(
                customer_name=customer_name,
                order_id=order_id,
                delivery_url=delivery_url
            )

            # Send email using Resend
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": "Your Cherished Motion Video is Ready!",
                "html": html_content,
            }

            result = resend.Emails.send(params)

            logger.info(f"Delivery email sent successfully: {result}")

            return {
                "success": True,
                "email_id": result.get("id"),
                "message": "Delivery email sent successfully"
            }

        except Exception as e:
            logger.error(f"Failed to send delivery email: {str(e)}")
            raise

    def _create_delivery_email_html(
        self,
        customer_name: str,
        order_id: str,
        delivery_url: str
    ) -> str:
        """
        Create HTML content for delivery email

        Args:
            customer_name: Customer's name
            order_id: Order ID
            delivery_url: URL to view/download the video

        Returns:
            HTML string for email body
        """
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Video is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                                Your Video is Ready! 🎉
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                Hi {customer_name},
                            </p>
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                Great news! Your Cherished Motion video has been completed and is ready to view.
                            </p>
                            <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                We've transformed your photos into a beautiful animated video that captures your cherished moments.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{delivery_url}"
                                           style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                            View Your Video
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                                Order ID: {order_id}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0; color: #8a8a8a; font-size: 14px; line-height: 1.5; text-align: center;">
                                If you have any questions, feel free to reply to this email.
                            </p>
                            <p style="margin: 10px 0 0; color: #8a8a8a; font-size: 14px; line-height: 1.5; text-align: center;">
                                Thank you for choosing Cherished Motion!
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


# Singleton instance
email_service = EmailService()
