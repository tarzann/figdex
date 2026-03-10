# בדיקת פרטי משתמש

## משתמש לבדיקה
**Email:** `parkkavi.22@cse.mrt.ac.lk`

## אפשרויות לבדיקה:

### 1. דרך Admin Panel
- נכנס ל-`/admin/users`
- מחפש את האימייל בטבלה
- לוחץ Edit כדי לראות פרטים נוספים

### 2. דרך API Endpoint (חדש)
```bash
GET /api/admin/users/lookup?email=parkkavi.22@cse.mrt.ac.lk
Headers:
  Authorization: Bearer <admin_api_key>
```

התגובה תכיל:
- פרטי משתמש (שם, plan, status)
- Credits info (יתרה, base, reset date)
- Statistics (מספר אינדקסים, jobs)
- Recent jobs
- Auth info (last sign in, email confirmation)

### 3. דרך Supabase SQL Editor

#### Query בסיסי:
```sql
SELECT 
  id,
  email,
  full_name,
  plan,
  is_admin,
  is_active,
  credits_remaining,
  credits_reset_date,
  created_at,
  updated_at,
  last_login,
  provider
FROM users 
WHERE email = 'parkkavi.22@cse.mrt.ac.lk';
```

#### Query מפורט עם סטטיסטיקות:
```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.plan,
  u.is_admin,
  u.is_active,
  u.credits_remaining,
  u.credits_reset_date,
  u.created_at,
  u.updated_at,
  u.last_login,
  u.provider,
  COUNT(DISTINCT if.id) as indices_count,
  COUNT(DISTINCT ij.id) as jobs_count,
  MAX(ij.created_at) as last_job_date
FROM users u
LEFT JOIN index_files if ON if.user_id = u.id
LEFT JOIN index_jobs ij ON ij.user_id = u.id
WHERE u.email = 'parkkavi.22@cse.mrt.ac.lk'
GROUP BY u.id;
```

#### לבדוק auth.users גם:
```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  confirmed_at
FROM auth.users
WHERE email = 'parkkavi.22@cse.mrt.ac.lk';
```

### 4. בדיקה דרך Terminal (אם יש גישה ל-DB)
```bash
# באמצעות psql או Supabase CLI
```

## מה לבדוק:

1. **Registration Details:**
   - מתי נרשם (created_at)
   - Provider (google/email)
   - האם email מאומת (email_confirmed_at)

2. **Activity:**
   - Last login (last_sign_in_at)
   - מספר אינדקסים שנוצרו
   - מספר jobs

3. **Credits:**
   - יתרה נוכחית
   - תאריך איפוס
   - Plan

4. **Security:**
   - האם יש API key
   - Status (active/inactive)

## הערות:
- האימייל נראה כמו כתובת אקדמית מ-Sri Lanka (.ac.lk)
- זה לא Gmail, אז כנראה נרשם דרך Email/Password registration
- כדאי לבדוק אם יש פעילות חשודה או לא תקינה

