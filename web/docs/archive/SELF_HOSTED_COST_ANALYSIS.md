# ניתוח עלויות - שרת פרטי (Self-Hosted)
## Self-Hosted Server Cost Analysis

**תאריך:** 11 בדצמבר 2025  
**מטרה:** השוואת עלויות שרת פרטי לעומת Vercel + Supabase  
**הנחות:** 5-10 משתמשי Pro, שימוש ממוצע

---

## 📊 עומס צפוי (5 משתמשי Pro)

### לפי הגבלות חודשיות:
- **אינדקסים:** 300 × 5 = 1,500 אינדקסים/חודש
- **פריימים:** 30,000 × 5 = 150,000 פריימים/חודש
- **Storage:** 15GB × 5 = 75GB
- **Bandwidth:** 15GB × 5 = 75GB/חודש uploads + downloads
- **Database:** ~1.9GB (375MB × 5)
- **API requests:** ~937,500 requests/חודש

---

## 💰 אופציות שרת פרטי

### אופציה 1: AWS EC2 + RDS + S3

#### 1. Compute (EC2)
**צרכים:**
- Serverless functions → EC2 instances או Lambda
- Memory: 2GB minimum
- CPU: 2 vCPU מומלץ
- Traffic: ~1,500 אינדקסים/חודש = ~50/יום = 2-3 concurrently

**מומלץ:**
- **t3.medium** (2 vCPU, 4GB RAM)
  - On-Demand: $0.0416/hour = **$30.38/חודש**
  - Reserved (1 year): **$18.20/חודש**
  - Reserved (3 years): **$12.60/חודש**

**או Serverless:**
- **AWS Lambda:** $0.20 per 1M requests + $0.0000166667 per GB-second
  - ~150,000 invocations/חודש
  - ~125 GB-hours/חודש
  - **עלות:** ~$2.50/חודש (בסיס) + $2.08 GB-hours = **~$4.58/חודש**

#### 2. Database (RDS PostgreSQL)
**צרכים:**
- Storage: ~2GB
- I/O: ~937,500 requests/חודש
- Backup: אוטומטי

**מומלץ:**
- **db.t3.micro** (2 vCPU, 1GB RAM, 20GB storage)
  - On-Demand: $0.017/hour = **$12.41/חודש**
  - Storage: $0.115/GB = $2.30/חודש
  - **סה"כ:** **~$15/חודש**

#### 3. Storage (S3)
**צרכים:**
- Storage: 75GB
- Uploads: 75GB/חודש
- Downloads: ~150GB/חודש (2× uploads)
- Requests: ~937,500 PUT + 1,875,000 GET

**חישוב:**
- Storage: 75GB × $0.023 = **$1.73/חודש**
- PUT requests: 937,500 × $0.005/1,000 = **$4.69/חודש**
- GET requests: 1,875,000 × $0.0004/1,000 = **$0.75/חודש**
- Data transfer out: 150GB × $0.09/GB = **$13.50/חודש** (היחוץ הראשונים)
- **סה"כ:** **~$20.67/חודש**

#### 4. CDN (CloudFront)
**צרכים:**
- Bandwidth: ~150GB/חודש
- Requests: ~1,875,000

**חישוב:**
- Data transfer: 150GB × $0.085/GB = **$12.75/חודש**
- Requests: ~$0.50/חודש
- **סה"כ:** **~$13.25/חודש**

#### 5. Load Balancer
- **Application Load Balancer:** $0.0225/hour = **$16.42/חודש**

#### 6. Domain & SSL
- **Route 53:** ~$0.50/חודש
- **ACM (SSL):** חינם

**סה"כ AWS (On-Demand):**
- EC2: $30.38
- RDS: $15.00
- S3: $20.67
- CloudFront: $13.25
- Load Balancer: $16.42
- DNS: $0.50
- **סה"כ:** **~$96.22/חודש**

**עם Reserved Instances (1 year):**
- EC2: $18.20
- RDS: $15.00
- S3: $20.67
- CloudFront: $13.25
- Load Balancer: $16.42
- DNS: $0.50
- **סה"כ:** **~$84.04/חודש**

---

### אופציה 2: DigitalOcean

#### 1. Compute (Droplet)
**מומלץ:**
- **Droplet: 4GB RAM, 2 vCPU** = **$24/חודש**
- או **Droplet: 8GB RAM, 4 vCPU** = **$48/חודש** (לגדילה)

#### 2. Database (Managed PostgreSQL)
- **Basic plan:** 1GB RAM, 10GB storage = **$15/חודש**
- או **Standard plan:** 2GB RAM, 25GB storage = **$35/חודש**

#### 3. Storage (Spaces)
- **Storage:** 75GB × $0.02/GB = **$1.50/חודש**
- **Bandwidth:** 250GB included, אחרי זה $0.01/GB
- **סה"כ:** **~$1.50/חודש**

#### 4. CDN
- כלול ב-Spaces (אין עלות נוספת)

**סה"כ DigitalOcean (Basic):**
- Droplet: $24
- Database: $15
- Storage: $1.50
- **סה"כ:** **~$40.50/חודש**

**DigitalOcean (Standard):**
- Droplet: $48
- Database: $35
- Storage: $1.50
- **סה"כ:** **~$84.50/חודש**

---

### אופציה 3: Google Cloud Platform (GCP)

#### 1. Compute (Cloud Run או Compute Engine)
**Cloud Run (Serverless):**
- Similar ל-Lambda
- **~$5-10/חודש**

**Compute Engine:**
- **e2-medium** (2 vCPU, 4GB) = **~$30/חודש**

#### 2. Database (Cloud SQL)
- **db-f1-micro** (Shared CPU, 0.6GB RAM, 10GB) = **~$12/חודש**
- **db-g1-small** (1 vCPU, 1.7GB RAM, 10GB) = **~$30/חודש**

#### 3. Storage (Cloud Storage)
- Storage: 75GB × $0.020/GB = **$1.50/חודש**
- Operations: minimal
- Bandwidth: $0.12/GB (outbound)
- **סה"כ:** **~$10-15/חודש**

#### 4. CDN (Cloud CDN)
- **~$10-15/חודש**

**סה"כ GCP:**
- Compute: $30
- Database: $12
- Storage: $12
- CDN: $12
- **סה"כ:** **~$66/חודש**

---

### אופציה 4: Hetzner (זול ביותר)

#### 1. Compute
- **CPX21:** 3 vCPU, 4GB RAM, 80GB SSD = **~$6/חודש** (€5.83)
- **CPX31:** 4 vCPU, 8GB RAM, 160GB SSD = **~$12/חודש** (€11.71)

#### 2. Database (Managed PostgreSQL)
- **Small:** 2GB RAM, 10GB storage = **~$13/חודש** (€11.99)
- **Medium:** 4GB RAM, 25GB storage = **~$24/חודש** (€21.99)

#### 3. Storage (Object Storage)
- **Storage:** 75GB × €0.023/GB = **~$2/חודש**
- **Bandwidth:** 1TB included

#### 4. CDN
- כלול (אין עלות נוספת)

**סה"כ Hetzner (Small):**
- Compute: $6
- Database: $13
- Storage: $2
- **סה"כ:** **~$21/חודש** 💰

**Hetzner (Medium):**
- Compute: $12
- Database: $24
- Storage: $2
- **סה"כ:** **~$38/חודש**

---

### אופציה 5: VPS זול (Hetzner/OVH)

#### Setup מלא:
- **VPS:** $5-10/חודש (4GB RAM, 2 vCPU)
- **PostgreSQL:** Self-hosted (באותו VPS)
- **Storage:** S3-compatible (Wasabi או Backblaze B2)
  - Wasabi: $5.99/TB = **~$0.45/חודש**
  - Backblaze B2: $5/TB storage + $10/TB download = **~$0.75 + $1.50 = $2.25/חודש**
- **CDN:** Cloudflare (חינם)

**סה"כ VPS זול:**
- VPS: $8
- Storage: $2
- **סה"כ:** **~$10/חודש** ⚡ (אבל דורש תחזוקה מלאה)

---

## 📊 השוואת עלויות

| ספק | Compute | Database | Storage | CDN | סה"כ | הערות |
|-----|---------|----------|---------|-----|------|-------|
| **Vercel + Supabase** | $20 | $25 | כלול | כלול | **$45** | Serverless, ניהול מלא |
| **AWS (On-Demand)** | $30 | $15 | $21 | $13 | **~$96** | Enterprise-grade |
| **AWS (Reserved)** | $18 | $15 | $21 | $13 | **~$84** | עם התחייבות שנה |
| **DigitalOcean Basic** | $24 | $15 | $2 | כלול | **~$41** | פשוט וידידותי |
| **DigitalOcean Standard** | $48 | $35 | $2 | כלול | **~$85** | לגדילה |
| **GCP** | $30 | $12 | $12 | $12 | **~$66** | Google infrastructure |
| **Hetzner Small** | $6 | $13 | $2 | כלול | **~$21** | ⚡ הכי זול |
| **Hetzner Medium** | $12 | $24 | $2 | כלול | **~$38** | ⚡ טוב לגדילה |
| **VPS Self-Hosted** | $8 | כלול | $2 | חינם | **~$10** | ⚡⚡ זול ביותר, דורש תחזוקה |

---

## ⚖️ השוואה מפורטת

### Vercel + Supabase ($45/חודש)
**יתרונות:**
- ✅ Serverless - scaling אוטומטי
- ✅ ניהול מלא - אין תחזוקה
- ✅ CDN מובנה
- ✅ Backup אוטומטי
- ✅ Monitoring מובנה
- ✅ Security updates אוטומטיים

**חסרונות:**
- ❌ יקר יחסית
- ❌ Vendor lock-in
- ❌ פחות שליטה

---

### AWS ($84-96/חודש)
**יתרונות:**
- ✅ Enterprise-grade
- ✅ Scaling גבוה
- ✅ כלים מתקדמים
- ✅ Reliability גבוה

**חסרונות:**
- ❌ יקר
- ❌ מורכב
- ❌ דורש מומחיות

---

### DigitalOcean ($41-85/חודש)
**יתרונות:**
- ✅ פשוט וידידותי
- ✅ מחירים ברורים
- ✅ תיעוד מצוין
- ✅ Good balance

**חסרונות:**
- ⚠️ יקר יותר מ-Hetzner
- ⚠️ פחות features מ-AWS

---

### Hetzner ($21-38/חודש)
**יתרונות:**
- ✅ ⚡ זול מאוד
- ✅ Performance טוב
- ✅ Bandwidth חינם
- ✅ European servers (GDPR)

**חסרונות:**
- ⚠️ פחות features מ-AWS
- ⚠️ פחות support
- ⚠️ לא serverless

---

### VPS Self-Hosted ($10/חודש)
**יתרונות:**
- ✅ ⚡⚡ זול ביותר
- ✅ שליטה מלאה
- ✅ אין vendor lock-in

**חסרונות:**
- ❌ דורש תחזוקה מלאה
- ❌ Security on you
- ❌ Backup on you
- ❌ Monitoring on you
- ❌ Scaling manual

---

## 💡 המלצות

### לפי מספר משתמשים:

#### עד 10 משתמשי Pro:
- **מומלץ:** **Vercel + Supabase** ($45/חודש)
  - ניהול מלא, serverless, אין תחזוקה
  - רווח: $75 - $45 = **$30/חודש**

#### 10-20 משתמשי Pro:
- **מומלץ:** **Hetzner Medium** ($38/חודש)
  - זול, performance טוב
  - רווח: $150-300 - $38 = **$112-262/חודש**

#### 20-50 משתמשי Pro:
- **מומלץ:** **DigitalOcean Standard** ($85/חודש)
  - מאוזן בין מחיר ותכונות
  - רווח: $300-750 - $85 = **$215-665/חודש**

#### 50+ משתמשי Pro:
- **מומלץ:** **AWS (Reserved)** ($84/חודש + scaling)
  - Enterprise-grade, scaling גבוה
  - רווח: $750+ - עלויות = משתנה

---

## 🔄 עלויות נוספות (Self-Hosted)

### 1. תחזוקה וניהול
- **זמן תחזוקה:** 5-10 שעות/חודש
- **עלות:** $50-100/שעה × 5-10 = **$250-1,000/חודש**
- **או:** DevOps Engineer = **$5,000-10,000/חודש**

### 2. Backup & Monitoring
- **Backup:** $5-20/חודש
- **Monitoring (Datadog/New Relic):** $15-50/חודש
- **סה"כ:** **$20-70/חודש**

### 3. Security
- **SSL:** חינם (Let's Encrypt)
- **Firewall:** כלול
- **Security scans:** $10-30/חודש

### 4. Scaling
- **Auto-scaling:** דורש תצורה נוספת
- **Load balancing:** $10-20/חודש

**סה"כ עלויות נוספות:**
- **עם DevOps:** $250-1,000/חודש תחזוקה
- **ללא DevOps:** זמן שלך = "עלות הזדמנות"

---

## 📈 נקודת שוויון

### מתי כדאי לעבור ל-Self-Hosted?

**נקודת שוויון כלכלית:**
- Vercel + Supabase: $45/חודש
- Hetzner: $21-38/חודש
- **חיסכון:** $7-24/חודש

**אבל:**
- תחזוקה: $250-1,000/חודש (זמן)
- **נקודת שוויון:** 10-140 משתמשי Pro (תלוי בערך הזמן שלך)

**מסקנה:**
- ✅ **עד 50 משתמשים:** Vercel + Supabase כדאי יותר
- ✅ **50-100 משתמשים:** Self-Hosted מתחיל להיות כדאי (אם יש DevOps)
- ✅ **100+ משתמשים:** Self-Hosted כנראה כדאי

---

## 🎯 המלצה סופית

### למיקרו-סטארטאפ (עד 20 משתמשים):
**הישאר עם Vercel + Supabase** ($45/חודש)
- ✅ Focus על product, לא על infrastructure
- ✅ Serverless scaling אוטומטי
- ✅ אין תחזוקה
- ✅ רווח נקי: $255 - $45 = **$210/חודש** (20 משתמשים)

### לסטארטאפ (20-100 משתמשים):
**שקול Hetzner** ($38/חודש)
- ✅ חיסכון של $7/חודש
- ✅ Performance טוב
- ⚠️ דורש תחזוקה (5-10 שעות/חודש)
- **חשוב:** רק אם יש DevOps או זמן לתחזוקה

### לסטארטאפ גדול (100+ משתמשים):
**AWS או DigitalOcean** ($84-96/חודש)
- ✅ Enterprise-grade
- ✅ Scaling גבוה
- ✅ Team DevOps מקצועי
- ✅ רווח: $1,500+ - $84 = **$1,416+/חודש**

---

## ✅ סיכום

| אופציה | עלות/חודש | תחזוקה | מומלץ ל |
|--------|-----------|--------|---------|
| **Vercel + Supabase** | $45 | אין | עד 50 משתמשים |
| **Hetzner** | $21-38 | בינונית | 50-100 משתמשים |
| **DigitalOcean** | $41-85 | בינונית | 100-200 משתמשים |
| **AWS** | $84-96 | גבוהה | 200+ משתמשים |
| **VPS Self-Hosted** | $10 | גבוהה מאוד | מי שיש לו זמן |

**המלצה אישית:**
עבור 5-10 משתמשי Pro, **הישאר עם Vercel + Supabase**. 
החיסכון של $7-24/חודש לא שווה את הזמן והסיכון של תחזוקת שרתים.

---

**מסמך זה עודכן:** 11 בדצמבר 2025  
**גרסה:** 1.0

