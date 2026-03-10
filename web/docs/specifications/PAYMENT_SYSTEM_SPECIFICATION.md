# FigDex - Payment System Specification

**Version:** 1.0.0  
**Date:** December 24, 2025  
**Status:** Specification for Development

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Payment Provider Selection](#payment-provider-selection)
4. [Subscription Payment Flow](#subscription-payment-flow)
5. [Add-on Payment Flow](#add-on-payment-flow)
6. [Subscription Management](#subscription-management)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Webhooks](#webhooks)
10. [Invoices & Receipts](#invoices--receipts)
11. [UI/UX Design](#uiux-design)
12. [Security & Compliance](#security--compliance)
13. [Implementation Plan](#implementation-plan)
14. [Testing Strategy](#testing-strategy)

---

## 🎯 Executive Summary

### Goal
Implement a complete payment system for FigDex subscriptions and add-ons using Stripe as the payment provider.

### Scope
- **Subscription Payments**: Monthly recurring payments for Pro ($29/month) and Team ($49/month) plans
- **Add-on Payments**: Monthly recurring payments for add-ons (files, frames, daily indexes)
- **Subscription Management**: Upgrade, downgrade, cancel subscriptions
- **Payment Methods**: Credit cards, debit cards (via Stripe)
- **Invoicing**: Automatic invoice generation and email delivery
- **Webhooks**: Real-time event handling for payment events

### Out of Scope (Phase 1)
- One-time payments (future: annual plans)
- Multiple payment methods per user
- Refunds processing (manual admin process)
- Payment retry logic beyond Stripe defaults
- International tax calculation
- Currency conversion (USD only)

---

## 📊 Current State

### Existing Infrastructure

#### Plans Structure
- **Free Plan**: $0/month - 1 file, 300 frames, 3 indexes/day
- **Pro Plan**: $29/month - 10 files, 5,000 frames, 20 indexes/day
- **Team Plan**: $49/month - 20 files, 15,000 frames, 50 indexes/day
- **Unlimited Plan**: Admin only, custom pricing

#### Add-ons Structure
- **Files**: +1 ($5), +2 ($9), +5 ($20) per month
- **Frames**: +1,000 ($3), +2,000 ($5), +5,000 ($10) per month
- **Daily Indexes**: +10 ($2), +20 ($3), +50 ($5) per day

#### Current Implementation
- ✅ Plans system in `lib/plans.ts`
- ✅ Add-ons system in `sql/create_user_addons_table.sql`
- ✅ Add-on packages in `sql/create_addon_packages_table.sql`
- ✅ UI for purchasing add-ons (shows "Payment not implemented")
- ❌ No payment processing
- ❌ No Stripe integration
- ❌ No subscription management
- ❌ No invoices

---

## 💳 Payment Provider Selection

### Selected Provider: Stripe

**Why Stripe?**
- ✅ Industry standard, trusted by millions
- ✅ Comprehensive subscription management
- ✅ Built-in invoice generation
- ✅ Webhook system for real-time events
- ✅ Excellent documentation and SDK
- ✅ PCI compliance handled by Stripe
- ✅ Support for multiple currencies (future)
- ✅ Test mode for development

### Stripe Products & Prices

#### Subscription Products

```javascript
// Products to create in Stripe Dashboard or via API
const products = [
  {
    name: "FigDex Pro",
    description: "Pro Plan - 10 files, 5,000 frames, 20 indexes/day",
    price: 2900, // $29.00 in cents
    interval: "month",
    currency: "usd",
    type: "recurring"
  },
  {
    name: "FigDex Team",
    description: "Team Plan - 20 files, 15,000 frames, 50 indexes/day",
    price: 4900, // $49.00 in cents
    interval: "month",
    currency: "usd",
    type: "recurring"
  }
];
```

#### Add-on Products

```javascript
// Add-on products (create dynamically from addon_packages table)
const addonProducts = {
  files: [
    { value: 1, price: 500 }, // $5/month
    { value: 2, price: 900 }, // $9/month
    { value: 5, price: 2000 } // $20/month
  ],
  frames: [
    { value: 1000, price: 300 }, // $3/month
    { value: 2000, price: 500 }, // $5/month
    { value: 5000, price: 1000 } // $10/month
  ],
  rate_limit: [
    { value: 10, price: 200 }, // $2/month
    { value: 20, price: 300 }, // $3/month
    { value: 50, price: 500 } // $5/month
  ]
};
```

---

## 🔄 Subscription Payment Flow

### Flow: User Subscribes to Pro/Team Plan

```
1. User clicks "Upgrade to Pro" on pricing/account page
   ↓
2. Frontend calls POST /api/payment/create-checkout-session
   - plan_id: 'pro' or 'team'
   - success_url: /account?session_id={CHECKOUT_SESSION_ID}
   - cancel_url: /pricing
   ↓
3. Backend creates Stripe Checkout Session
   - Retrieves Stripe Price ID for plan
   - Creates checkout session with subscription mode
   - Returns session URL
   ↓
4. Frontend redirects user to Stripe Checkout
   ↓
5. User enters payment details and confirms
   ↓
6. Stripe processes payment
   ↓
7. Stripe sends webhook: checkout.session.completed
   ↓
8. Backend webhook handler:
   - Creates/updates subscription in database
   - Updates user plan
   - Sends confirmation email
   ↓
9. Stripe redirects to success_url
   ↓
10. Frontend shows success message and updated plan
```

### Flow: Subscription Renewal (Automatic)

```
1. Stripe automatically charges user on billing date
   ↓
2. If successful:
   - Stripe sends webhook: invoice.payment_succeeded
   - Backend updates subscription status
   - Stripe sends invoice email to user
   ↓
3. If failed:
   - Stripe sends webhook: invoice.payment_failed
   - Backend marks subscription as past_due
   - Backend sends email to user
   - Stripe retries payment (3 times)
   - If all retries fail: subscription cancelled
```

---

## ➕ Add-on Payment Flow

### Flow: User Purchases Add-on

```
1. User clicks "Purchase Add-on" on account page
   ↓
2. Frontend calls POST /api/payment/create-addon-checkout-session
   - addon_package_id: UUID
   - success_url: /account?addon_success=true
   - cancel_url: /account
   ↓
3. Backend:
   - Retrieves addon package from database
   - Gets or creates Stripe Price for this addon
   - Creates checkout session with subscription mode
   - Returns session URL
   ↓
4. Frontend redirects to Stripe Checkout
   ↓
5. User confirms payment
   ↓
6. Stripe sends webhook: checkout.session.completed
   ↓
7. Backend webhook handler:
   - Creates user_addon record
   - Links to Stripe subscription item
   - Sends confirmation email
   ↓
8. User redirected to success page
```

### Flow: Add-on Cancellation

```
1. User clicks "Cancel Add-on" on account page
   ↓
2. Frontend calls DELETE /api/user/addons/:id
   ↓
3. Backend:
   - Marks addon as 'cancelled' (effective end of billing period)
   - Cancels Stripe subscription item (at period end)
   - Updates end_date in user_addons
   ↓
4. At end of billing period:
   - Stripe sends webhook: customer.subscription.deleted
   - Backend marks addon as 'expired'
   - User loses access to addon benefits
```

---

## 🔧 Subscription Management

### Upgrade Plan

```
Current: Free → New: Pro
- Create new Stripe subscription for Pro
- Cancel old subscription (if exists)
- Update user plan immediately
- Prorate charges if applicable
```

### Downgrade Plan

```
Current: Team → New: Pro
- Create new Stripe subscription for Pro
- Cancel Team subscription at period end
- Update user plan at period end (or immediately if prefer)
- Keep Team benefits until period end
```

### Cancel Subscription

```
1. User clicks "Cancel Subscription"
   ↓
2. Backend cancels Stripe subscription (at period end)
   ↓
3. User plan stays active until period end
   ↓
4. At period end:
   - User plan downgrades to Free
   - Access to paid features removed
   - Data retained (for restoration if resubscribe)
```

### Reactivate Subscription

```
1. User clicks "Reactivate" (from cancelled state)
   ↓
2. Backend reactivates Stripe subscription
   ↓
3. User regains access immediately
```

---

## 🗄️ Database Schema

### New Tables

#### `stripe_customers`
Links users to Stripe customers

```sql
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR NOT NULL UNIQUE, -- Stripe customer ID
  email VARCHAR NOT NULL, -- Email at time of creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
```

#### `subscriptions`
Tracks user subscriptions

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR NOT NULL UNIQUE, -- Stripe subscription ID
  stripe_customer_id VARCHAR NOT NULL, -- Stripe customer ID
  plan_id VARCHAR NOT NULL, -- 'pro', 'team'
  status VARCHAR NOT NULL, -- 'active', 'past_due', 'canceled', 'unpaid', 'trialing'
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
```

#### `subscription_items`
Links subscriptions to Stripe subscription items (for add-ons)

```sql
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_addon_id UUID REFERENCES user_addons(id) ON DELETE SET NULL,
  stripe_subscription_item_id VARCHAR NOT NULL UNIQUE,
  stripe_price_id VARCHAR NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_user_addon_id ON subscription_items(user_addon_id);
```

#### `invoices`
Stores invoice information from Stripe

```sql
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR NOT NULL UNIQUE,
  stripe_subscription_id VARCHAR,
  amount_paid INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL, -- 'paid', 'open', 'void', 'uncollectible'
  invoice_pdf_url TEXT, -- Stripe invoice PDF URL
  hosted_invoice_url TEXT, -- Stripe hosted invoice URL
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
```

#### `payment_methods`
Stores payment methods (optional, for future use)

```sql
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR NOT NULL UNIQUE,
  type VARCHAR NOT NULL, -- 'card'
  card_last4 VARCHAR(4),
  card_brand VARCHAR, -- 'visa', 'mastercard', etc.
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
```

### Updated Tables

#### `users`
Add subscription fields

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR; -- 'active', 'past_due', 'canceled', etc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
```

#### `user_addons`
Add Stripe integration fields

```sql
ALTER TABLE user_addons ADD COLUMN IF NOT EXISTS stripe_subscription_item_id VARCHAR;
ALTER TABLE user_addons ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR;
```

#### `addon_packages`
Add Stripe price IDs

```sql
ALTER TABLE addon_packages ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR;
ALTER TABLE addon_packages ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR;
```

---

## 🔌 API Endpoints

### Payment Endpoints

#### `POST /api/payment/create-checkout-session`
Create Stripe Checkout session for subscription

**Request:**
```json
{
  "plan_id": "pro" | "team",
  "success_url": "https://figdex.com/account?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://figdex.com/pricing"
}
```

**Response:**
```json
{
  "success": true,
  "session_url": "https://checkout.stripe.com/pay/..."
}
```

#### `POST /api/payment/create-addon-checkout-session`
Create Stripe Checkout session for add-on

**Request:**
```json
{
  "addon_package_id": "uuid",
  "success_url": "https://figdex.com/account?addon_success=true",
  "cancel_url": "https://figdex.com/account"
}
```

**Response:**
```json
{
  "success": true,
  "session_url": "https://checkout.stripe.com/pay/..."
}
```

#### `GET /api/payment/checkout-session/:session_id`
Verify checkout session completion

**Response:**
```json
{
  "success": true,
  "subscription_id": "uuid",
  "status": "active"
}
```

### Subscription Management Endpoints

#### `GET /api/subscription`
Get current user's subscription

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "plan_id": "pro",
    "status": "active",
    "current_period_start": "2025-12-24T00:00:00Z",
    "current_period_end": "2026-01-24T00:00:00Z",
    "cancel_at_period_end": false
  }
}
```

#### `POST /api/subscription/cancel`
Cancel subscription (at period end)

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at end of billing period"
}
```

#### `POST /api/subscription/reactivate`
Reactivate cancelled subscription

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated"
}
```

#### `POST /api/subscription/upgrade`
Upgrade subscription plan

**Request:**
```json
{
  "new_plan_id": "team"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": { ... }
}
```

#### `POST /api/subscription/downgrade`
Downgrade subscription plan

**Request:**
```json
{
  "new_plan_id": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": { ... }
}
```

### Invoice Endpoints

#### `GET /api/invoices`
Get user's invoices

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "uuid",
      "amount": 2900,
      "currency": "usd",
      "status": "paid",
      "invoice_pdf_url": "https://...",
      "paid_at": "2025-12-24T00:00:00Z"
    }
  ]
}
```

#### `GET /api/invoices/:id/download`
Get invoice PDF URL

**Response:**
```json
{
  "success": true,
  "invoice_pdf_url": "https://..."
}
```

---

## 📡 Webhooks

### Stripe Webhook Endpoint

**Endpoint:** `POST /api/webhooks/stripe`

**Events to Handle:**

#### `checkout.session.completed`
User completed checkout (subscription or add-on)

```typescript
// Actions:
- Create/update subscription in database
- Update user plan
- Create user_addon record (if add-on)
- Send confirmation email
```

#### `customer.subscription.created`
New subscription created

```typescript
// Actions:
- Create subscription record
- Update user plan
```

#### `customer.subscription.updated`
Subscription updated (plan change, quantity change, etc.)

```typescript
// Actions:
- Update subscription record
- Update user plan if changed
- Update user_addons if quantity changed
```

#### `customer.subscription.deleted`
Subscription cancelled

```typescript
// Actions:
- Mark subscription as cancelled
- Downgrade user to Free plan (if main subscription)
- Mark user_addons as expired (if add-on subscription)
```

#### `invoice.payment_succeeded`
Payment successful (renewal or new)

```typescript
// Actions:
- Create invoice record
- Update subscription status to 'active'
- Send invoice email to user
```

#### `invoice.payment_failed`
Payment failed

```typescript
// Actions:
- Update subscription status to 'past_due'
- Send payment failed email to user
- Log failure for admin review
```

#### `invoice.created`
New invoice created (before payment)

```typescript
// Actions:
- Create invoice record with status 'open'
```

---

## 🧾 Invoices & Receipts

### Invoice Generation

- **Automatic**: Stripe generates invoices automatically
- **Storage**: Store invoice data in `invoices` table
- **PDF**: Access via `invoice_pdf_url` from Stripe
- **Email**: Stripe sends invoices automatically (configurable)

### Invoice Details

Each invoice includes:
- Invoice number (from Stripe)
- Date and period
- Items (subscription, add-ons)
- Amount (in USD)
- Payment method
- PDF download link

### Receipts

- Receipts are automatically sent by Stripe on successful payment
- Can also be accessed via Stripe Dashboard
- Users can download receipts from account page

---

## 🎨 UI/UX Design

### Account Page Updates

#### Current Subscription Section
```
┌─────────────────────────────────────┐
│ Current Plan: Pro                   │
│ $29/month                           │
│ Next billing: Jan 24, 2026          │
│                                     │
│ [Manage Subscription] [Cancel]      │
└─────────────────────────────────────┘
```

#### Add-ons Section (Update)
```
┌─────────────────────────────────────┐
│ Active Add-ons                      │
│                                     │
│ +1 File - $5/month                  │
│ Next billing: Jan 24, 2026          │
│ [Cancel]                            │
│                                     │
│ [Purchase Add-ons]                  │
└─────────────────────────────────────┘
```

### Pricing Page Updates

- Change "Coming Soon" buttons to "Subscribe" buttons
- Add "Current Plan" indicator for logged-in users
- Show upgrade/downgrade options

### Subscription Management Dialog

```
┌─────────────────────────────────────┐
│ Manage Subscription                 │
│                                     │
│ Current Plan: Pro                   │
│                                     │
│ Change Plan:                        │
│ ○ Free                              │
│ ● Pro ($29/month)                   │
│ ○ Team ($49/month)                  │
│                                     │
│ Payment Method:                     │
│ **** **** **** 4242                 │
│ [Update Payment Method]             │
│                                     │
│ Billing History:                    │
│ [View Invoices]                     │
│                                     │
│ [Save Changes] [Cancel]             │
└─────────────────────────────────────┘
```

### Checkout Flow

- Redirect to Stripe Checkout (hosted by Stripe)
- Customizable success/cancel URLs
- Automatic redirect back to app after completion

---

## 🔒 Security & Compliance

### Security Measures

1. **API Key Protection**
   - Store Stripe keys in environment variables
   - Use different keys for test/live modes
   - Never expose keys to frontend

2. **Webhook Verification**
   - Verify webhook signatures from Stripe
   - Reject unsigned webhooks
   - Use webhook secret from Stripe Dashboard

3. **User Authentication**
   - All payment endpoints require authentication
   - Verify user owns subscription before operations
   - Use API key authentication

4. **Data Encryption**
   - Stripe handles PCI compliance
   - Never store full credit card numbers
   - Store only Stripe customer IDs and subscription IDs

### Compliance

- **PCI DSS**: Handled by Stripe (no card data stored)
- **GDPR**: User data deletion on request
- **Tax**: Stripe Tax available (optional, for future)
- **Receipts**: Stripe provides compliant receipts

---

## 📋 Implementation Plan

### Phase 1: Core Subscription Payments (Week 1-2)

1. **Setup**
   - Create Stripe account
   - Configure products and prices in Stripe Dashboard
   - Set up environment variables

2. **Database**
   - Create new tables (stripe_customers, subscriptions, etc.)
   - Run migrations
   - Update existing tables

3. **Backend - Checkout**
   - Implement `/api/payment/create-checkout-session`
   - Test checkout flow

4. **Backend - Webhooks**
   - Implement `/api/webhooks/stripe`
   - Handle `checkout.session.completed`
   - Handle `invoice.payment_succeeded`
   - Handle `invoice.payment_failed`

5. **Frontend - Checkout**
   - Update pricing page
   - Add "Subscribe" buttons
   - Handle checkout redirect

### Phase 2: Subscription Management (Week 3)

1. **Backend - Subscription API**
   - Implement subscription endpoints
   - Upgrade/downgrade logic
   - Cancel/reactivate logic

2. **Frontend - Account Page**
   - Add subscription section
   - Add management dialog
   - Update plan display

### Phase 3: Add-on Payments (Week 4)

1. **Backend - Add-on Checkout**
   - Implement `/api/payment/create-addon-checkout-session`
   - Link add-ons to Stripe subscription items

2. **Frontend - Add-on Purchase**
   - Update add-on purchase flow
   - Integrate with Stripe Checkout

3. **Webhooks**
   - Handle add-on subscription events
   - Update user_addons table

### Phase 4: Invoices & Polish (Week 5)

1. **Invoices**
   - Implement invoice endpoints
   - Add invoice list to account page
   - Add PDF download links

2. **Testing**
   - Test all flows
   - Test webhooks
   - Test edge cases

3. **Documentation**
   - Update API documentation
   - Add admin guide
   - Add user guide

---

## 🧪 Testing Strategy

### Test Mode

- Use Stripe test mode for development
- Test cards: https://stripe.com/docs/testing
- Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Test Scenarios

#### Subscription Tests
- ✅ User subscribes to Pro plan
- ✅ User subscribes to Team plan
- ✅ User upgrades from Free to Pro
- ✅ User upgrades from Pro to Team
- ✅ User downgrades from Team to Pro
- ✅ User cancels subscription
- ✅ User reactivates cancelled subscription
- ✅ Subscription renews automatically
- ✅ Payment fails, subscription marked past_due
- ✅ Payment fails 3 times, subscription cancelled

#### Add-on Tests
- ✅ User purchases file add-on
- ✅ User purchases frame add-on
- ✅ User purchases rate_limit add-on
- ✅ User cancels add-on (end of period)
- ✅ Add-on renews automatically
- ✅ Multiple add-ons active simultaneously

#### Webhook Tests
- ✅ All webhook events handled correctly
- ✅ Webhook signature verification
- ✅ Idempotency (handle duplicate webhooks)

#### Edge Cases
- ✅ User with existing subscription tries to subscribe again
- ✅ Subscription expires, user access removed
- ✅ User deletes account, subscription cancelled
- ✅ Admin grants plan manually (bypass Stripe)

---

## 📝 Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_... # Test mode
STRIPE_PUBLISHABLE_KEY=pk_test_... # Test mode (frontend)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret

# Production
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# Stripe Product/Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_TEAM=price_...
```

---

## 🔗 References

- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Last Updated:** December 24, 2025  
**Version:** 1.0.0  
**Status:** Ready for Development

