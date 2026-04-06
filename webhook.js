import { getAllProducts } from '../../lib/shopify';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const products = await getAllProducts();
    const mapped = products.map(p => ({
      id: p.id,
      title: p.title,
      body: p.body_html?.replace(/<[^>]+>/g, '').slice(0, 500) || '',
      meta: p.metafields_global_description_tag || '',
    }));
    return res.status(200).json({ products: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
