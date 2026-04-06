import { updateProductMeta } from '../../lib/shopify';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productId, meta } = req.body;
  if (!productId || !meta) return res.status(400).json({ error: 'productId and meta required' });

  try {
    await updateProductMeta(productId, meta);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
