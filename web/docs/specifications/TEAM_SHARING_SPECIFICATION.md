# Team Sharing - אפיון מפורט

**גרסה:** 1.0  
**תאריך:** 23 בדצמבר 2025  
**חשיבות:** 🔴 קריטי (עבור Team Plan)  
**זמן הטמעה משוער:** 1-2 חודשים

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [דרישות עסקיות](#דרישות-עסקיות)
3. [דגמי נתונים (Database Schema)](#דגמי-נתונים)
4. [API Endpoints](#api-endpoints)
5. [ממשק משתמש (UI/UX)](#ממשק-משתמש)
6. [הרשאות וביטחון](#הרשאות-וביטחון)
7. [זרימת עבודה](#זרימת-עבודה)
8. [תרחישי שימוש](#תרחישי-שימוש)
9. [תכנון פיתוח](#תכנון-פיתוח)

---

## 🎯 סקירה כללית

### מטרה
לאפשר למשתמשים ליצור צוותים ולשתף אינדקסים עם חברי הצוות תוך בקרת הרשאות מדויקת.

### ערך עסקי
- **קריטי ל-Team Plan** - תכונה הכרחית למכירת תוכניות Team
- **Collaboration** - שיפור שיתוף פעולה בין חברי צוות
- **Scalability** - תמיכה בארגונים גדולים
- **Monetization** - דרייבר מרכזי ל-upgrade ל-Team Plan

### קהל יעד
- ארגונים קטנים ובינוניים
- צוותי עיצוב
- חברות פיתוח
- סוכנויות

---

## 💼 דרישות עסקיות

### דרישות פונקציונליות

1. **יצירת צוותים**
   - משתמש יכול ליצור צוות
   - הגדרת שם ותיאור צוות
   - יוצר הצוות הוא Owner אוטומטי

2. **ניהול חברי צוות**
   - הזמנת משתמשים דרך אימייל
   - קבלה/דחייה של הזמנות
   - הסרת חברים מצוות
   - העברת בעלות (Owner transfer)

3. **רמות הרשאות**
   - **Owner**: בעלים מלא, יכול למחוק צוות, לשנות כל דבר
   - **Admin**: יכול לנהל חברים והרשאות, לא יכול למחוק צוות
   - **Editor**: יכול לערוך אינדקסים, להוסיף/למחוק אינדקסים
   - **Viewer**: יכול רק לצפות, לא יכול לערוך

4. **שיתוף אינדקסים**
   - שיתוף אינדקס קיים עם צוות
   - יצירת אינדקס ישירות לצוות
   - הסרת שיתוף
   - אינדקס יכול להיות משותף למספר צוותים

5. **ניהול הרשאות ברמת אינדקס**
   - לכל אינדקס משותף: הרשאה ספציפית (Editor/Viewer)
   - Override להרשאה הכללית של הצוות

### דרישות לא-פונקציונליות

- **Performance**: תמיכה עד 100 חברים בצוות
- **Security**: אימות מלא של הרשאות בכל פעולה
- **Scalability**: תמיכה עד 50 צוותים למשתמש
- **Audit**: לוג כל פעולות (חיוני לעסק)

---

## 🗄️ דגמי נתונים

### טבלה: `teams`

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'team', -- 'team', 'enterprise'
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT teams_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_created_at ON teams(created_at);
```

### טבלה: `team_members`

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'owner', 'admin', 'editor', 'viewer'
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  
  UNIQUE(team_id, user_id),
  CONSTRAINT team_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  CONSTRAINT team_members_status_check CHECK (status IN ('pending', 'accepted', 'declined'))
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE INDEX idx_team_members_invite_token ON team_members(invite_token);
```

### טבלה: `team_shared_indices`

```sql
CREATE TABLE team_shared_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  index_id UUID NOT NULL REFERENCES index_files(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Override role for this specific index (optional)
  -- If NULL, uses team member's role
  access_role VARCHAR(20), -- 'editor', 'viewer', NULL
  
  UNIQUE(team_id, index_id),
  CONSTRAINT team_shared_indices_role_check CHECK (access_role IS NULL OR access_role IN ('editor', 'viewer'))
);

CREATE INDEX idx_team_shared_indices_team_id ON team_shared_indices(team_id);
CREATE INDEX idx_team_shared_indices_index_id ON team_shared_indices(index_id);
CREATE INDEX idx_team_shared_indices_shared_by ON team_shared_indices(shared_by);
```

### טבלה: `team_invitations` (אופציונלי - אם רוצים היסטוריה מלאה)

```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES users(id),
  invite_token TEXT UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  CONSTRAINT team_invitations_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  CONSTRAINT team_invitations_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(invite_token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
```

### שדות חדשים ב-`index_files` (אם נדרש)

```sql
-- אם נרצה להבדיל בין אינדקס אישי לאינדקס צוות
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX idx_index_files_team_id ON index_files(team_id);
```

---

## 🔌 API Endpoints

### Teams Management

#### `POST /api/teams`
**יצירת צוות חדש**

**Request:**
```json
{
  "name": "Design Team",
  "description": "Our main design team",
  "maxMembers": 10
}
```

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "Design Team",
    "description": "Our main design team",
    "ownerId": "user-uuid",
    "maxMembers": 10,
    "createdAt": "2025-12-23T10:00:00Z"
  }
}
```

#### `GET /api/teams`
**קבלת כל הצוותים של המשתמש**

**Response:**
```json
{
  "success": true,
  "teams": [
    {
      "id": "uuid",
      "name": "Design Team",
      "role": "owner", // role of current user
      "memberCount": 5,
      "indexCount": 12,
      "createdAt": "2025-12-23T10:00:00Z"
    }
  ]
}
```

#### `GET /api/teams/:teamId`
**פרטי צוות ספציפי**

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "Design Team",
    "description": "...",
    "ownerId": "uuid",
    "currentUserRole": "owner",
    "members": [
      {
        "id": "uuid",
        "userId": "uuid",
        "email": "user@example.com",
        "fullName": "John Doe",
        "role": "admin",
        "status": "accepted",
        "joinedAt": "2025-12-23T10:00:00Z"
      }
    ],
    "sharedIndices": [
      {
        "indexId": "uuid",
        "indexName": "Project A",
        "sharedBy": "uuid",
        "sharedAt": "2025-12-23T10:00:00Z",
        "accessRole": "editor"
      }
    ]
  }
}
```

#### `PUT /api/teams/:teamId`
**עדכון פרטי צוות**

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "maxMembers": 20
}
```

**הגבלות:**
- רק Owner או Admin יכולים לעדכן

#### `DELETE /api/teams/:teamId`
**מחיקת צוות**

**הגבלות:**
- רק Owner יכול למחוק
- מחיקה גוררת מחיקת כל ה-members וה-shared indices

---

### Team Members Management

#### `POST /api/teams/:teamId/invite`
**הזמנת חבר חדש לצוות**

**Request:**
```json
{
  "email": "newmember@example.com",
  "role": "editor" // 'admin', 'editor', 'viewer'
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "newmember@example.com",
    "role": "editor",
    "inviteToken": "secure-token",
    "expiresAt": "2025-12-30T10:00:00Z",
    "inviteUrl": "https://www.figdex.com/teams/accept?token=secure-token"
  }
}
```

**תהליך:**
1. בדיקה אם המשתמש קיים (אם כן - הוספה ישירה, אם לא - הזמנה)
2. יצירת invite token (16 תווים)
3. שליחת אימייל עם קישור הזמנה
4. אם המשתמש קיים - הוספה ל-`team_members` עם status='pending'

#### `GET /api/teams/:teamId/invitations`
**קבלת רשימת הזמנות ממתינות**

**Response:**
```json
{
  "success": true,
  "invitations": [
    {
      "id": "uuid",
      "email": "invitee@example.com",
      "role": "editor",
      "invitedBy": "uuid",
      "invitedByName": "John Doe",
      "status": "pending",
      "expiresAt": "2025-12-30T10:00:00Z"
    }
  ]
}
```

#### `POST /api/teams/accept-invitation`
**קבלת הזמנה**

**Request:**
```json
{
  "token": "invite-token"
}
```

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "Design Team"
  },
  "member": {
    "id": "uuid",
    "role": "editor"
  }
}
```

**תהליך:**
1. אימות token ותוקף
2. עדכון `team_members.status` ל-'accepted'
3. עדכון `team_members.joined_at`
4. עדכון `team_invitations.status` ל-'accepted'

#### `POST /api/teams/decline-invitation`
**דחיית הזמנה**

**Request:**
```json
{
  "token": "invite-token"
}
```

#### `PUT /api/teams/:teamId/members/:memberId`
**עדכון תפקיד חבר**

**Request:**
```json
{
  "role": "admin" // 'admin', 'editor', 'viewer'
}
```

**הגבלות:**
- רק Owner או Admin יכולים לשנות תפקידים
- לא ניתן לשנות את תפקיד ה-Owner

#### `DELETE /api/teams/:teamId/members/:memberId`
**הסרת חבר מצוות**

**הגבלות:**
- Owner לא יכול להסיר את עצמו
- Admin לא יכול להסיר Owner או Admin אחר

---

### Team Index Sharing

#### `POST /api/teams/:teamId/share-index`
**שיתוף אינדקס עם צוות**

**Request:**
```json
{
  "indexId": "uuid",
  "accessRole": "editor" // 'editor' או 'viewer', או null (להשתמש ב-team role)
}
```

**Response:**
```json
{
  "success": true,
  "sharedIndex": {
    "id": "uuid",
    "teamId": "uuid",
    "indexId": "uuid",
    "accessRole": "editor",
    "sharedAt": "2025-12-23T10:00:00Z"
  }
}
```

**הגבלות:**
- רק Editor+ יכולים לשתף אינדקסים
- המשתמש חייב להיות בעלים של האינדקס או Admin/Owner של הצוות

#### `DELETE /api/teams/:teamId/share-index/:indexId`
**הסרת שיתוף אינדקס**

**הגבלות:**
- מי ששיתף או Owner/Admin של הצוות

#### `GET /api/teams/:teamId/indices`
**קבלת כל האינדקסים המשותפים לצוות**

**Response:**
```json
{
  "success": true,
  "indices": [
    {
      "indexId": "uuid",
      "indexName": "Project A",
      "sharedBy": "uuid",
      "sharedByName": "John Doe",
      "sharedAt": "2025-12-23T10:00:00Z",
      "accessRole": "editor",
      "effectiveRole": "editor" // role after considering team role and access role
    }
  ]
}
```

---

### Gallery Integration

#### `GET /api/get-indices?teamId=:teamId`
**קבלת אינדקסים של צוות (עם אימות הרשאות)**

**Response:** כמו `GET /api/get-indices` רגיל, אבל עם אינדקסים של הצוות

**הגבלות:**
- רק חברי הצוות יכולים לראות
- מותנה ברמת הרשאה (Editor יכול לראות/לערוך, Viewer רק לראות)

---

## 🎨 ממשק משתמש

### דף Teams Management (`/teams`)

#### רשימת צוותים
- **Cards/List** של כל הצוותים שהמשתמש חבר בהם
- **מידע בכל card:**
  - שם הצוות
  - תפקיד המשתמש (Owner/Admin/Editor/Viewer)
  - מספר חברים
  - מספר אינדקסים משותפים
  - כפתור "Enter Team"

#### יצירת צוות חדש
- **Dialog/Modal:**
  - שם צוות (required)
  - תיאור (optional)
  - מספר מקסימלי של חברים (default: 10)
  - כפתור "Create Team"

---

### דף Team Details (`/teams/[teamId]`)

#### Tabs:
1. **Overview** - סקירה כללית
2. **Members** - ניהול חברים
3. **Indices** - אינדקסים משותפים
4. **Settings** - הגדרות (רק Owner/Admin)

#### Tab: Overview
- **מידע כללי:**
  - שם ותיאור צוות
  - Owner
  - מספר חברים / מקסימלי
  - מספר אינדקסים
  - תאריך יצירה

- **סטטיסטיקות:**
  - פעילות אחרונה
  - אינדקסים שנוספו השבוע
  - חברים חדשים

#### Tab: Members
- **רשימת חברים:**
  - שם, אימייל
  - תפקיד (Badge: Owner/Admin/Editor/Viewer)
  - סטטוס (Accepted/Pending)
  - תאריך הצטרפות
  - פעולות: Change Role, Remove (בהתאם להרשאות)

- **הזמנת חברים:**
  - Input: אימייל
  - Select: תפקיד (Admin/Editor/Viewer)
  - כפתור "Invite"
  - רשימת הזמנות ממתינות

#### Tab: Indices
- **רשימת אינדקסים משותפים:**
  - שם אינדקס
  - מי שתף
  - תאריך שיתוף
  - הרשאה (Editor/Viewer)
  - פעולות: View, Unshare (בהתאם להרשאות)

- **שיתוף אינדקס חדש:**
  - Select/Dropdown: בחר אינדקס מהאינדקסים שלי
  - Select: הרשאה (Editor/Viewer/Use Team Role)
  - כפתור "Share"

#### Tab: Settings (רק Owner/Admin)
- **עדכון פרטי צוות:**
  - שם
  - תיאור
  - מספר מקסימלי של חברים

- **פעולות מסוכנות:**
  - Transfer Ownership (רק Owner)
  - Delete Team (רק Owner, עם confirmation)

---

### שינויים ב-Gallery

#### Sidebar - Team Selector
- **Dropdown/Tabs:**
  - "My Indices" (ברירת מחדל)
  - "Team: Design Team"
  - "Team: Marketing Team"
  - וכו'

#### Index Card Actions
- **Share Button:**
  - Menu עם אופציות:
    - Share with Team → Select team → Select role
    - Create Public Share Link (קיים)

#### Team Context Indicator
- **Banner/Badge** בראש הגלריה כשצופים באינדקסי צוות:
  - "Viewing: Team Design Team"
  - תפקיד המשתמש: "Editor"

---

## 🔒 הרשאות וביטחון

### Permission Matrix

| פעולה | Owner | Admin | Editor | Viewer |
|-------|-------|-------|--------|--------|
| עריכת פרטי צוות | ✅ | ✅ | ❌ | ❌ |
| מחיקת צוות | ✅ | ❌ | ❌ | ❌ |
| הזמנת חברים | ✅ | ✅ | ❌ | ❌ |
| הסרת חברים | ✅ | ✅ | ❌ | ❌ |
| שינוי תפקידים | ✅ | ✅ | ❌ | ❌ |
| העברת בעלות | ✅ | ❌ | ❌ | ❌ |
| שיתוף אינדקס | ✅ | ✅ | ✅ | ❌ |
| הסרת שיתוף אינדקס | ✅ | ✅ | ✅* | ❌ |
| צפייה באינדקסים | ✅ | ✅ | ✅ | ✅ |
| עריכת אינדקסים | ✅ | ✅ | ✅ | ❌ |
| מחיקת אינדקסים | ✅ | ✅ | ✅* | ❌ |

*רק אם הם שיתפו את האינדקס או Owner/Admin

### Security Rules

1. **Row Level Security (RLS) ב-Supabase:**
   ```sql
   -- Users can only see teams they're members of
   CREATE POLICY "Users can view their teams"
   ON teams FOR SELECT
   USING (
     id IN (
       SELECT team_id FROM team_members 
       WHERE user_id = auth.uid() AND status = 'accepted'
     )
   );

   -- Users can only see team members of their teams
   CREATE POLICY "Users can view team members"
   ON team_members FOR SELECT
   USING (
     team_id IN (
       SELECT team_id FROM team_members 
       WHERE user_id = auth.uid() AND status = 'accepted'
     )
   );
   ```

2. **API Middleware:**
   - כל endpoint צריך לבדוק הרשאות
   - Helper function: `checkTeamPermission(userId, teamId, requiredRole)`

3. **Audit Logging:**
   - כל פעולה חשובה נשמרת ב-`audit_logs`:
     - יצירת/מחיקת צוות
     - הזמנת/הסרת חברים
     - שינוי תפקידים
     - שיתוף/הסרת אינדקסים

---

## 🔄 זרימת עבודה

### יצירת צוות והזמנת חברים

```
1. משתמש יוצר צוות
   ↓
2. Owner מוגדר אוטומטי
   ↓
3. Owner מזמין חברים דרך אימייל
   ↓
4. אימייל נשלח עם קישור הזמנה
   ↓
5a. אם המשתמש רשום:
     → קישור מוביל לדף קבלת הזמנה
     → המשתמש מקבל/דוחה
   ↓
5b. אם המשתמש לא רשום:
     → קישור מוביל להרשמה
     → אחרי הרשמה - הצטרפות אוטומטית
   ↓
6. חבר חדש מתווסף לצוות
```

### שיתוף אינדקס עם צוות

```
1. משתמש (Editor+) בוחר אינדקס
   ↓
2. לוחץ "Share with Team"
   ↓
3. בוחר צוות מהרשימה
   ↓
4. בוחר הרשאה (Editor/Viewer/Use Team Role)
   ↓
5. שיתוף נשמר ב-DB
   ↓
6. כל חברי הצוות יכולים לראות את האינדקס
   (בהתאם להרשאות)
```

---

## 📝 תרחישי שימוש

### תרחיש 1: צוות עיצוב קטן
**משתתפים:**
- Sarah (Owner) - מנהלת עיצוב
- John (Editor) - מעצב
- Mike (Viewer) - מנהל מוצר

**תהליך:**
1. Sarah יוצרת צוות "Design Team"
2. Sarah מזמינה את John כ-Editor ואת Mike כ-Viewer
3. Sarah משתפת 5 אינדקסים עם הצוות
4. John יכול לערוך את האינדקסים, Mike רק לצפות
5. John מוסיף אינדקס חדש ומשתף עם הצוות

### תרחיש 2: ארגון גדול
**משתתפים:**
- CEO (Owner) - בעלים
- Design Manager (Admin) - מנהל
- 10 Designers (Editors)
- 5 Stakeholders (Viewers)

**תהליך:**
1. CEO יוצר צוות "Company Design System"
2. Design Manager מזמין את כל המעצבים כ-Editors
3. Design Manager משתף אינדקסים קריטיים
4. כל המעצבים יכולים לערוך ולהוסיף אינדקסים
5. Stakeholders יכולים רק לצפות

### תרחיש 3: שיתוף זמני
**משתתפים:**
- Designer (Owner) - מעצב
- Client (Viewer) - לקוח

**תהליך:**
1. Designer יוצר צוות "Client: Project X"
2. מזמין את הלקוח כ-Viewer
3. משתף רק אינדקסים רלוונטיים
4. אחרי סיום הפרויקט - מוחק את הצוות או מסיר את הלקוח

---

## 🛠️ תכנון פיתוח

### שלב 1: Foundation (1-2 שבועות)
- [ ] Database schema & migrations
- [ ] RLS policies
- [ ] Basic API endpoints (create/get teams)
- [ ] Helper functions (permission checks)

### שלב 2: Members Management (1-2 שבועות)
- [ ] Invite system (email + tokens)
- [ ] Accept/decline invitations
- [ ] Member role management
- [ ] Remove members

### שלב 3: Index Sharing (1 שבוע)
- [ ] Share index with team API
- [ ] Unshare index API
- [ ] Get team indices API
- [ ] Permission checks for indices

### שלב 4: UI - Teams Management (1-2 שבועות)
- [ ] Teams list page
- [ ] Create team dialog
- [ ] Team details page (tabs)
- [ ] Members management UI

### שלב 5: UI - Gallery Integration (1 שבוע)
- [ ] Team selector in gallery
- [ ] Share with team dialog
- [ ] Team context indicators
- [ ] Filter by team

### שלב 6: Email Templates (3-5 ימים)
- [ ] Team invitation email
- [ ] Welcome to team email
- [ ] Role changed notification

### שלב 7: Testing & Polish (1 שבוע)
- [ ] Unit tests
- [ ] Integration tests
- [ ] UI/UX polish
- [ ] Documentation

### שלב 8: Advanced Features (אופציונלי)
- [ ] Bulk operations
- [ ] Team templates
- [ ] Activity feed
- [ ] Analytics per team

---

## 📊 Metrics & Analytics

### Metrics לעקוב אחרי:

1. **Adoption:**
   - מספר צוותים שנוצרו
   - מספר חברים ממוצע לצוות
   - % ממשתמשי Team Plan שמשתמשים בתכונה

2. **Engagement:**
   - מספר אינדקסים ממוצע משותפים לצוות
   - פעילות חברים (מספר פעולות/חבר/שבוע)

3. **Business:**
   - Conversion rate: Free → Team Plan אחרי שימוש בצוותים
   - Retention: משתמשי Team Plan עם צוותים נשארים יותר?

---

## 🚨 Edge Cases & Considerations

### Edge Cases:
1. **משתמש מוזמן למספר צוותים** - OK, יכול להיות חבר במספר צוותים
2. **אינדקס משותף למספר צוותים** - OK, `team_shared_indices` תומך בזה
3. **Owner עוזב** - צריך Transfer Ownership לפני
4. **צוות בלי חברים** - Owner תמיד חבר, אז לא יכול להיות
5. **הגבלת גודל צוות** - לבדוק `max_members` לפני הזמנות

### Considerations:
1. **Performance:** Query optimization לבדיקת הרשאות
2. **Caching:** Cache של team members per team
3. **Notifications:** התראות על פעולות חשובות (email + in-app)
4. **Migration:** מה עם אינדקסים קיימים? נשארים אישיים עד לשיתוף ידני

---

## 📚 API Examples

### Create Team
```bash
POST /api/teams
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "name": "Design Team",
  "description": "Our main design team",
  "maxMembers": 10
}
```

### Invite Member
```bash
POST /api/teams/{teamId}/invite
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "editor"
}
```

### Share Index
```bash
POST /api/teams/{teamId}/share-index
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "indexId": "index-uuid",
  "accessRole": "editor"
}
```

---

## ✅ Checklist לפני Launch

- [ ] Database schema deployed
- [ ] RLS policies active
- [ ] All API endpoints tested
- [ ] UI complete and tested
- [ ] Email templates ready
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance tested (up to 100 members)
- [ ] Edge cases handled
- [ ] Analytics tracking in place

---

**מסמך זה עודכן:** 23 בדצמבר 2025  
**גרסה:** 1.0  
**בעלים:** Development Team

