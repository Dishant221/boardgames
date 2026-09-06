# Cloudflare Setup Guide

This guide walks through setting up all Cloudflare services for BoardGamesEpic.

## Prerequisites

- Cloudflare account (free tier)
- Domain name registered (boardgamesepic.com)
- Cloudflare API Token with appropriate permissions
- Wrangler CLI installed (`npm install -g wrangler`)

---

## 1. Domain Setup

### If you don't have the domain on Cloudflare yet:

1. Go to https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter your domain: `boardgamesepic.com`
4. Select **Free Plan**
5. Follow the instructions to update nameservers with your domain registrar
6. Wait for nameserver propagation (usually 24-48 hours)

### Get your Zone ID:
1. In Cloudflare dashboard, go to your domain
2. Click **Overview** on the left
3. Scroll to **API** section
4. Copy your **Zone ID**
5. Update it in `wrangler.toml`

---

## 2. Cloudflare Workers Setup

### Create Production Worker:

```bash
cd packages/backend
wrangler deploy --env production
```

### Create Testing Worker:

```bash
cd packages/backend
wrangler deploy --env testing
```

---

## 3. Cloudflare D1 Database Setup

### Create Production Database:

```bash
wrangler d1 create boardgames-prod --env production
```

This will output a `database_id`. Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "boardgames-prod"
database_id = "YOUR_PROD_DB_ID"  # ← Replace with output
```

### Create Testing Database:

```bash
wrangler d1 create boardgames-testing --env testing
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "boardgames-testing"
database_id = "YOUR_TESTING_DB_ID"  # ← Replace with output
```

### Initialize Database Schema:

```bash
# Production
wrangler d1 execute boardgames-prod --file ./src/db/schema.sql --env production

# Testing
wrangler d1 execute boardgames-testing --file ./src/db/schema.sql --env testing
```

---

## 4. Cloudflare KV Setup

### Create KV Namespace for Production:

```bash
wrangler kv:namespace create "CACHE" --env production
```

Output will show `id` and `preview_id`. Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_PROD_KV_ID"
preview_id = "YOUR_PROD_KV_PREVIEW_ID"
```

### Create KV Namespace for Testing:

```bash
wrangler kv:namespace create "CACHE" --env testing
```

---

## 5. Cloudflare R2 Setup

### Create Production Bucket:

```bash
wrangler r2 bucket create boardgames-assets
```

### Create Preview Bucket:

```bash
wrangler r2 bucket create boardgames-assets-preview
```

### Update wrangler.toml:

```toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "boardgames-assets"
preview_bucket_name = "boardgames-assets-preview"
```

### Configure R2 Public Access (Optional):

1. Go to Cloudflare R2 dashboard
2. Select bucket `boardgames-assets`
3. Click **Settings**
4. Under "Public access", enable **"Allow public access"**
5. Set CORS policy if needed

---

## 6. Cloudflare Durable Objects Setup

### Enable Durable Objects:

1. Go to https://dash.cloudflare.com
2. Select your Worker
3. Go to **Triggers** → **Durable Objects**
4. Click **Create Class**
5. Create a class named `GameSession`

### Update wrangler.toml:

```toml
[[durable_objects.bindings]]
name = "GAME_SESSION"
class_name = "GameSession"
script_name = "boardgames-workers"
```

---

## 7. Cloudflare Pages Setup (Frontend Deployment)

### Connect GitHub Repository:

1. Go to Cloudflare Pages: https://pages.cloudflare.com
2. Click **Connect to Git**
3. Authorize GitHub
4. Select repository: `Dishant221/boardgames`
5. Configure build settings:
   - **Framework**: React
   - **Build command**: `cd packages/frontend && npm run build`
   - **Build output directory**: `packages/frontend/dist`
6. Set environment variables:
   - `VITE_API_URL=https://api.boardgamesepic.com` (Production)
   - `VITE_API_URL=https://test-api.boardgamesepic.com` (Testing)

### Create Preview Environment:

Cloudflare automatically creates preview deployments for PRs.

---

## 8. Cloudflare Email Routing (Optional)

### Enable Email Routing:

1. Go to your domain settings
2. Click **Email Routing**
3. Add routing rules:
   - `noreply@boardgamesepic.com` → Your email
   - `support@boardgamesepic.com` → Your email

---

## 9. Environment Variables

### Set Worker Secrets:

```bash
# Production
wrangler secret put JWT_SECRET --env production
wrangler secret put DATABASE_URL --env production

# Testing
wrangler secret put JWT_SECRET --env testing
wrangler secret put DATABASE_URL --env testing
```

---

## 10. DNS Configuration

### Add DNS Records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | www | boardgames.pages.dev | Proxied |
| CNAME | api | workers.dev | Proxied |
| CNAME | test | test.boardgames.pages.dev | Proxied |
| CNAME | test-api | test.workers.dev | Proxied |

---

## 11. SSL/TLS Configuration

### Enable Automatic HTTPS:

1. Go to your domain in Cloudflare
2. Click **SSL/TLS**
3. Set **SSL/TLS encryption mode** to **"Full (strict)"**
4. Enable **"Always Use HTTPS"** under **"Edge Certificates"**

---

## 12. Firewall & DDoS Protection

### Basic Security:

1. Go to **Security** → **Settings**
2. Enable:
   - ☑️ DDoS Protection
   - ☑️ Bot Management (optional)
   - ☑️ Advanced DDoS Protection

### Web Application Firewall:

1. Go to **Security** → **WAF**
2. Add rules to block suspicious traffic:
   - Rate limiting: 100 requests/min per IP
   - SQL injection detection
   - XSS attack detection

---

## 13. Analytics & Monitoring

### Enable Analytics:

1. Go to **Analytics & Logs**
2. View real-time traffic, errors, and performance
3. Set up alerts for:
   - High error rate (>5%)
   - Worker timeouts
   - Database connection failures

---

## Verification Checklist

- [ ] Domain pointing to Cloudflare
- [ ] Workers deployed (production & testing)
- [ ] D1 databases created and schema initialized
- [ ] KV namespaces created
- [ ] R2 buckets created
- [ ] Durable Objects configured
- [ ] Pages connected to GitHub
- [ ] Email routing configured
- [ ] DNS records added
- [ ] SSL/TLS encryption enabled
- [ ] Firewall rules configured
- [ ] Analytics enabled

---

## Troubleshooting

### Database Connection Failed
```bash
# Check database status
wrangler d1 list

# Test connection
wrangler d1 execute boardgames-prod --command "SELECT 1"
```

### Worker Not Deploying
```bash
# Check for errors
wrangler deploy --env production --verbose

# Build locally first
npm run build
```

### KV Not Working
```bash
# List KV namespaces
wrangler kv:namespace list

# Test KV
wrangler kv:key list --namespace-id=<ID>
```

### R2 Bucket Access Issues
- Check bucket public access settings
- Verify CORS headers
- Check IAM permissions

---

## Cost Optimization Tips

1. **Use Caching Aggressively**: Cache on Cloudflare KV before DB queries
2. **Optimize Assets**: Compress images, use WebP format
3. **Rate Limiting**: Prevent abuse and unnecessary requests
4. **Database Indexing**: Proper indexes reduce query time
5. **Durable Objects**: Only use for active game sessions, clean up expired ones
6. **R2 Lifecycle**: Auto-delete old game recordings/assets

---

**Last Updated:** 2026-09-07  
**Status:** Ready for Implementation
