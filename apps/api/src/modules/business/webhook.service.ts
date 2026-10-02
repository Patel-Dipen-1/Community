import { prisma } from '@b2b/database';
import crypto from 'crypto';

export class WebhookService {
  static async registerWebhook(businessId: string, targetUrl: string, events: string[]) {
    if (!targetUrl || !targetUrl.startsWith('http')) {
      throw new Error('WEBHOOK_INVALID: Valid target URL starting with http:// or https:// is required');
    }

    const secretKey = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const webhook = await prisma.webhookConfig.create({
      data: {
        businessId,
        targetUrl,
        secretKey,
        events: events && events.length > 0 ? events : ['lead.created', 'inquiry.received'],
        isActive: true,
      },
    });

    return webhook;
  }

  static async getBusinessWebhooks(businessId: string) {
    return prisma.webhookConfig.findMany({
      where: { businessId },
      include: {
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async deleteWebhook(businessId: string, webhookId: string) {
    const existing = await prisma.webhookConfig.findFirst({
      where: { id: webhookId, businessId },
    });

    if (!existing) throw new Error('Webhook configuration not found');

    await prisma.webhookConfig.delete({ where: { id: webhookId } });
    return { success: true, message: 'Webhook configuration removed' };
  }

  static async dispatchEvent(businessId: string, event: string, payload: any) {
    const configs = await prisma.webhookConfig.findMany({
      where: {
        businessId,
        isActive: true,
        events: { has: event },
      },
    });

    if (configs.length === 0) return;

    for (const config of configs) {
      const timestamp = Date.now();
      const body = JSON.stringify({ event, timestamp, payload });
      const signature = crypto
        .createHmac('sha256', config.secretKey)
        .update(body)
        .digest('hex');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(config.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': String(timestamp),
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        await prisma.webhookLog.create({
          data: {
            configId: config.id,
            event,
            payload,
            responseCode: response.status,
            status: response.ok ? 'SUCCESS' : 'FAILED',
          },
        });
      } catch (err: any) {
        await prisma.webhookLog.create({
          data: {
            configId: config.id,
            event,
            payload,
            responseCode: 500,
            status: 'FAILED',
          },
        });
      }
    }
  }
}
