# Paddle Payment Setup Guide

**Date:** December 24, 2025

Complete guide for setting up Paddle payment processing for FigDex.

---

## 📋 Prerequisites

- Paddle account (sign up at https://paddle.com)
- Access to Paddle Dashboard
- FigDex application deployed

---

## 🚀 Setup Steps

### Step 1: Create Paddle Account

1. Go to https://paddle.com
2. Click "Sign Up"
3. Create your account
4. Verify your email

### Step 2: Get Paddle Credentials

1. Go to Paddle Dashboard → Settings → Developer Tools
2. Copy the following:
   - **Vendor ID**: Found in Dashboard → Settings → Account Details
   - **API Key**: Generate in Developer Tools → Authentication
   - **Public Key**: Found in Developer Tools → Public Key
   - **Webhook Secret**: Generate in Developer Tools → Webhooks

### Step 3: Create Products & Prices

1. Go to Paddle Dashboard → Products → Create Product

#### Create Pro Plan Product:
- **Product Name**: FigDex Pro
- **Description**: Pro Plan - 10 files, 5,000 frames, 20 indexes/day
- **Price**: $29.00 USD
- **Billing Cycle**: Monthly (recurring)
- **Copy the Price ID** (starts with `pri_...`)

#### Create Team Plan Product:
- **Product Name**: FigDex Team
- **Description**: Team Plan - 20 files, 15,000 frames, 50 indexes/day
- **Price**: $49.00 USD
- **Billing Cycle**: Monthly (recurring)
- **Copy the Price ID** (starts with `pri_...`)

### Step 4: Configure Environment Variables

Add to your `.env.local` (development) and Vercel Environment Variables (production):

```bash
# Paddle Configuration
PADDLE_VENDOR_ID=your_vendor_id
PADDLE_API_KEY=your_api_key
PADDLE_ENVIRONMENT=sandbox  # or 'production' for live
NEXT_PUBLIC_PADDLE_PUBLIC_KEY=your_public_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret

# Paddle Price IDs (from Step 3)
PADDLE_PRICE_ID_PRO=pri_...
PADDLE_PRICE_ID_TEAM=pri_...
```

### Step 5: Run Database Migrations

1. Run `sql/create_payment_system_tables.sql` in Supabase SQL Editor
2. Run `sql/update_invoices_table_for_paddle.sql` in Supabase SQL Editor

### Step 6: Configure Webhooks

1. Go to Paddle Dashboard → Developer Tools → Webhooks
2. Click "Add Endpoint"
3. Set URL: `https://your-domain.com/api/webhooks/paddle`
4. Select events to listen for:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `transaction.completed`
   - `transaction.payment_failed`
5. Copy the Webhook Secret and add to environment variables

### Step 7: Test in Sandbox

1. Use Paddle sandbox mode (`PADDLE_ENVIRONMENT=sandbox`)
2. Test checkout flow:
   - Go to `/pricing`
   - Click "Subscribe to Pro" or "Subscribe to Team"
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVV: Any 3 digits
3. Verify webhook events in Paddle Dashboard → Developer Tools → Webhooks → Recent Events

---

## 🔧 Testing

### Test Cards (Sandbox Mode)

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

**Payment Failure:**
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVV: Any 3 digits

**Requires Authentication:**
- Card: `4000 0025 0000 3155`
- Expiry: Any future date
- CVV: Any 3 digits

### Verify Webhooks

1. Go to Paddle Dashboard → Developer Tools → Webhooks
2. Click on your webhook endpoint
3. View "Recent Events" tab
4. Check that events are being received
5. Verify in application logs that webhooks are processed

---

## 🚢 Production Setup

1. **Switch to Production:**
   ```bash
   PADDLE_ENVIRONMENT=production
   ```

2. **Update Keys:**
   - Use production API keys (from Paddle Dashboard)
   - Use production webhook secret
   - Update price IDs if needed

3. **Update Webhook URL:**
   - Update webhook endpoint URL to production domain
   - Re-verify webhook secret

4. **Test Production:**
   - Test with real payment method (will charge real money)
   - Verify webhooks are received
   - Check subscription creation in database

---

## 📊 Monitoring

### Paddle Dashboard
- View subscriptions: Paddle Dashboard → Customers → Subscriptions
- View transactions: Paddle Dashboard → Transactions
- View webhooks: Paddle Dashboard → Developer Tools → Webhooks

### Application Logs
- Check Vercel logs for webhook processing
- Look for `[PADDLE WEBHOOK]` log entries
- Monitor subscription creation/updates

---

## 🔒 Security

- **Never commit** Paddle keys to git
- Use environment variables only
- Rotate keys periodically
- Use webhook signature verification (already implemented)
- Monitor for suspicious activity

---

## 📚 Resources

- **Paddle Documentation:** https://developer.paddle.com
- **Paddle Dashboard:** https://vendors.paddle.com
- **Paddle Support:** https://paddle.com/support

---

**Last Updated:** December 24, 2025

