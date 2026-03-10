# Supabase Security Setup – תיעוד מלא

תיעוד כל השינויים והתיקונים שבוצעו ב-Supabase כדי לסגור את האזהרות והשגיאות של Security Advisor.

**תאריך:** פברואר 2026  
**סטטוס:** הושלם  

---

## סיכום מנהלים

| קטגוריה | סטטוס | הערות |
|---------|--------|--------|
| RLS על כל הטבלאות | ✅ | 13 טבלאות |
| Policies לכל הטבלאות | ✅ | service_role / authenticated |
| Function search_path | ✅ | 9 פונקציות |
| OTP expiry | ✅ | הופחת לשעה |
| PostgreSQL | ✅ | עודכן |
| Leaked password protection | ⏳ | דורש Pro plan |

---

## 1. קבצי Migration שנוצרו

### `enable_rls_on_all_public_tables.sql`

**מטרה:** תיקון שגיאות **rls_disabled_in_public** – הפעלת RLS על טבלאות בלי RLS.

**טבלאות:**  
13 טבלאות: `credit_pricing`, `daily_index_count`, `index_jobs`, `users`, `user_addons`, `addon_packages`, `index_files`, `index_archives`, `shared_views`, `credits_packages`, `admin_notification_preferences`, `telemetry_events`, `claim_tokens`

**הרצה:**  
Supabase Dashboard → Database → SQL Editor → הדבק והרץ.

---

### `fix_supabase_warnings.sql`

**מטרה:** תיקון שגיאות **function_search_path_mutable** ו-**rls_policy_always_true** / **auth_allow_anonymous_sign_ins**.

**חלק 1 – Function search_path:**
- `update_shared_views_updated_at()`
- `update_credit_pricing_updated_at()`
- `update_updated_at_column()`
- `update_user_addons_updated_at()`
- `update_admin_notification_preferences_updated_at()`
- `update_credits_packages_updated_at()`
- `update_daily_index_count_updated_at()`
- `increment_daily_index_count(UUID, DATE)`
- `update_addon_packages_updated_at()`

**חלק 2 – RLS policies:**
החלפת `USING (true)` ב־`TO service_role` כדי למנוע גישה ל-anonymous.
טבלאות: `credits_transactions`, `invoices`, `payment_methods`, `projects`, `saved_connections`, `saved_indices`, `stripe_customers`, `subscription_items`, `subscriptions`

**הרצה:**  
Supabase Dashboard → Database → SQL Editor → הדבק והרץ.

---

### `add_rls_policies_for_tables_without_policies.sql`

**מטרה:** תיקון **rls_enabled_no_policy** – הוספת policies לטבלאות עם RLS ללא policies.

**טבלאות backend-only (service_role):**  
`addon_packages`, `admin_notification_preferences`, `claim_tokens`, `credit_pricing`, `credits_packages`, `daily_index_count`, `index_archives`, `index_files`, `index_jobs`, `shared_views`, `telemetry_events`, `user_addons`

**טבלת users:**
- `Users can view own data` – SELECT TO authenticated WHERE auth.uid() = id
- `Users can update own data` – UPDATE TO authenticated WHERE auth.uid() = id
- `Service role can manage users` – FOR ALL TO service_role

**הרצה:**  
Supabase Dashboard → Database → SQL Editor → הדבק והרץ.

---

## 2. שינויים ב-Dashboard (ידני)

### Auth OTP Expiry

**תיקון:** auth_otp_long_expiry  

**מקום:** Authentication → Providers → Email  
**שדה:** Email OTP Expiration  
**מצב קודם:** 86400 שניות (24 שעות)  
**מצב חדש:** 3600 או 1800 (שעה או 30 דקות)

---

### Leaked Password Protection

**תיקון:** auth_leaked_password_protection  

**מקום:** Authentication → Providers → Email  
**הגדרה:** Prevent use of leaked passwords  

**הערה:** זמין רק ב-Pro plan. ב-Free plan האזהרה נשארת.

---

### PostgreSQL Upgrade

**תיקון:** vulnerable_postgres_version  

**מקום:** Project Settings → Infrastructure  
**פעולה:** Upgrade לפרויקט את גרסת PostgreSQL  

**הערה:** תהליך השדרוג יכול לקחת כשעה.

---

## 3. מדיניות גישה (RLS)

### עקרון

- **service_role:** גישה מלאה דרך ה-API (backend).
- **authenticated:** גישה מוגבלת רק לטבלאות עם policies מותאמים (למשל `users`).
- **anon:** אין גישה ישירה לטבלאות (הגישה רק דרך ה-API/service_role).

### שימוש ב־TO service_role

במקום `USING (true)` משתמשים ב־`TO service_role` כדי שה-policy יחול רק על ה-service role:

```sql
CREATE POLICY "Service role can manage table_name" ON public.table_name
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## 4. מעקב אחרי CPU וביצועים

### מיקום

- **Performance Advisor:** Database → Performance Advisor  
- **Query Performance:** Database → Query Performance  
- **CPU usage:** Database → Reports  

### עומס

- רוב העומס מגיע מהמערכת (Dashboard, migrations, backups).
- שאילתות פנימיות של Supabase מופיעות ב-Query Performance.
- אם אין שאילתות מהאפליקציה ברשימה – העומס לא מגיע מהקוד.

---

## 5. סדר הרצה לפרויקט חדש

```text
1. enable_rls_on_all_public_tables.sql
2. fix_supabase_warnings.sql
3. add_rls_policies_for_tables_without_policies.sql
   (אם יש טבלאות עם RLS ללא policies)
```

---

## 6. קישורים שימושיים

- [RLS Disabled in Public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Function Search Path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Permissive RLS Policy](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)
- [Auth OTP Expiry](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [PostgreSQL Upgrading](https://supabase.com/docs/guides/platform/upgrading)

---

## 7. היסטוריית שינויים

| תאריך | שינוי |
|-------|--------|
| פברואר 2026 | הוספת RLS, policies, תיקון search_path, OTP, PostgreSQL |
| פברואר 2026 | הוספת תיעוד מלא |
