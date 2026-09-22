# Faculty Appraisal System — Deployment & Configuration Guide

> **Audience:** College IT Team / System Administrator deploying this system independently.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Environment Configuration (`.env` files)](#3-environment-configuration)
4. [Database Setup (MySQL)](#4-database-setup)
5. [Email Service Setup (SMTP)](#5-email-service-setup--smtp)
6. [JWT Authentication](#6-jwt-authentication)
7. [College SSO Integration (Optional)](#7-college-sso-integration-optional)
8. [Initial User Seeding](#8-initial-user-seeding)
9. [File Uploads](#9-file-uploads)
10. [Build & Run](#10-build--run)
11. [Production Deployment Checklist](#11-production-deployment-checklist)

---

## 1. Prerequisites

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | v18+ | Backend & frontend build |
| **npm** | v9+ | Package management |
| **MySQL** | 8.0+ | Database |
| **Git** | Any | Cloning the repository |

Optional (for production):
- **Nginx** or **Apache** — reverse proxy for serving frontend + API
- **PM2** — Node.js process manager for keeping the backend alive
- **SSL Certificate** — for HTTPS (Let's Encrypt recommended)

---

## 2. Project Structure

```
faculty_appraisal_system/
├── .env                    ← Frontend environment variables
├── package.json            ← Frontend (Vite + React)
├── src/                    ← Frontend source code
├── dist/                   ← Production build output (after `npm run build`)
│
├── backend/
│   ├── .env                ← MAIN BACKEND CONFIG — all secrets go here
│   ├── package.json        ← Backend (Express + MySQL)
│   ├── server.js           ← Entry point
│   ├── config/database.js  ← MySQL connection pool
│   ├── controllers/        ← API logic
│   ├── routes/             ← API route definitions
│   ├── services/
│   │   ├── emailService.js ← Email sending (Nodemailer)
│   │   └── schedulerService.js ← Cron jobs (deadline reminders, form releases)
│   ├── middleware/          ← JWT auth middleware
│   ├── database/            ← Auto-migration / table bootstrap on startup
│   ├── scripts/             ← One-time setup & seed scripts
│   └── uploads/             ← Uploaded evidence files
```

---

## 3. Environment Configuration

You need to configure **two** `.env` files. Create them from the templates below.

### 3a. Backend `.env` — `backend/.env`

```env
# ──────────────────────────────────────────────
# SERVER
# ──────────────────────────────────────────────
PORT=5001
NODE_ENV=production

# ──────────────────────────────────────────────
# DATABASE (MySQL)
# ──────────────────────────────────────────────
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=faculty_appraisal
DB_PORT=3306

# ──────────────────────────────────────────────
# FILE UPLOADS
# ──────────────────────────────────────────────
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# ──────────────────────────────────────────────
# JWT AUTHENTICATION
# ──────────────────────────────────────────────
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_STRING_64_CHARS_MIN
JWT_EXPIRES_IN=7d

# ──────────────────────────────────────────────
# EMAIL (SMTP) — See Section 5 for setup guide
# ──────────────────────────────────────────────
EMAIL_HOST=smtp.your-college.ac.in
EMAIL_PORT=587
EMAIL_USER=appraisal@your-college.ac.in
EMAIL_PASS=your_email_password_or_app_password
EMAIL_FROM=Faculty Appraisal System <appraisal@your-college.ac.in>
DOFA_EMAIL=dofa@your-college.ac.in

# ──────────────────────────────────────────────
# FRONTEND URL (used in email links)
# ──────────────────────────────────────────────
FRONTEND_URL=https://appraisal.your-college.ac.in

# ──────────────────────────────────────────────
# COLLEGE SSO (Optional — see Section 7)
# ──────────────────────────────────────────────
COLLEGE_API_URL=
COLLEGE_API_SECRET=
```

### 3b. Frontend `.env` — Root `.env`

```env
# Points the React frontend to the backend API
VITE_API_URL=https://appraisal.your-college.ac.in/api
```

> **⚠️ IMPORTANT:** Never commit `.env` files to Git. Both are already in `.gitignore`.

---

## 4. Database Setup

### Step 1: Create the MySQL database

```sql
CREATE DATABASE faculty_appraisal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'appraisal_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON faculty_appraisal.* TO 'appraisal_user'@'localhost';
FLUSH PRIVILEGES;
```

Then set these credentials in `backend/.env`:
```env
DB_HOST=localhost
DB_USER=appraisal_user
DB_PASSWORD=StrongPassword123!
DB_NAME=faculty_appraisal
DB_PORT=3306
```

### Step 2: Tables are auto-created

The backend **automatically creates all required tables** on first startup via `database/bootstrapDynamicForms.js` and `controllers/registrationController.runMigrations()`. You do **not** need to run any SQL schema files manually.

Just start the backend and it will set up ~25+ tables including `users`, `submissions`, `faculty_information`, `departments`, etc.

---

## 5. Email Service Setup (SMTP)

The system sends emails for:
- **Registration** — temporary passwords when registering faculty/HODs
- **Password Reset** — forgot password links
- **Form Release Notifications** — when appraisal forms are released
- **Deadline Reminders** — 2 days before submission deadline
- **Edit Requests** — notifications between faculty and DoFA office
- **Submission Sent Back** — when DoFA returns a submission for revision

### What you need to do

Set up a **dedicated SMTP email account** at your institution for this system. Below are instructions for common setups:

---

### Option A: College's Own SMTP Server (Recommended for institutions)

If your college has its own mail server (e.g., Microsoft Exchange, Zimbra, hMailServer):

```env
EMAIL_HOST=mail.your-college.ac.in       # Your mail server hostname
EMAIL_PORT=587                            # TLS port (or 465 for SSL)
EMAIL_USER=appraisal@your-college.ac.in   # Dedicated email account
EMAIL_PASS=the_account_password           # Password for this account
EMAIL_FROM=Faculty Appraisal <appraisal@your-college.ac.in>
```

> Contact your college IT/mail admin to:
> 1. Create a new email account (e.g., `appraisal@your-college.ac.in`)
> 2. Get the SMTP server hostname and port
> 3. Enable SMTP access for that account
> 4. Whitelist the server IP if needed

---

### Option B: Google Workspace / Gmail (if college uses Google)

If your college uses Google Workspace (e.g., `@your-college.ac.in` hosted by Google):

1. Create or use a dedicated Google account (e.g., `appraisal@your-college.ac.in`)
2. **Enable 2-Factor Authentication** on the account
3. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
4. Generate an **App Password** (select "Mail" → "Other" → name it "Appraisal System")
5. Use that 16-character app password (NOT the regular login password)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=appraisal@your-college.ac.in
EMAIL_PASS=xxxx xxxx xxxx xxxx            # ← 16-char App Password
EMAIL_FROM=Faculty Appraisal <appraisal@your-college.ac.in>
```

> **⚠️ Do NOT use a personal Gmail account in production.** Use an institutional account.

---

### Option C: Microsoft 365 / Outlook (if college uses Microsoft)

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=appraisal@your-college.ac.in
EMAIL_PASS=the_account_password
EMAIL_FROM=Faculty Appraisal <appraisal@your-college.ac.in>
```

> Note: Microsoft may require Modern Auth (OAuth2) for some tenants. If basic SMTP auth is blocked, your Microsoft 365 admin needs to enable "SMTP AUTH" for this mailbox in the Exchange admin center.

---

### Option D: Amazon SES / SendGrid / Mailgun (Cloud email services)

For high-volume or highly reliable email delivery, use a dedicated email service:

**Amazon SES example:**
```env
EMAIL_HOST=email-smtp.ap-south-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=AKIA...your_ses_smtp_user
EMAIL_PASS=your_ses_smtp_password
EMAIL_FROM=Faculty Appraisal <noreply@your-college.ac.in>
```

---

### Graceful Fallback

If email is **not configured** (variables left blank), the system will **not crash**. Instead, it logs emails to the server console:
```
========== EMAIL (console mode) ==========
   To: faculty@college.ac.in
   Subject: LNMIIT Faculty Appraisal - Your Temporary Password (faculty)
   (Email body logged - configure EMAIL_* env vars to send real emails)
=============================================
```

This means you can launch and test the system immediately, and configure email later.

---

### Customizing Email Branding

The email templates currently reference LNMIIT branding (logo, colours, contact info). To customize for your institution, edit:

**File:** `backend/services/emailService.js`

Key things to change:
- **Logo URL** (line ~63): Replace the LNMIIT logo `<img src="...">` with your college logo URL
- **College name** in email body text (search for "LNMIIT" and "LNM Institute")
- **Support email** (search for `webmaster@lnmiit.ac.in`) → replace with your IT help desk email
- **Website link** (search for `https://lnmiit.ac.in`) → your college website

---

## 6. JWT Authentication

The system uses JSON Web Tokens for session management. **You must change the secret key.**

```env
# Generate a secure random string (at least 64 characters)
# Example using Node.js:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=paste_the_generated_string_here

# Session duration — how long a user stays logged in
JWT_EXPIRES_IN=7d
```

> **⚠️ CRITICAL:** The default `JWT_SECRET` in the repo is a placeholder. Using it in production means anyone who sees the source code can forge auth tokens.

---

## 7. College SSO Integration (Optional)

The system supports integration with your college's existing authentication system (ERP, SSO, etc.).

### How it works

1. Your college system redirects to the appraisal portal with a short-lived token
2. The appraisal backend calls your college API to validate the token
3. If valid, the user is auto-logged-in (or auto-registered as faculty)

### Configuration

```env
# URL of your college's API that validates the token and returns user info
COLLEGE_API_URL=https://erp.your-college.ac.in/api/validate-token

# Optional shared secret for server-to-server authentication
COLLEGE_API_SECRET=your_shared_api_secret
```

### Expected College API Response

The appraisal system expects your college API to return:
```json
{
  "email": "professor@your-college.ac.in",
  "name": "Dr. Professor Name"
}
```

Field names are flexible — the system checks for: `email`/`Email`/`user_email` and `name`/`Name`/`user_name`/`full_name`.

### If not using SSO

Leave `COLLEGE_API_URL` blank. Users will log in with email + password through the built-in login system.

---

## 8. Initial User Seeding

After the database is set up and the server starts, you need to create the first admin account.

### Option A: Use the seed script (Recommended)

Edit `backend/scripts/seed_test_accounts.js` with your actual user details:

```js
const ACCOUNTS = [
  {
    name: 'System Admin',
    email: 'admin@your-college.ac.in',
    password: 'ChangeMe@123',         // User will change this on first login
    role: 'admin',
    department: 'Administration',
    designation: 'System Administrator',
    salutation: 'Mr',
    employee_id: 'ADMIN01',
    employment_type: 'regular',
  },
  {
    name: 'Dean of Faculty Affairs',
    email: 'dofa@your-college.ac.in',
    password: 'ChangeMe@123',
    role: 'Dofa',
    department: 'Administration',
    designation: 'Dean of Faculty Affairs',
    salutation: 'Prof',
    employee_id: 'DOFA01',
    employment_type: 'regular',
  },
  // Add more users as needed...
];
```

Then run:
```bash
cd backend
node scripts/seed_test_accounts.js
```

Passwords are automatically hashed with bcrypt. After seeding, you'll see a credentials table printed to the console.

### Option B: Register via the Admin Dashboard

Once the first admin account exists, log in and use the web UI to:
- Register departments
- Register faculty and HODs (they'll receive email with temp passwords)
- Bulk-invite users via CSV

### Important: Sync faculty_information

After adding users to the `users` table, run:
```bash
node scripts/sync_faculty_information_from_users.js
```

This ensures corresponding records exist in the `faculty_information` table (required for appraisal forms).

---

## 9. File Uploads

Evidence files (PDFs, images) are stored locally in `backend/uploads/`.

```env
MAX_FILE_SIZE=10485760    # 10 MB max per file
UPLOAD_PATH=./uploads     # Relative to backend directory
```

> **For production:** Ensure this directory has proper permissions and is backed up. Consider using a network drive or cloud storage mount for durability.

---

## 10. Build & Run

### Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev          # Starts on http://localhost:5001

# Terminal 2 — Frontend
cd ..                # Back to project root
npm install
npm run dev          # Starts on http://localhost:5173
```

### Production

```bash
# 1. Build the React frontend
npm run build        # Creates dist/ folder

# 2. Install backend dependencies
cd backend
npm install --production

# 3. Start with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "faculty-appraisal"
pm2 save
pm2 startup          # Auto-start on server reboot
```

### Nginx Configuration (Example)

```nginx
server {
    listen 80;
    server_name appraisal.your-college.ac.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name appraisal.your-college.ac.in;

    ssl_certificate     /etc/letsencrypt/live/appraisal.your-college.ac.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/appraisal.your-college.ac.in/privkey.pem;

    # Serve React frontend
    root /var/www/faculty_appraisal_system/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files
    location /uploads/ {
        proxy_pass http://127.0.0.1:5001/uploads/;
    }

    client_max_body_size 15M;
}
```

---

## 11. Production Deployment Checklist

- [ ] **MySQL** installed, database created, credentials configured in `backend/.env`
- [ ] **`JWT_SECRET`** changed to a unique, random 64+ character string
- [ ] **`NODE_ENV`** set to `production`
- [ ] **Email SMTP** configured with your college's own email service (see Section 5)
- [ ] **Email templates** updated in `emailService.js` — replace LNMIIT branding with your college's logo, name, and contact info
- [ ] **`FRONTEND_URL`** set to your actual production domain (e.g., `https://appraisal.your-college.ac.in`)
- [ ] **`VITE_API_URL`** in root `.env` set to `https://appraisal.your-college.ac.in/api`
- [ ] **Frontend built** with `npm run build`
- [ ] **Admin account seeded** using `seed_test_accounts.js`
- [ ] **`faculty_information` synced** using `sync_faculty_information_from_users.js`
- [ ] **Nginx / Apache** configured as reverse proxy with SSL
- [ ] **PM2** or equivalent process manager running the backend
- [ ] **Firewall** — only ports 80/443 open externally; MySQL port 3306 blocked from external access
- [ ] **Backups** — scheduled MySQL dumps + uploads directory backup
- [ ] **College SSO** (optional) — `COLLEGE_API_URL` configured if integrating with existing ERP

---

## Quick Reference: All Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | ✅ | `5001` | Backend server port |
| `NODE_ENV` | ✅ | `production` | Environment mode |
| `DB_HOST` | ✅ | `localhost` | MySQL host |
| `DB_USER` | ✅ | `appraisal_user` | MySQL username |
| `DB_PASSWORD` | ✅ | `StrongPass!` | MySQL password |
| `DB_NAME` | ✅ | `faculty_appraisal` | MySQL database name |
| `DB_PORT` | ✅ | `3306` | MySQL port |
| `JWT_SECRET` | ✅ | *(random 64+ chars)* | Token signing secret |
| `JWT_EXPIRES_IN` | ✅ | `7d` | Login session duration |
| `EMAIL_HOST` | ⚡ | `smtp.college.ac.in` | SMTP server hostname |
| `EMAIL_PORT` | ⚡ | `587` | SMTP port |
| `EMAIL_USER` | ⚡ | `appraisal@college.ac.in` | SMTP login email |
| `EMAIL_PASS` | ⚡ | App Password / SMTP password | SMTP login password |
| `EMAIL_FROM` | ⚡ | `Appraisal <no-reply@college.ac.in>` | "From" address in emails |
| `DOFA_EMAIL` | ⚡ | `dofa@college.ac.in` | DoFA notification recipient |
| `FRONTEND_URL` | ✅ | `https://appraisal.college.ac.in` | Used in email links |
| `MAX_FILE_SIZE` | ✅ | `10485760` | Max upload size (bytes) |
| `UPLOAD_PATH` | ✅ | `./uploads` | Upload directory |
| `COLLEGE_API_URL` | ❌ | `https://erp.college.ac.in/api/...` | SSO validation endpoint |
| `COLLEGE_API_SECRET` | ❌ | *(shared secret)* | SSO API secret |
| `VITE_API_URL` | ✅ | `https://appraisal.college.ac.in/api` | Frontend → Backend URL |

Legend: ✅ Required | ⚡ Required for email (system works without, but emails log to console) | ❌ Optional
