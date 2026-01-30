# Faculty Appraisal System

A full-stack Faculty Appraisal System with React frontend and Express.js + MySQL backend for managing academic and administrative information.

## Features

- **Dashboard**: Welcome page with navigation guidance
- **Part A Sections**:
  - Faculty Information (Personal, Contact, Employment, Qualifications)
  - Courses Taught
  - New Courses Developed (UG, Masters, Doctoral)
  - Research Publications (Journal, Conference, Books, Book Chapters)
  - Research & Development (External Grants & Proposals)
  - Patents (Granted, Published, Applied)
  - Paper Reviews
  - And more...
- **Part B**: Additional appraisal sections
- **Backend API**: RESTful API with MySQL database
- **File Uploads**: Support for CIF files, certificates, evidence documents

## Tech Stack

### Frontend
- React 18
- React Router v6
- Axios (API client)
- Vite (Build tool)
- Lucide React (Icons)

### Backend
- Node.js + Express.js
- MySQL Database
- Multer (File uploads)
- CORS enabled

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

### Installation

#### 1. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit backend/.env with your MySQL credentials

# Create database and tables
mysql -u root -p
# Then in MySQL prompt:
source C:/path/to/faculty_appraisal_system/backend/database/schema.sql

# Start backend server
npm run dev
# Backend runs on http://localhost:5000
```

#### 2. Setup Frontend

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Configure environment variables (optional)
# Edit .env if needed (API URL defaults to http://localhost:5000/api)

# Start frontend development server
npm run dev
# Frontend runs on http://localhost:5173
```

#### 3. Access the Application

Open your browser and visit: `http://localhost:5173`

## Project Structure

```
faculty_appraisal_system/
├── src/                        # Frontend source
│   ├── components/
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   ├── Header.jsx          # Top navigation bar
│   │   └── Sidebar.jsx         # Side navigation menu
│   ├── pages/
│   │   ├── Dashboard.jsx       # Landing page
│   │   ├── FacultyInformation.jsx
│   │   ├── CoursesTaught.jsx
│   │   ├── NewCourses.jsx
│   │   ├── ResearchPublications.jsx
│   │   ├── ResearchGrants.jsx
│   │   ├── Patents.jsx
│   │   ├── PaperReview.jsx
│   │   └── ...more pages
│   ├── services/               # API service layer
│   │   ├── api.js              # Axios configuration
│   │   ├── facultyService.js
│   │   ├── coursesService.js
│   │   ├── publicationsService.js
│   │   ├── grantsService.js
│   │   ├── patentsService.js
│   │   └── reviewsService.js
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx               # Application entry point
│   └── index.css              # Global styles
├── backend/                    # Backend API
│   ├── config/
│   │   └── database.js         # MySQL configuration
│   ├── controllers/            # Business logic
│   ├── routes/                 # API routes
│   ├── middleware/
│   │   └── upload.js           # File upload handling
│   ├── database/
│   │   └── schema.sql          # Database schema
│   ├── uploads/                # Uploaded files
│   ├── server.js               # Express server
│   ├── .env                    # Backend config
│   └── package.json
├── .env                        # Frontend config
├── index.html
├── package.json                # Frontend dependencies
└── vite.config.js
```

## API Endpoints

See `backend/README.md` for complete API documentation.

**Base URL:** `http://localhost:5000/api`

- `GET/POST/PUT/DELETE /faculty` - Faculty management
- `GET/POST /courses` - Courses taught
- `GET/POST /courses/new` - New courses developed
- `GET/POST /publications` - Research publications
- `GET/POST /grants` - Research grants
- `GET/POST /patents` - Patents
- `GET/POST /reviews` - Paper reviews

## Available Scripts

### Frontend
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `cd backend && npm run dev` - Start backend server with nodemon (port 5000)
- `cd backend && npm start` - Start backend server

## Environment Variables

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=faculty_appraisal
DB_PORT=3306
```

## Database Schema

The system uses MySQL with the following main tables:
- `faculty_information` - Faculty details
- `courses_taught` - Courses taught by faculty
- `new_courses` - New courses developed
- `research_publications` - Publications with authors/editors
- `research_grants` - External grants
- `submitted_proposals` - Research proposals
- `patents` - Patent information
- `paper_reviews` - Paper reviews

See `backend/database/schema.sql` for complete schema.

## Features Implemented

✅ Full CRUD operations for all modules
✅ File upload support (CIF, certificates, evidence)
✅ Dynamic forms with validation
✅ RESTful API architecture
✅ MySQL database with relationships
✅ Transaction support for complex operations
✅ Error handling and loading states

## Future Enhancements

- Authentication and Authorization (JWT)
- Role-based access control
- Advanced form validation
- Report generation (PDF)
- Data export (Excel, CSV)
- Email notifications
- Admin dashboard
- Search and filtering

## Color Scheme

- Primary: #5b6e9f (Blue)
- Danger: #d64550 (Red)
- Dark: #2c3e50
- Background: #e8ecf1
- White: #ffffff

## License

This project is created for educational purposes.

## Author

Faculty Appraisal System Team
