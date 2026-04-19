# Quick Fix Instructions

## ✅ Server Crash - FIXED
The routes have been updated to use the new upload middleware structure.

## 🔄 Next Steps

### 1. The server should auto-restart now
The nodemon should detect the file changes and restart automatically. Check your terminal.

### 2. Run the Database Migration

**Option A: Using MySQL Workbench (Recommended for Windows)**
1. Open MySQL Workbench
2. Connect to your database
3. Open the file: `backend/database/migrations/add_status_columns.sql`
4. Click "Execute" (⚡ icon)

**Option B: Using PowerShell**
```powershell
# You'll be prompted for password
Get-Content database\migrations\add_status_columns.sql | mysql -u root -p faculty_appraisal
```

**Option C: Using Command Prompt (cmd)**
```cmd
mysql -u root -p faculty_appraisal < database\migrations\add_status_columns.sql
```

### 3. Verify Server is Running
Check that you see:
```
✅ Database connected successfully
🚀 Server is running on http://localhost:5001
```

## What Was Fixed
- ✅ `grantsRoutes.js` - Updated to use `uploadSingle`
- ✅ `patentsRoutes.js` - Updated to use `uploadSingle`
- ✅ `reviewsRoutes.js` - Added caching middleware
- ✅ All routes now use the new middleware structure

The server should be running now! 🎉
