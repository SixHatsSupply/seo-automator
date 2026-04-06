# SEO Meta Description Automator — Six Hats Supply Co

Claude AI-powered tool that scans your Shopify store, writes SEO meta descriptions for products missing them, and pushes them live — automatically.

---

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub
Create a new GitHub repo and push this folder to it.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/seo-automator.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Click **Deploy** (default settings work fine)

### 3. Add Environment Variables
In your Vercel project → Settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `SHOPIFY_STORE_URL` | `sixhatssupply.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Your Shopify Admin API token (see below) |
| `SHOPIFY_WEBHOOK_SECRET` | A random secret string you choose (for webhook verification) |

Redeploy after adding variables.

### 4. Get your Shopify Admin API Token
1. Shopify Admin → Settings → Apps and sales channels
2. Develop apps → Create an app (name it "SEO Automator")
3. Configuration → Admin API scopes → enable `read_products` and `write_products`
4. Install app → copy the **Admin API access token** (starts with `shpat_`)

---

## Set up the Webhook (auto-run on new products)

Register the webhook so Claude auto-writes meta descriptions whenever you add a new product:

```bash
curl -X POST \
  "https://sixhatssupply.myshopify.com/admin/api/2024-04/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "products/create",
      "address": "https://YOUR-VERCEL-URL.vercel.app/api/webhook",
      "format": "json"
    }
  }'
```

Replace `YOUR_TOKEN` with your Shopify token and `YOUR-VERCEL-URL` with your Vercel deployment URL.

---

## Local Development

```bash
cp .env.example .env.local
# Fill in your values in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## How it works

1. **Scan** — fetches all products from Shopify Admin API
2. **Generate** — sends product title + description to Claude, gets back a 155-char meta description
3. **Push** — writes the meta description back to Shopify via API
4. **Webhook** — automatically triggers on `products/create` so new products always get a meta description

All API keys stay server-side and are never exposed to the browser.
