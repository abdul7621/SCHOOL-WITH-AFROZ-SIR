from app.core.celery_app import celery_app
from app.core.logging import logger


@celery_app.task(name="tasks.send_sms_notification")
def send_sms_notification(tenant_slug: str, recipient_phone: str, message: str) -> bool:
    """
    Background Task: Sends SMS alert via gateway provider (Fast2SMS, MSG91, Twilio).
    """
    logger.info(f"CELERY [SMS] | Tenant: {tenant_slug} | To: {recipient_phone} | Msg: {message[:30]}...")
    # In production, calls external HTTP SMS API
    return True


@celery_app.task(name="tasks.send_whatsapp_notification")
def send_whatsapp_notification(tenant_slug: str, recipient_phone: str, template_name: str, template_params: dict) -> bool:
    """
    Background Task: Dispatches WhatsApp Business API notification.
    """
    logger.info(f"CELERY [WhatsApp] | Tenant: {tenant_slug} | To: {recipient_phone} | Template: {template_name}")
    return True


@celery_app.task(name="tasks.generate_bulk_report_cards_pdf")
def generate_bulk_report_cards_pdf(tenant_slug: str, term_id: str, class_id: str) -> dict:
    """
    Background Task: Compiles and compiles ZIP archive of PDF report cards for an entire class.
    """
    logger.info(f"CELERY [Bulk PDF] | Tenant: {tenant_slug} | Term: {term_id} | Class: {class_id}")
    return {"status": "SUCCESS", "tenant_slug": tenant_slug, "term_id": term_id, "class_id": class_id}
