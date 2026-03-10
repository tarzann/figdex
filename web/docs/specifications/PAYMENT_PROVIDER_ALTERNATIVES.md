# Payment Provider Alternatives for Israel

**Date:** December 24, 2025

---

## 🚨 Problem: Stripe Not Available Directly in Israel

Stripe does not currently support direct account creation from Israel. However, there are several alternatives and workarounds.

---

## 💡 Solutions

### Option 1: Stripe Atlas (Recommended for Long-term)

**What it is:** Stripe Atlas helps you incorporate a US company and get access to Stripe.

**Pros:**
- ✅ Access to full Stripe platform
- ✅ US banking (Delaware C-Corp or LLC)
- ✅ Legal structure for international business
- ✅ Can raise funding later if needed

**Cons:**
- ❌ Requires $500 one-time fee
- ❌ Annual maintenance costs (~$100-200/year)
- ❌ Legal/tax complexity
- ❌ Takes 1-2 weeks to set up

**Cost:** $500 setup + ongoing maintenance

**Best for:** Serious SaaS business planning to scale internationally

---

### Option 2: Paddle (Recommended for SaaS)

**What it is:** Merchant of Record (MoR) payment processor specifically for SaaS

**Pros:**
- ✅ Available in Israel
- ✅ Handles taxes globally (VAT, sales tax)
- ✅ No need for company incorporation
- ✅ Lower payment processing fees than Stripe
- ✅ Built-in subscription management
- ✅ Handles refunds and chargebacks
- ✅ Multiple currencies

**Cons:**
- ❌ Slightly different API than Stripe
- ❌ Less customization than Stripe
- ❌ Revenue share model (they keep % of each transaction)

**Fees:**
- 5% + $0.50 per transaction (for transactions under $20)
- Custom pricing for higher volumes
- Lower fees for larger SaaS businesses

**Best for:** SaaS businesses that want simplicity and global tax handling

**Website:** https://paddle.com

---

### Option 3: Chargebee + Payment Gateway

**What it is:** Subscription management platform with payment gateway integrations

**Pros:**
- ✅ Available in Israel
- ✅ Subscription management features
- ✅ Integrates with multiple payment gateways (PayPal, Authorize.net, etc.)
- ✅ Revenue recognition and dunning management
- ✅ Multiple currencies

**Cons:**
- ❌ Requires separate payment gateway (PayPal, etc.)
- ❌ More complex setup
- ❌ Subscription fee ($99-999/month)

**Best for:** Companies that need advanced subscription features

**Website:** https://www.chargebee.com

---

### Option 4: PayPal + Custom Subscription Logic

**What it is:** Use PayPal for payments with custom subscription management

**Pros:**
- ✅ Available in Israel
- ✅ Well-known and trusted
- ✅ No monthly fees
- ✅ PayPal Subscriptions API available

**Cons:**
- ❌ More limited than Stripe
- ❌ Poor developer experience
- ❌ Less modern UI/UX
- ❌ Higher fees (2.9% + $0.30)
- ❌ Limited subscription features

**Best for:** Quick MVP or small-scale operations

---

### Option 5: Lemon Squeezy

**What it is:** Merchant of Record payment processor (similar to Paddle)

**Pros:**
- ✅ Available in Israel
- ✅ Handles taxes globally
- ✅ Good developer API
- ✅ Competitive pricing
- ✅ Modern platform

**Cons:**
- ❌ Newer platform (less mature than Paddle)
- ❌ Revenue share model

**Fees:** 3.5% + $0.30 per transaction (for transactions over $10)

**Website:** https://www.lemonsqueezy.com

---

## 🎯 Recommendation for FigDex

### For MVP / Initial Launch: **Paddle**

**Why:**
1. ✅ Available immediately (no setup delays)
2. ✅ Handles global taxes automatically
3. ✅ Simple integration (similar to Stripe)
4. ✅ Good for subscription SaaS
5. ✅ No company incorporation needed

**Integration Effort:** Similar to Stripe (1-2 days to adapt code)

### For Long-term / Scale: **Stripe Atlas**

**Why:**
1. ✅ Industry standard (best APIs, documentation)
2. ✅ More flexible and customizable
3. ✅ Better for complex scenarios
4. ✅ Can raise funding if needed
5. ✅ Lower fees at scale

**Integration Effort:** Already done (using Stripe SDK)

---

## 📋 Implementation Notes

### If Using Paddle Instead of Stripe:

1. **API Differences:**
   - Paddle uses different endpoints
   - Subscription model is similar but API differs
   - Webhook events are similar but different structure

2. **Code Changes Needed:**
   - Replace `lib/stripe.ts` with `lib/paddle.ts`
   - Update checkout session creation
   - Update webhook handlers
   - Update subscription management

3. **Estimated Effort:** 1-2 days to adapt existing code

### If Using Stripe Atlas:

1. **Setup Process:**
   - Sign up at https://stripe.com/atlas
   - Pay $500 fee
   - Wait 1-2 weeks for incorporation
   - Get Stripe account access
   - No code changes needed!

2. **Total Cost:** $500 one-time + ~$100-200/year

---

## 💰 Cost Comparison

| Provider | Setup Cost | Monthly Fee | Transaction Fee | Tax Handling |
|----------|-----------|-------------|-----------------|--------------|
| **Stripe (via Atlas)** | $500 | $0 | 2.9% + $0.30 | Manual |
| **Paddle** | $0 | $0 | 5% + $0.50* | Automatic |
| **Lemon Squeezy** | $0 | $0 | 3.5% + $0.30 | Automatic |
| **PayPal** | $0 | $0 | 2.9% + $0.30 | Manual |
| **Chargebee** | $0 | $99-999 | Gateway fees | Manual |

*Paddle fees vary by volume and can be negotiated lower for higher volume

---

## 🚀 Next Steps

### Immediate Action (Choose One):

1. **Quick Launch (Recommended):**
   - Choose **Paddle**
   - Adapt payment code (1-2 days)
   - Launch with working payments

2. **Long-term Strategy:**
   - Start with **Paddle** for MVP
   - Set up **Stripe Atlas** in parallel (1-2 weeks)
   - Migrate to Stripe when Atlas is ready
   - Keep Paddle as backup

3. **Budget-Conscious:**
   - Start with **PayPal** for MVP
   - Migrate to Paddle/Stripe later
   - Faster to launch, less ideal UX

---

## 📚 Resources

- **Stripe Atlas:** https://stripe.com/atlas
- **Paddle Documentation:** https://developer.paddle.com
- **Lemon Squeezy Docs:** https://docs.lemonsqueezy.com
- **PayPal Subscriptions:** https://developer.paypal.com/docs/subscriptions

---

**Recommendation:** Start with **Paddle** for immediate launch, optionally set up Stripe Atlas for long-term strategy.

