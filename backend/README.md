# Faculty Appraisal System - Backend API

Backend server for the Faculty Appraisal System built with Express.js and MySQL.

## 🚀 Features

- RESTful API endpoints for all faculty appraisal modules
- MySQL database for data persistence
- File upload handling for certificates and documents
- CORS enabled for frontend integration
- Transaction support for complex operations

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env` file and update with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=faculty_appraisal
   DB_PORT=3306
   PORT=5000
   ```

3. **Create database:**
   - Open MySQL and run the schema file:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── facultyController.js
│   ├── coursesController.js
│   ├── publicationsController.js
│   ├── grantsController.js
│   ├── patentsController.js
│   └── reviewsController.js
├── routes/
│   ├── facultyRoutes.js
│   ├── coursesRoutes.js
│   ├── publicationsRoutes.js
│   ├── grantsRoutes.js
│   ├── patentsRoutes.js
│   └── reviewsRoutes.js
├── middleware/
│   └── upload.js             # File upload middleware
├── models/                    # (Future: Database models)
├── database/
│   └── schema.sql            # Database schema
├── uploads/                  # Uploaded files storage
├── .env                      # Environment variables
├── .gitignore
├── server.js                 # Main server file
└── package.json

```

## 🔌 API Endpoints

### Faculty Information
- `GET /api/faculty` - Get all faculty members
- `GET /api/faculty/:id` - Get faculty by ID
- `POST /api/faculty` - Create new faculty
- `PUT /api/faculty/:id` - Update faculty
- `DELETE /api/faculty/:id` - Delete faculty

### Courses
- `GET /api/courses/faculty/:facultyId` - Get courses by faculty
- `POST /api/courses` - Create new course
- `GET /api/courses/new/faculty/:facultyId` - Get new courses developed
- `POST /api/courses/new` - Create new course (with file upload)
- `DELETE /api/courses/:id` - Delete course

### Publications
- `GET /api/publications/faculty/:facultyId` - Get publications by faculty
- `POST /api/publications` - Create publication (with authors)
- `DELETE /api/publications/:id` - Delete publication

### Research Grants
- `GET /api/grants/faculty/:facultyId` - Get grants by faculty
- `POST /api/grants` - Create grant (with evidence file)
- `DELETE /api/grants/:id` - Delete grant
- `GET /api/grants/proposals/faculty/:facultyId` - Get proposals
- `POST /api/grants/proposals` - Create proposal
- `DELETE /api/grants/proposals/:id` - Delete proposal

### Patents
- `GET /api/patents/faculty/:facultyId` - Get patents by faculty
- `POST /api/patents` - Create patent (with certificate file)
- `DELETE /api/patents/:id` - Delete patent

### Paper Reviews
- `GET /api/reviews/faculty/:facultyId` - Get reviews by faculty
- `POST /api/reviews` - Create review
- `DELETE /api/reviews/:id` - Delete review

### Health Check
- `GET /api/health` - Server health status

## 📦 Database Schema

The database includes the following main tables:
- `faculty_information` - Faculty details
- `courses_taught` - Courses taught by faculty
- `new_courses` - New courses developed
- `research_publications` - Research publications
- `authors` & `editors` - Publication authors/editors
- `research_grants` - External grants received
- `submitted_proposals` - Research proposals
- `patents` - Patent information
- `paper_reviews` - Paper reviews
- Plus tables for other activities

## 🔒 File Upload

- Maximum file size: 10MB (configurable in .env)
- Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG
- Files stored in `uploads/` directory
- Accessible via `/uploads/:filename`

## 🌐 CORS

CORS is enabled for all origins in development. Update the CORS configuration in `server.js` for production.

## 📝 Environment Variables

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=faculty_appraisal
DB_PORT=3306
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## 🚨 Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## 📄 License

ISC

## 👤 Author

Faculty Appraisal System Team
