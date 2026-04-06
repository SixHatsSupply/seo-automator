import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, brandVoice } = req.body;
  if (!title) return res.status(400).json({ error: 'Product title required' });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a Shopify meta description for this product. Return ONLY the meta description text — no quotes, no explanation, no markdown. Keep it under 155 characters. Include the product name, a key benefit, and a soft call to action.

Brand voice: ${brandVoice || 'Confident and direct, for teams and businesses who care about quality'}
Store: Six Hats Supply Co — custom headwear brand

Product title: ${title}
Product description: ${body || 'No description available'}`,
        },
      ],
    });

    const text = message.content[0]?.text?.trim().slice(0, 155) || '';
    return res.status(200).json({ meta: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
