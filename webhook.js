import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { updateProductMeta } from '../../lib/shopify';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Verify the request is genuinely from Shopify
function verifyWebhook(req, body) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmac) return false;
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  if (!verifyWebhook(req, rawBody)) {
    return res.status(401).json({ error: 'Webhook verification failed' });
  }

  const product = JSON.parse(rawBody.toString());

  // Only run if meta description is missing
  if (product.metafields_global_description_tag) {
    return res.status(200).json({ skipped: 'Already has meta description' });
  }

  try {
    const body = product.body_html?.replace(/<[^>]+>/g, '').slice(0, 500) || '';
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a Shopify meta description for this product. Return ONLY the meta description text — no quotes, no explanation. Keep it under 155 characters. Include the product name, a key benefit, and a soft call to action. Brand: Six Hats Supply Co — custom headwear.

Product: ${product.title}
Description: ${body}`,
        },
      ],
    });

    const meta = message.content[0]?.text?.trim().slice(0, 155) || '';
    await updateProductMeta(product.id, meta);

    console.log(`Auto-generated meta for new product: ${product.title}`);
    return res.status(200).json({ success: true, meta });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
