# Faculty Appraisal System - Role-Based Workflow

## Overview

The Faculty Appraisal System now supports role-based dashboards and workflow management for three user types:

- **Faculty**: Submit and manage appraisal forms
- **Dofa (Dean of Faculty Affairs)**: Review and approve submissions
- **Dofa Office**: Administrative support for managing submissions

## System Architecture

### Database Tables

1. **users** - User accounts with roles (faculty, Dofa, Dofa_office)
2. **appraisal_sessions** - Timeline control for submission windows
3. **submissions** - Faculty appraisal submissions with status tracking
4. **review_comments** - Dofa feedback and comments
5. **submission_locks** - Lock management for Dofa office

### Submission Workflow

```
Draft -> Submitted -> Under Review -> Approved/Sent Back
```

- **Draft**: Faculty is editing the form
- **Submitted**: Faculty has submitted for review
- **Under Review**: Dofa is currently reviewing
- **Approved**: Dofa has approved the submission
- **Sent Back**: Dofa requested changes

## API Endpoints

### Submissions
- `GET /api/submissions` - Get all submissions (with filters)
- `GET /api/submissions/stats` - Get submission statistics
- `GET /api/submissions/:id` - Get submission details
- `POST /api/submissions` - Create new submission
- `PUT /api/submissions/:id/status` - Update submission status
- `PUT /api/submissions/:id/lock` - Lock/unlock submission

### Review & Comments
- `POST /api/review/comment` - Add review comment
- `GET /api/review/comments/:submissionId` - Get comments for submission
- `DELETE /api/review/comment/:id` - Delete comment

### Sessions
- `GET /api/sessions` - Get all appraisal sessions
- `GET /api/sessions/current` - Get current active session
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `PUT /api/sessions/:id/status` - Toggle session status

## Frontend Routes

### Faculty Routes
- `/` - Faculty dashboard
- `/faculty-information` - Faculty information form
- `/courses-taught` - Courses taught
- All other existing Part A & Part B pages

### Dofa Routes
- `/Dofa/dashboard` - Dofa dashboard with submissions list
- `/Dofa/review/:id` - Review individual submission

### Dofa Office Routes
- `/Dofa-office/dashboard` - Administrative dashboard

## Using the System

### Development Mode - Role Switching

A role switcher is available in the top-right corner (development only):

1. Click the role switcher button
2. Select desired role (Faculty, Dofa, or Dofa Office)
3. System will navigate to appropriate dashboard

### Mock Users

The following mock users are pre-configured:

**Faculty:**
- Dr. John Smith (john.smith@university.edu)
- Dr. Jane Doe (jane.doe@university.edu)
- Dr. Robert Brown (robert.brown@university.edu)

**Dofa:**
- Dofa Admin (Dofa@university.edu)

**Dofa Office:**
- Dofa Office Admin (Dofa.office@university.edu)

### Testing Workflow

1. **As Faculty:**
   - Navigate to faculty pages
   - Fill out forms
   - Submit for review

2. **As Dofa:**
   - View submissions list
   - Review submission details
   - Add comments
   - Approve or send back submissions

3. **As Dofa Office:**
   - View all submissions
   - Lock/unlock submissions
   - Send reminders
   - Export data to CSV

## Features by Role

### Faculty Dashboard
- Welcome screen
- Access to all appraisal forms
- View submission status
- Edit drafts

### Dofa Dashboard
- Statistics cards (Total Faculty, Submissions, Pending, Approved)
- Submissions table with filters
- Quick actions: View, Approve, Send Back
- Status-based filtering

### Dofa Review Page
- Tabbed interface showing:
  - Faculty Information
  - Teaching records
  - Publications
  - Research grants
  - Awards
- Comment history
- Review actions (Approve/Send Back)

### Dofa Office Dashboard
- Administrative statistics
- Submission management
- Lock/unlock functionality
- Send reminders to faculty
- Export submissions to CSV

## Timeline Control

Dofa can control when faculty can access the appraisal form using appraisal sessions:

1. Create a session with academic year and date range
2. Set status to "open"
3. Faculty can only submit when session is open and current date is within range
4. Set status to "closed" to prevent submissions

## Database Setup

All required tables are created automatically. Run migrations if needed:

```bash
mysql -u root -p faculty_appraisal < backend/database/migrations/add_role_workflow_tables.sql
mysql -u root -p faculty_appraisal < backend/database/migrations/insert_mock_data.sql
```

## Running the Application

### Backend
```bash
cd backend
npm install
npm start
```
Server runs on http://localhost:5000

### Frontend
```bash
npm install
npm run dev
```
Application runs on http://localhost:5173

## Production Deployment

For production use:

1. **Remove Role Switcher**: Comment out or remove the `<RoleSwitcher />` component from Header.jsx
2. **Implement Real Authentication**: Replace `authService.js` with JWT-based authentication
3. **Add Login Page**: Create a proper login page with credentials
4. **Secure API Routes**: Add middleware for role-based access control
5. **Environment Variables**: Store sensitive data in .env files

## File Structure

```
backend/
+-- controllers/
|   +-- submissionsController.js
|   +-- reviewController.js
|   +-- sessionsController.js
+-- routes/
|   +-- submissionsRoutes.js
|   +-- reviewRoutes.js
|   +-- sessionsRoutes.js
+-- database/
|   +-- migrations/
|       +-- add_role_workflow_tables.sql
|       +-- insert_mock_data.sql

src/
+-- pages/
|   +-- DofaDashboard.jsx & .css
|   +-- DofaReview.jsx & .css
|   +-- DofaOfficeDashboard.jsx & .css
+-- components/
|   +-- RoleSwitcher.jsx & .css
|   +-- Header.jsx (updated)
+-- services/
|   +-- authService.js
+-- App.jsx (updated with new routes)
```

## Notes

- All styling maintains consistency with existing faculty interface
- Tables and components reuse existing design patterns
- Database schema integrates with existing faculty_information table
- Mock data includes sample submissions in different statuses for testing

## Support

For issues or questions about the role-based workflow system, refer to:
- Backend API documentation in controllers
- Component documentation in source files
- Database schema in migration files

