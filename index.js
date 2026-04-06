const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function shopifyFetch(endpoint, options = {}) {
  const url = `https://${SHOPIFY_URL}/admin/api/2024-04/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getAllProducts() {
  let products = [];
  let url = 'products.json?limit=250&fields=id,title,body_html,metafields_global_description_tag';
  while (url) {
    const data = await shopifyFetch(url);
    products = products.concat(data.products);
    // Shopify pagination via Link header not available in this helper — 250 limit covers most stores
    url = null;
  }
  return products;
}

export async function updateProductMeta(productId, metaDescription) {
  return shopifyFetch(`products/${productId}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      product: {
        id: productId,
        metafields_global_description_tag: metaDescription,
      },
    }),
  });
}
