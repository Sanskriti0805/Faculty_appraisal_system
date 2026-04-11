# 📋 Faculty Appraisal System — LNMIIT
### A Full-Stack Web Application for End-to-End Annual Faculty Performance Appraisal Management

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Authentication & Onboarding](#5-authentication--onboarding)
6. [Faculty Dashboard & Forms](#6-faculty-dashboard--forms)
7. [DOFA Office Dashboard](#7-dofa-office-dashboard)
8. [DOFA Reviewer Dashboard](#8-dofa-reviewer-dashboard)
9. [HOD Dashboard](#9-hod-dashboard)
10. [Form Builder Module](#10-form-builder-module)
11. [Rubrics Management](#11-rubrics-management)
12. [Evaluation Sheets](#12-evaluation-sheets)
13. [PDF Generation](#13-pdf-generation)
14. [Auto-Save & Data Persistence](#14-auto-save--data-persistence)
15. [Submission Lifecycle](#15-submission-lifecycle)
16. [Email Notification System](#16-email-notification-system)
17. [Database Schema](#17-database-schema)
18. [API Reference](#18-api-reference)
19. [Project File Structure](#19-project-file-structure)
20. [Setup & Running Locally](#20-setup--running-locally)

---

## 1. Project Overview

The **Faculty Appraisal System** is a purpose-built web application designed for **The LNM Institute of Information Technology (LNMIIT), Jaipur** to digitize and automate the annual faculty performance appraisal process. 

Previously managed through paper forms and spreadsheets, the system now provides:

- A **guided multi-section form** for faculty to self-report their academic activities
- A **review dashboard** for DOFA (Dean of Faculty Affairs) to evaluate, score, and grade submissions
- An **administration panel** for DOFA Office to manage users, sessions, rubrics, and custom form sections
- **Automated rubric-based scoring** that assigns marks the moment a faculty member submits
- **PDF download** for every submission — LNMIIT-branded, A4 layout, ready for print
- A **dynamic form builder** so new appraisal sections can be added without writing code

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework (SPA with lazy loading) |
| Vite | 5.x | Build tool & dev server |
| React Router DOM | 6.x | Client-side routing |
| Lucide React | latest | Icon library |
| Vanilla CSS | — | Styling (no Tailwind, full custom design system) |
| Google Fonts (Inter/Outfit) | — | Typography |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 5.x | REST API framework |
| MySQL 2 | 3.x | Database driver (promise-based) |
| JWT | 9.x | Authentication tokens |
| Bcryptjs | 3.x | Password hashing |
| Multer | 2.x | File upload handling |
| Nodemailer | 8.x | Email notifications |
| Puppeteer | 24.x | Headless browser for PDF generation |
| XLSX | 0.18.x | Excel export (bulk data) |
| Node-cron | 4.x | Scheduled jobs (deadline reminders) |
| Node-cache | 5.x | In-memory caching |

### Database
- **MySQL 8.x** with InnoDB engine
- 30+ interconnected tables
- Full foreign key constraints with cascade delete
- JSON columns for flexible data storage (rubric configs, dynamic responses)

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React SPA)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Faculty  │  │  DOFA    │  │   HOD    │  │ DOFA Office  │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │  Dashboard   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
└───────┼─────────────┼─────────────┼────────────────┼───────────┘
        │             │             │                │
        └─────────────┴─────────────┴────────────────┘
                              │ HTTPS REST API
                    ┌─────────▼────────────┐
                    │   Express.js Server   │
                    │    (Port 5000)        │
                    │  ┌─────────────────┐ │
                    │  │ JWT Middleware   │ │
                    │  │ Role Guards     │ │
                    │  │ Multer Upload   │ │
                    │  └─────────────────┘ │
                    │  22 Controllers       │
                    │  21 Route Files      │
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │      MySQL 8.x        │
                    │   30+ Tables          │
                    │   InnoDB Engine       │
                    └──────────────────────┘
```

### Request Flow
1. User logs in → receives JWT token → stored in `localStorage`
2. All subsequent API calls include `Authorization: Bearer <token>` header
3. `authMiddleware.js` verifies token and attaches `req.user`
4. Role-specific guards check `req.user.role` for protected operations
5. Controller queries MySQL → returns JSON response
6. React updates state → UI re-renders

---

## 4. User Roles & Access Control

The system has **5 distinct roles**, each with a completely separate dashboard and routing prefix:

| Role | Route Prefix | Description |
|---|---|---|
| `faculty` | `/` | Fills annual appraisal forms |
| `dofa` | `/dofa` | Reviews & grades submissions |
| `dofa_office` | `/dofa-office` | Administers the system (sessions, users, rubrics, form builder) |
| `hod` | `/hod` | Views department-level summary |
| `admin` | (mixed) | System-level access (same as dofa_office) |

### Role-based Route Protection
```
ProtectedRoute component (src/components/ProtectedRoute.jsx)
  → reads JWT from localStorage
  → checks req.user.role against allowedRoles[]
  → redirects to /login if mismatch
```

---

## 5. Authentication & Onboarding

### Login (`/login`)
- Email + password form with a premium dark-themed design
- On success: receives `{ token, user }` → stores in `localStorage`
- Role detection routes the user to their correct dashboard prefix
- "Forgot Password" link triggers the password reset flow

### Forgot Password (`/forgot-password`)
- Faculty enters email → backend sends a reset link with JWT token (15min expiry)
- Link: `/reset-password/:token`

### Reset Password (`/reset-password/:token`)
- Token is verified → user sets new password
- bcryptjs hashes before DB storage

### Onboarding (`/onboarding`)
- Triggered on **first login** for new faculty accounts
- Multi-step profile completion wizard:
  - Step 1: Personal details (name, employee ID, phone)
  - Step 2: Academic profile (department, designation, date of joining)
  - Step 3: Qualifications & specialization
- On completion: creates/updates `faculty_information` record
- Guards faculty from accessing any form page until onboarding is done

### Password Reset for DOFA Accounts
- `backend/reset-dofa.js` — admin utility script to reset DOFA passwords directly in DB
- `backend/update-dofa-role.js` — admin utility to promote users to DOFA roles

---

## 6. Faculty Dashboard & Forms

### Faculty Dashboard (`/`)
The landing page for faculty. Shows different states depending on session status:

**State 1 — Forms Open (deadline not yet passed, not submitted)**
- Green banner: "Appraisal Forms Are Open"
- Info cards: Academic Year | Submission Deadline | Days Remaining
- Urgent warning if ≤ 3 days remain
- Quick-navigation grid: Faculty Information, Courses Taught, Research Publications, Part B

**State 2 — Already Submitted**
- Blue banner: "Appraisal Form Submitted"
- Status card showing current submission status
- Button: "View Submitted Form" → `MySubmissionView`
- Button: "Request Section Edits" if deadline not passed

**State 3 — Edit Access Granted (`sent_back` status)**
- Yellow banner: "Edit Access Granted"
- Shows which sections were unlocked by DOFA
- Navigation shortcuts to those sections
- Must re-submit from Part B

**State 4 — Deadline Passed**
- Red banner: "Submission Deadline Has Passed"
- Shows last submission details
- No editing allowed

**State 5 — No Active Session**
- Grey banner: "Appraisal Forms Not Yet Available"
- Pulsing animation indicator
- Message to await email notification

### Form A — Academic Contributions (Part A)
All Part A sections are accessible via the left sidebar. Each section follows the same pattern:
1. Load existing data from DB on mount
2. Local state tracks edits
3. "Save and Next" button → calls backend API → navigates to next section

#### 6.1 Faculty Information (`/faculty-information`)
- Fields: Name, Employee ID, Department, Designation, Email, Phone, Date of Joining, Qualifications
- Stored in: `faculty_information` table
- Read-only once submitted (unless edit access granted)

#### 6.2 Courses Taught (`/courses-taught`)
- Multi-row table: each course is one row
- Fields per row: Course Code, Course Name, Section, Program, Semester, Credits, Enrollment, Feedback Score
- Duplicate check: prevents re-saving same course twice (PUT update for existing)
- Evidence upload: PDF/image per course
- Stored in: `courses_taught` table

#### 6.3 New Courses Developed (`/new-courses`)
- Records courses **newly designed** by the faculty
- Fields: Level Type, Program, Course Name, Course Code, Level, Remarks
- CIF file upload (Course Information Form PDF)
- Stored in: `new_courses` table

#### 6.4 Courseware (`/courseware`)
- Text-area based section for describing digital courseware created
- Stored in: `legacy_section_entries` (key: `courseware`)

#### 6.5 Teaching Innovation (`/teaching-innovation`)
- Multi-entry: each innovation is one card
- Fields: Title, Description, Implementation Date, Impact, Evidence File
- Stored in: `teaching_innovation` table

#### 6.6 Research Publications (`/research-publications`)
- Most complex form in the system — multi-type publications
- Publication Types: Journal Article, Conference Paper, Book Chapter, Book, Patent (view only)
- Per journal: Journal Name, Abbreviation, Volume, Pages, Year, ISSN, Authors list
- Per conference: Conference Name, City, Country, Type of Conference, Dates
- Evidence file upload per publication
- Sub-authors managed via nested `authors` table
- Stored in: `research_publications` + `authors` + `editors` tables

#### 6.7 Research Grants (`/research-grants`)
- Active grants received
- Fields: Grant Type, Project Name, Funding Agency, Currency, Amount (INR/USD), Amount in Lakhs, Duration, Co-researchers, Role (PI/Co-PI)
- Evidence file upload
- Stored in: `research_grants` table

#### 6.8 Submitted Proposals (`/research-grants` — sub-section)
- Research proposals pending approval
- Fields: Title, Funding Agency, Amount, Duration, Submission Date, Status
- Stored in: `submitted_proposals` table

#### 6.9 Patents (`/patents`)
- Filed/granted patents
- Fields: Patent Type, Title, Agency, Month of Grant, Certificate Upload, Publication ID
- Stored in: `patents` table

#### 6.10 Technology Transfer (`/technology-transfer`)
- Commercialized technologies or IP transfers
- Fields: Title, Description, Agency, Date, Evidence File
- Stored in: `technology_transfer` table

#### 6.11 Paper Reviews (`/paper-review`)
- Journal/conference papers reviewed by the faculty
- Fields: Review Type, Journal Name, Abbreviation, Number of Papers, Month of Review, Tier
- Stored in: `paper_reviews` table

#### 6.12 Conference Sessions (`/conference-sessions`)
- Sessions organized/chaired at conferences
- Fields: Conference Name, Session Title, Date, Location, Role
- Evidence file upload
- Stored in: `conference_sessions` table

#### 6.13 Keynotes & Invited Talks (`/keynotes-talks`)
- Invited lectures and keynote presentations
- Fields: Title, Event Name, Date, Location, Audience Type, Event Type, Evidence File
- Stored in: `keynotes_talks` table

#### 6.14 Awards & Honours (`/awards-honours`)
- National or international recognition
- Fields: Honour Type (National/International), Award Name, Description, Evidence File
- Stored in: `awards_honours` table

#### 6.15 Consultancy (`/consultancy`)
- Industry consultancy projects
- Fields: Organization, Project Title, Role, Duration, Amount, Year
- Stored in: `consultancy` table

#### 6.16 Continuing Education (`/continuing-education`)
- FDPs, workshops, MOOCs attended
- Text-area based
- Stored in: `legacy_section_entries` (key: `continuing_education`)

#### 6.17 Institutional Contributions (`/institutional-contributions`)
- Roles in committees, governance, student welfare
- Role-based dropdown selector (Admin, Committee Member, Coordinator, etc.)
- Each contribution: Category, Title, Description, Year, Evidence File
- Stored in: `institutional_contributions` table

#### 6.18 Other Activities (`/other-activities`)
- Free-form text for activities not covered elsewhere
- Stored in: `legacy_section_entries` (key: `other_activities`)

---

### Form B — Goal Setting (Part B)
Route: `/part-b`

- **Semester-wise goal table**: Faculty sets targets for Teaching, Research, Contribution, Outreach
- Each row: Semester, Teaching Grade Target, Research Grade Target, Contribution Target, Outreach Target, Description
- Final **Submit for Review** button — changes submission status from `draft` → `submitted`
- On submit:
  1. Creates a versioned snapshot of ALL submission data
  2. Triggers `autoAllocateMarks()` — scores are calculated from rubrics
  3. Marks previous DOFA comments as resolved
  4. Sends email confirmation to faculty

**Research Plan** (`/research-plan`) & **Teaching Plan** (`/teaching-plan`)
- Text areas for future plans
- Stored in `legacy_section_entries`

---

### My Submission View (`/my-submission`)
After submitting, faculty can view their complete submission in a tabbed interface:

**Tabs:**
| Tab | Content |
|---|---|
| Faculty Info | Profile details grid |
| Teaching | Courses taught + new courses |
| Publications | All research publications table |
| Research & Grants | Grants, proposals, technology transfer |
| Events & Awards | Patents, awards, paper reviews, conference sessions, keynotes |
| Consultancy | Consultancy projects |
| Innovation | Teaching innovation + institutional contributions |
| Part B | Goal-setting table by semester |
| Custom Sections | Dynamic sections filled via Form Builder (appears only if data exists) |

**Actions available:**
- **Download PDF** button — calls Puppeteer API, streams LNMIIT-branded A4 PDF
- **Request Section Edits** panel — select sections, add reason, submit edit request to DOFA
- **View DOFA Comments** — pending and resolved comment history from reviewers

---

### Dynamic Form Section (`/faculty/dynamic/:sectionId`)
For custom sections created via Form Builder:

- Loads field schema from `dynamic_sections` + `dynamic_fields`
- Renders fields dynamically: text input, textarea, or interactive table with add/remove rows
- **Debounced Autosave**: 2 seconds after the user stops typing → silent background save
  - Shows animated indicator in header: `⟳ Saving…` → `✓ Saved` (fades after 3s)
- `isFirstLoad` guard prevents autosave on initial data population
- Responses stored in: `dynamic_responses` table (JSON value column)

---

## 7. DOFA Office Dashboard

Route: `/dofa-office`  
Role: `dofa_office`

The administrative hub of the entire system. Contains 7 major sub-modules:

### 7.1 Dashboard Overview (`/dofa-office/dashboard`)
Real-time statistics displayed in cards:
- Total Faculty registered
- Total Submissions this year
- Status breakdown: Draft | Submitted | Under Review | Approved | Sent Back
- Year filter dropdown for historical data
- Pie/bar chart of submission status distribution
- List of recent submissions with quick-action buttons (View, Send Reminder)
- **Bulk Data Export** button → downloads comprehensive Excel workbook (`.xlsx`) with all submissions for selected academic year, one sheet per section

### 7.2 User & Faculty Registration (`/dofa-office/registration` & `/dofa-office/manage-users`)
Same component: `DOFARegistration.jsx` — a full user management panel:

**Tabs:**
- **Register Faculty**: Multi-step form
  - Step 1: Personal (Name, Salutation, Email, Employee ID, Phone)
  - Step 2: Academic (Department, Designation, Employment Type, Date of Joining)
  - Step 3: Account setup (auto-generates temp password, sends welcome email)
- **All Users List**: Filterable table (all roles, departments, active/inactive)
  - Search by name, email, department
  - Inline role/status editing
  - Activate/Deactivate toggle
  - Reset Password button
  - Delete user (with cascade to all their data)
- **Bulk Import**: CSV template download + upload for mass-registering faculty
- **Departments Tab**: Create/edit/delete departments, assign HOD

### 7.3 Session Management (inside Dashboard)
- Create a new appraisal session: Academic Year, Start Date, End Date
- Release forms to faculty (toggle `is_released`)
- Set/update submission deadline
- Close session at year-end
- Stored in: `appraisal_sessions` table

### 7.4 Form Release (`/dofa-office/form-release`)
- Controls **when** forms become visible to faculty
- Toggle switch — when released:
  - All faculty see the "Forms Open" dashboard state
  - Email notification sent to all active faculty
- Deadline management (date picker)
- Automatic deadline reminder emails via `node-cron`

### 7.5 Form Builder (`/dofa-office/form-builder`)
See [Section 10](#10-form-builder-module) for full details.

### 7.6 Rubrics Management (`/dofa-office/rubrics`)
See [Section 11](#11-rubrics-management) for full details.

### 7.7 Evaluation Sheets (`/dofa-office/sheet1`, `/sheet2`, `/sheet3`)
See [Section 12](#12-evaluation-sheets) for full details.

---

## 8. DOFA Reviewer Dashboard

Route: `/dofa`  
Role: `dofa`

The reviewing and grading interface for DOFA reviewers.

### 8.1 DOFA Dashboard (`/dofa/dashboard`)
- Same stats overview as DOFA Office but read-only
- Submissions table with status badges
- Click any submission → opens the full review page

### 8.2 Review Panel (`/dofa/review/:submissionId`)
The core review interface — `DOFAReview.jsx`:

**Left Panel — Submission Navigator**
- Accordion sections for every Part A and Part B section
- Click section → right panel shows data for that section
- Progress indicator (how many sections have comments)

**Right Panel — Review Content**
- Tabbed display of faculty submission data
- Section-by-section tables showing exactly what was submitted
- Evidence file links (opens upload in new tab)

**Commenting System**
- Add section-specific comment → stored in `review_comments`
- Comment stays "pending" until faculty re-submits (then auto-resolved)
- Past comments shown with pending/resolved status

**Actions**
- **Send Back** — status → `sent_back`, email sent to faculty with all pending comments
- **Approve** — status → `approved`, triggers final score lock
- **Under Review** toggle

**Rubric Scoring (Sheet 1 inline)**
- Shows the rubric evaluation grid for the submission
- DOFA can manually override automatically allocated scores
- Total score shown in real-time

### 8.3 Rubrics Management (`/dofa/rubrics`)
Same as DOFA Office — DOFA reviewers can also define rubric rules.

---

## 9. HOD Dashboard

Route: `/hod/dashboard`  
Role: `hod`

A read-only dashboard providing department-level visibility.

**Features:**
- Shows all faculty in their department
- Submission status per faculty (draft/submitted/approved/sent_back)
- Department-wide statistics (how many submitted, pending, approved)
- Cannot modify any data — view only
- Filters by academic year and status

---

## 10. Form Builder Module

Route: `/dofa-office/form-builder`  
Role: `dofa_office`

A Canva-style drag-and-drop form editor allowing admins to create custom appraisal sections **without writing any code or SQL**.

### 10.1 Interface Layout

**Left Sidebar — Palette**
- Form A / Form B tab switcher
- Element types that can be dragged/clicked to add:
  - `T` — Text field (single line)
  - `¶` — Comment box (multi-line textarea)
  - `⊞` — Table (configurable columns, add/remove rows)
- Section Navigator: shows all existing sections for the active form

**Canvas Area**
- Dot-grid background (Figma/Canva style)
- Selected section rendered in a card with:
  - Editable section title
  - Form type badge (Form A or Form B)
  - Subsection badge (if it's a child of a parent section)
  - Delete section button
- Each field appears as a **field card** with:
  - Field type badge
  - Editable label input
  - Live preview of the input/table
  - For tables: column pills (add/remove column names)
  - Delete field button (hover to reveal)

### 10.2 Multi-Step Wizard (New Section)

Clicking "+ New Section" opens a 4-step modal with animated step indicators:

**Step 1 — Form Selection**
- Choose between Form A or Form B
- Large clickable cards with icons and descriptions

**Step 2 — Section Kind**
- **New Top-Level Section** — standalone section at the root level
- **Add Fields to Existing** — append fields to an already-created section
- **New Subsection** — child of an existing parent section (uses `parent_id`)

**Step 3 — Field Configuration**
- Add multiple fields in one wizard session:
  - Choose type: Text | Comment | Table
  - Enter field label
  - For tables: define column names with add/remove pill buttons
- "Add Another Field" button for multiple fields

**Step 4 — Review & Confirm**
- Summary card showing:
  - Form type badge
  - Section name and kind
  - List of all fields with their types and column counts
- "Create Section" submit button

**Post-Creation — Rubric Reminder Popup**
- Immediately after creation, a modal popup appears:
  - 🔔 "Don't forget Rubrics!"
  - Explains that the section won't affect scores until rubric rules are defined
  - Two buttons: "Go to Rubrics Management" | "I'll do it later"

### 10.3 Data Model

New sections use a 3-table EAV (Entity-Attribute-Value) pattern — **no new SQL tables ever created**:

```
dynamic_sections  →  one row per section
dynamic_fields    →  one row per field (linked via section_id)
dynamic_responses →  one row per faculty per field (JSON value)
```

**Hierarchy Support** — `parent_id` column enables subsections:
```
Section: "Research Activities" (parent_id = NULL)
  ↳ Subsection: "Journal Publications" (parent_id = 1)
  ↳ Subsection: "Conference Papers"    (parent_id = 1)
```

**Flexible Value Storage** — `dynamic_responses.value` is a JSON column:
```json
// Text field:   "Developed Python course from scratch"
// Table field:  [{"paper":"Deep Learning...", "journal":"IEEE", "year":"2024"}, {...}]
```

---

## 11. Rubrics Management

Route: `/dofa-office/rubrics` and `/dofa/rubrics`  
Component: `RubricsManagement.jsx`

Defines the **scoring rules** that determine how many marks each section is worth.

### 11.1 Interface

- **Spreadsheet-style table** grouped by section name
- Expandable section rows (click to show sub-section rows)
- Edit any cell inline by clicking it
- "Add Section" → adds new top-level group
- "Add Sub-item" → adds a row under an existing section

### 11.2 Columns

| Column | Description |
|---|---|
| Section Name | Expandable header row (e.g., "Research Publications") |
| Sub Section | Specific rubric item (e.g., "Journal Papers – Q1") |
| Max Marks | Maximum score for this item |
| Weightage | Percentage weight in final grade |
| Scoring Type | `manual`, `count_based`, or `text_exists` |
| Per Unit Marks | Only visible when `count_based` — marks per row/entry |
| Linked Section | Dropdown to link this rubric to a `dynamic_sections` row |
| Actions | Delete button (hover to reveal) |

### 11.3 Scoring Types

| Type | How It Works |
|---|---|
| `manual` | DOFA enters the score by hand in the evaluation sheet |
| `count_based` | `score = min(row_count × per_unit_marks, max_marks)` |
| `text_exists` | Full marks if the field has any non-empty value |

### 11.4 Auto-Allocation Pipeline

When faculty submits the form (`status → submitted`), `rubricMapper.js` fires automatically:

```
autoAllocateMarks(submissionId, facultyId, academicYear)
  ↓
For each rubric in dofa_rubrics:
  → Map section_name to the relevant DB table
  → Query count of records (for count_based)
  → Query text presence (for text_exists)
  → Calculate score = min(count × per_unit_marks, max_marks)
  → UPSERT into dofa_evaluation_scores
  ↓
Total score = SUM of all rubric scores
→ UPDATE submissions.total_score
```

### 11.5 Save & Recalculate

- "Save All Changes" button → batch upserts all rubric changes
- "Recalculate Scores" button → re-runs `autoAllocateMarks` for all submitted/approved faculty for a chosen year
  - Shows a confirmation popup listing affected faculty
  - Used when rubric values are changed mid-year

---

## 12. Evaluation Sheets

Three separate sheets for the complete DOFA evaluation workflow:

### 12.1 Evaluation Sheet 1 — Rubric Scores (`/sheet1`)
- Table of all rubric rows and corresponding auto-calculated scores
- DOFA can **override** any individual score manually
- Running total shown at top right
- Grade automatically assigned based on configurable grading parameters:
  ```
  dofa_grading_parameters table:
    condition: >=70  → Grade: A+
    condition: >=60  → Grade: A
    condition: >=50  → Grade: B+
    etc.
  ```
- Final grade displayed with color coding

### 12.2 Evaluation Sheet 2 — Qualitative Review (`/sheet2`)
- Free-text fields:
  - Research Remarks
  - Teaching Feedback
  - Overall Feedback
- Final Grade dropdown (override if needed)
- Stored in: `dofa_evaluation_sheet2` table

### 12.3 Evaluation Sheet 3 — Increment Recommendation (`/sheet3`)
- Salary increment percentage based on final grade
- Uses `dofa_grade_increments` lookup table:
  ```
  A+ → 10%
  A  → 8%
  B+ → 6%
  etc.
  ```
- Increment % auto-filled based on grade from Sheet 2
- DOFA can override
- Stored in: `dofa_evaluation_sheet3` table

---

## 13. PDF Generation

### How It Works

Route: `GET /api/submissions/:id/pdf`  
Controller: `backend/controllers/pdfController.js`  
Template: `backend/utils/pdfTemplate.js`

```
Request → Auth check → Parallel DB queries
  → All 20+ section tables
  → dynamic_responses (custom sections)
  → generateHtml(allData)
  → Puppeteer.launch()
  → page.setContent(html, { waitUntil: 'networkidle0' })
  → page.pdf({ format: 'A4', printBackground: true })
  → browser.close()
  → res.end(pdfBuffer)
```

### PDF Contents (in order)

1. **Cover Page** (full-page, dark blue gradient)
   - LNMIIT logo text
   - Faculty name (large heading)
   - Academic year, department, designation, submission date
   - Status badge

2. **Part A Sections** (one section per block, LNMIIT navy blue headers)
   - Faculty Information (key-value grid, 3 columns)
   - Courses Taught (table)
   - New Courses Developed (table)
   - Research Publications (table)
   - Research Grants (table)
   - Submitted Proposals (table)
   - Patents (table)
   - Technology Transfer (table)
   - Paper Reviews (table)
   - Conference Sessions (table)
   - Keynotes & Invited Talks (table)
   - Awards & Honours (table)
   - Consultancy (table)
   - Teaching Innovation (table)
   - Institutional Contributions (table)
   - Courseware, Continuing Education, Other Activities (pre-formatted text)

3. **Part B Sections**
   - Research Plan (pre-formatted text)
   - Teaching Plan (pre-formatted text)
   - Goals & Targets (table, by semester)

4. **Custom Sections** (from Form Builder — appended at end)
   - Each dynamic section rendered with its title + "Form A/B" badge
   - Table fields rendered as proper HTML tables with configured columns
   - Text/textarea fields rendered as labeled key-value pairs

### Download Trigger (Frontend)
```javascript
// MySubmissionView.jsx
const blob = await fetch(`/api/submissions/${subId}/pdf`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.blob());

const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.download = `Appraisal_${academicYear}.pdf`;
a.click();
```

Button shows `⟳ Generating PDF…` spinner during generation (typically 3–8 seconds).

---

## 14. Auto-Save & Data Persistence

### Debounced Autosave (Dynamic Form Sections)

Implemented in `DynamicFormSection.jsx`:

```javascript
// 2-second debounce after last keystroke
useEffect(() => {
  if (isFirstLoad.current) { isFirstLoad.current = false; return; }
  clearTimeout(autosaveTimer.current);
  autosaveTimer.current = setTimeout(async () => {
    setAutosaveStatus('saving');
    const success = await handleSave(true); // silent = no toast
    setAutosaveStatus(success ? 'saved' : 'error');
    setTimeout(() => setAutosaveStatus('idle'), 3000);
  }, 2000);
}, [responses]);
```

Visual indicator in header:
- 🔵 `⟳ Saving…` (blue pill, spinning loader icon)
- 🟢 `✓ Saved` (green pill, appears for 3s then fades)
- 🔴 `✕ Save failed` (red pill, if network error)

### Static Form Sections
All Part A sections (Courses, Publications, etc.) use explicit "Save and Next" button. Data is never lost between sections because:
1. Save fires before navigation
2. On re-entering a section, data re-loads from DB

---

## 15. Submission Lifecycle

### Status Flow
```
draft ──→ submitted ──→ under_review ──→ approved
              ↑               │
              └───── sent_back ┘
```

| Status | Who Sets It | Meaning |
|---|---|---|
| `draft` | System (auto-created) | Faculty hasn't submitted yet |
| `submitted` | Faculty (Part B submit button) | Submitted for DOFA review |
| `under_review` | DOFA | DOFA has opened the submission |
| `sent_back` | DOFA | Returned to faculty for corrections |
| `approved` | DOFA | Final approval — locked |

### Versioning System
Every time faculty submits (or re-submits after sent_back), the system creates a **snapshot**:

```sql
submission_versions table:
  - submission_id
  - version_number  (1, 2, 3...)
  - snapshot_data   (LONGTEXT JSON — full dump of ALL section data)
  - snapshot_note   (e.g., "Faculty re-submission after DOFA review")
  - created_by
```

This provides a complete audit trail — DOFA can view any past version.

### Edit Request Flow
After submitting, faculty can request edits:
1. Faculty selects sections in `MySubmissionView`
2. Adds optional reason message
3. Submits → creates record in `edit_requests` table
4. DOFA Office sees request in their dashboard
5. DOFA approves selected sections → status → `sent_back`
6. Faculty gets email → edits unlocked sections → re-submits

Tables: `edit_requests` (pending/approved/denied status)

### Locking Mechanism
- DOFA can lock a submission (`submission_locks` table)
- Locked submissions cannot be edited even if `sent_back`
- Ensures data integrity during evaluation period

---

## 16. Email Notification System

Service: `backend/services/emailService.js` (Nodemailer + SMTP)  
Scheduler: `backend/services/schedulerService.js` (node-cron)

### Triggered Emails

| Event | Recipient | Content |
|---|---|---|
| New faculty registered | Faculty | Welcome email with temp password |
| Forms released | All active faculty | "Appraisal forms are now open" |
| Submission confirmed | Faculty | Confirmation with submission date |
| Submission sent back | Faculty | List of pending DOFA comments per section |
| Edit request submitted | DOFA Office | Details of sections faculty wants to edit |
| Edit request approved | Faculty | List of unlocked sections |
| Submission deadline approaching | All unsubmitted faculty | Reminder (cron job — configurable days before) |

### Scheduled Jobs
- **Deadline reminders**: Runs daily at 8:00 AM — checks if deadline is X days away
- **Session status checks**: Automatically closes sessions past end date

---

## 17. Database Schema

**Total Tables: 30+**

### Core Tables

| Table | Primary Purpose |
|---|---|
| `users` | Authentication — all roles (faculty, dofa, dofa_office, hod, admin) |
| `faculty_information` | Faculty profile data (name, dept, designation, etc.) |
| `submissions` | One row per faculty per academic year |
| `appraisal_sessions` | Academic year sessions (start date, end date, status) |
| `departments` | Department registry with HOD info |

### Faculty Data Tables

| Table | Stores |
|---|---|
| `courses_taught` | Courses with feedback scores |
| `new_courses` | Newly designed courses |
| `research_publications` | All publication types |
| `research_grants` | Received grants |
| `submitted_proposals` | Pending research proposals |
| `patents` | Filed and granted patents |
| `technology_transfer` | Commercialized tech |
| `paper_reviews` | Journal/conference paper reviews |
| `conference_sessions` | Conference committee roles |
| `keynotes_talks` | Invited lectures |
| `awards_honours` | National/international awards |
| `consultancy` | Industry consultancy |
| `teaching_innovation` | Pedagogical innovations |
| `institutional_contributions` | Governance and committee roles |
| `faculty_goals` | Part B semester-wise goal entries |
| `authors` | Co-authors for publications |
| `editors` | Editors for book chapters |
| `legacy_section_entries` | Key-value store for text-based sections (courseware, plans) |

### Evaluation Tables

| Table | Stores |
|---|---|
| `dofa_rubrics` | Scoring rules per section with max marks and scoring type |
| `dofa_evaluation_scores` | Auto-calculated + manual score per rubric per submission |
| `dofa_section_scores` | Aggregated score per section |
| `dofa_evaluation_sheet2` | Qualitative review remarks and final grade |
| `dofa_evaluation_sheet3` | Salary increment percentage |
| `dofa_grading_parameters` | Grade boundaries (e.g., ≥70 → A+) |
| `dofa_grade_increments` | Grade → increment percentage lookup |
| `dofa_evaluation_remarks` | General remarks on a submission |
| `review_comments` | Section-specific DOFA comments (pending/resolved) |
| `rubrics` | Secondary rubric table (legacy) |
| `submission_scores` | Legacy score table |

### Dynamic Form Tables

| Table | Stores |
|---|---|
| `dynamic_sections` | Section definitions (`title`, `form_type`, `parent_id`) |
| `dynamic_fields` | Field definitions (`section_id`, `field_type`, `label`, `config`) |
| `dynamic_responses` | Faculty answers (`faculty_id`, `field_id`, `value` JSON) |
| `form_fields` | Legacy basic form field definitions |

### Workflow/System Tables

| Table | Stores |
|---|---|
| `submission_versions` | Snapshot of all data at each submission timestamp |
| `submission_locks` | Lock records preventing editing |
| `edit_requests` | Faculty requests to edit specific sections post-submission |
| `audit_logs` | Full CRUD audit trail for compliance |
| `system_settings` | Key-value configuration (SMTP, deadlines, flags) |

---

## 18. API Reference

### Base URL: `http://localhost:5000/api`

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT token |
| POST | `/auth/register` | Register new user |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password/:token` | Set new password |
| GET | `/auth/me` | Get current user from token |

### Submissions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/submissions/my` | Get/create draft for logged-in faculty |
| GET | `/submissions` | Get all (filters: status, academic_year, faculty_id) |
| GET | `/submissions/stats` | Status counts |
| GET | `/submissions/:id` | Full submission with all section data |
| POST | `/submissions` | Create new draft |
| PUT | `/submissions/:id/status` | Update status (submit/approve/send_back) |
| GET | `/submissions/:id/pdf` | **Download Puppeteer PDF** |
| GET | `/submissions/:id/versions` | Version history list |
| GET | `/submissions/:id/versions/:n` | Specific version data |
| GET | `/submissions/export/excel/:year` | Bulk Excel download |
| POST | `/submissions/:id/reminder` | Send manual reminder email |

### Faculty Sections (all require auth)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/faculty` | Get/save faculty information |
| GET/POST | `/courses` | Courses taught |
| PUT | `/courses/:id` | Update existing course |
| GET/POST | `/publications` | Research publications |
| GET/POST | `/grants` | Research grants and proposals |
| GET/POST | `/patents` | Patents |
| GET/POST | `/awards` | Awards and honours |
| GET/POST | `/reviews` | Paper reviews |
| GET/POST | `/activity` | Conference sessions, keynotes |
| GET/POST | `/innovation` | Teaching innovation, institutional contributions |
| GET/POST | `/legacy-sections` | Courseware, plans, other text sections |
| GET/POST | `/goals` | Part B faculty goals |
| POST | `/consultancy/save` | Save consultancy records |

### Rubrics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/rubrics` | All rubrics |
| POST | `/rubrics` | Create rubric |
| PUT | `/rubrics/:id` | Update rubric (with scoring_type, per_unit_marks) |
| DELETE | `/rubrics/:id` | Delete rubric |
| POST | `/rubrics/recalculate` | Re-run auto-allocation for all submissions |

### Form Builder
| Method | Endpoint | Description |
|---|---|---|
| GET | `/form-builder/schema` | Nested schema (sections + fields + children) |
| GET | `/form-builder/schema/flat` | Flat list for dropdowns |
| POST | `/form-builder/sections` | Create section |
| DELETE | `/form-builder/sections/:id` | Delete section (cascades fields) |
| POST | `/form-builder/fields` | Add field to section |
| DELETE | `/form-builder/fields/:id` | Delete field |
| GET | `/form-builder/responses` | Fetch faculty responses |
| POST | `/form-builder/responses` | Save/update responses (upsert) |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/sessions/active` | Active session + deadline status |
| POST | `/sessions` | Create session |
| PUT | `/sessions/:id` | Update (release forms, set deadline) |

### Registration (DOFA Office)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/registration/register-faculty` | Register new faculty user |
| GET | `/registration/users` | All users list |
| PUT | `/registration/users/:id` | Update user |
| DELETE | `/registration/users/:id` | Delete user |
| POST | `/registration/bulk-import` | CSV bulk import |
| GET/POST | `/registration/departments` | Department management |

### Evaluation
| Method | Endpoint | Description |
|---|---|---|
| GET | `/evaluation/sheet1/:submissionId` | Sheet 1 scores |
| PUT | `/evaluation/sheet1/:submissionId` | Save sheet 1 scores |
| GET/PUT | `/evaluation/sheet2/:submissionId` | Sheet 2 remarks |
| GET/PUT | `/evaluation/sheet3/:submissionId` | Sheet 3 increment |
| GET/PUT | `/evaluation/grading-parameters` | Grade boundaries |
| GET/PUT | `/evaluation/grade-increments` | Grade → increment mapping |

### Edit Requests
| Method | Endpoint | Description |
|---|---|---|
| POST | `/edit-requests` | Faculty submits edit request |
| GET | `/edit-requests/my-submission/:id` | Faculty's requests for submission |
| GET | `/edit-requests` | DOFA views all pending requests |
| PUT | `/edit-requests/:id` | DOFA approves/denies |

---

## 19. Project File Structure

```
faculty_appraisal_system/
├── index.html                  # Vite entry point
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite configuration
│
├── src/
│   ├── App.jsx                 # Root router — all role-based routes
│   ├── main.jsx                # React entry
│   ├── context/
│   │   ├── AuthContext.jsx     # JWT auth + user state (React Context)
│   │   └── SubmissionContext.jsx # Submission state for faculty forms
│   ├── components/
│   │   ├── Layout.jsx          # Shell (sidebar + main content area)
│   │   ├── Sidebar.jsx         # Navigation sidebar (role-aware links)
│   │   ├── FormActions.jsx     # Reusable "Save and Next" + "Previous" buttons
│   │   └── ProtectedRoute.jsx  # Role-guard wrapper component
│   ├── pages/
│   │   ├── LoginPage.jsx/css
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── Onboarding.jsx/css
│   │   ├── Dashboard.jsx/css          # Faculty home
│   │   ├── FacultyInformation.jsx/css
│   │   ├── CoursesTaught.jsx/css
│   │   ├── NewCourses.jsx
│   │   ├── Courseware.jsx
│   │   ├── TeachingInnovation.jsx
│   │   ├── ResearchPublications.jsx   # Largest form (61KB)
│   │   ├── ResearchGrants.jsx
│   │   ├── Patents.jsx
│   │   ├── TechnologyTransfer.jsx
│   │   ├── PaperReview.jsx
│   │   ├── ConferenceSessions.jsx/css
│   │   ├── KeynotesTalks.jsx/css
│   │   ├── AwardsHonours.jsx
│   │   ├── Consultancy.jsx
│   │   ├── ContinuingEducation.jsx
│   │   ├── InstitutionalContributions.jsx
│   │   ├── OtherActivities.jsx
│   │   ├── ResearchPlan.jsx
│   │   ├── TeachingPlan.jsx
│   │   ├── PartB.jsx/css              # Goal setting + final submit
│   │   ├── MySubmissionView.jsx/css   # Tabbed submission review + PDF download
│   │   ├── DynamicFormSection.jsx/css # Auto-save dynamic sections
│   │   ├── HelpCenter.jsx
│   │   ├── HODDashboard.jsx/css
│   │   ├── DOFADashboard.jsx/css      # DOFA reviewer
│   │   ├── DOFAReview.jsx/css         # Full review panel
│   │   ├── DOFAOfficeDashboard.jsx/css # Admin hub
│   │   ├── DOFARegistration.jsx/css   # User management
│   │   ├── FormBuilder.jsx/css        # Dynamic form builder
│   │   ├── FormRelease.jsx/css        # Session & deadline control
│   │   ├── RubricsManagement.jsx/css  # Scoring rules editor
│   │   ├── EvaluationSheet.jsx/css    # Sheet 1 — rubric scores
│   │   ├── EvaluationSheet2.jsx/css   # Sheet 2 — qualitative
│   │   └── EvaluationSheet3.jsx/css   # Sheet 3 — increment
│   └── services/
│       └── api.js                     # Axios wrapper (auth header injection)
│
└── backend/
    ├── server.js                       # Express app entry, CORS, routes
    ├── package.json                    # Backend dependencies
    ├── .env                            # DB credentials, JWT secret, SMTP
    ├── config/
    │   └── database.js                 # MySQL2 connection pool
    ├── middleware/
    │   ├── authMiddleware.js           # JWT verify + req.user inject
    │   └── submissionEditGuard.js      # Prevents edits on locked/submitted forms
    ├── controllers/                    # 22 controllers
    │   ├── authController.js
    │   ├── submissionsController.js    # Largest (960 lines) — snapshot, versioning
    │   ├── pdfController.js            # NEW — Puppeteer PDF generation
    │   ├── formBuilderController.js    # Dynamic sections CRUD
    │   ├── rubricsController.js        # Rubric CRUD with new scoring fields
    │   ├── evaluationController.js     # Sheets 1/2/3, grading
    │   ├── registrationController.js   # User management (32KB)
    │   └── [14 more section-specific controllers]
    ├── routes/                         # 21 route files
    ├── services/
    │   ├── rubricMapper.js             # Auto-allocation engine (29KB)
    │   ├── emailService.js             # Nodemailer templates
    │   └── schedulerService.js         # node-cron jobs
    ├── utils/
    │   ├── pdfTemplate.js              # NEW — HTML template for Puppeteer
    │   ├── facultyResolver.js          # Resolves faculty_id ↔ faculty_information.id
    │   └── resolveFacultyId.js         # Helper for FK resolution
    ├── uploads/                        # Multer file destination
    └── all_tables_schema.txt           # Full MySQL CREATE TABLE statements
```

---

## 20. Setup & Running Locally

### Prerequisites
- Node.js 18+
- MySQL 8.x
- npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd faculty_appraisal_system

# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup

```sql
CREATE DATABASE faculty_appraisal;
USE faculty_appraisal;
-- Run the migration scripts:
-- backend/all_tables_schema.txt contains all CREATE TABLE statements
```

```bash
# Run schema migrations
node backend/migrate_form_builder_v2.js  # Adds dynamic form tables + new rubric columns
```

### 3. Environment Variables

Create `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=faculty_appraisal

JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Faculty Appraisal System <your_email@gmail.com>

FRONTEND_URL=http://localhost:5173
```

### 4. Create Initial DOFA Office Account

```bash
node backend/reset-dofa.js
```
This creates (or resets) the default admin account:
- Email: `dofa_office@lnmiit.ac.in`
- Password: `admin123`

### 5. Run the Application

```bash
# Terminal 1 — Backend
cd backend
npm run dev    # nodemon → http://localhost:5000

# Terminal 2 — Frontend
npm run dev    # Vite → http://localhost:5173
```


## Key Design Decisions

### Why EAV for Dynamic Sections?
Using 3 fixed tables (`dynamic_sections`, `dynamic_fields`, `dynamic_responses`) instead of creating new SQL tables means:
- College admin can add new form sections without any developer involvement
- No database migration required after deployment
- JSON `value` column handles any field type (text, table rows, checkboxes)

### Why Puppeteer over jsPDF?
- Pixel-perfect LNMIIT-branded PDF using real CSS (gradients, fonts, tables)
- Dynamic sections automatically included — template just reads from DB
- Single HTML template is easier to maintain than jsPDF coordinate math
- Tradeoff: ~100MB Puppeteer binary, 3–8s generation time (acceptable for this use case)

### Why Debounced Autosave instead of real-time?
- Continuous saves would cause flickering and network congestion
- 2-second debounce saves after natural pauses in typing
- `isFirstLoad` guard prevents a save loop when the page loads existing DB data

### Why Versioned Snapshots?
Full JSON snapshots at each submission let DOFA diff faculty changes across re-submissions, providing accountability and audit trail without complex change-tracking logic.

---

*Last updated: April 2026 | Built by Sanskriti | LNMIIT Faculty Appraisal System v2.0*
