# Faculty Appraisal System

A modern React-based Faculty Appraisal System for managing academic and administrative information.

## Features

- **Dashboard**: Welcome page with navigation guidance
- **Part A Sections**:
  - Faculty Information (Personal, Contact, Employment, Qualifications)
  - Publication Management
  - Expert Talk Records
  - Event Attended Tracking
  - Event Organized Documentation
  - Student Management
  - Faculty Collaboration
- **Part B**: Additional appraisal sections

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd faculty_appraisal_system
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit: `http://localhost:5173`

## Project Structure

```
faculty_appraisal_system/
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   ├── Header.jsx          # Top navigation bar
│   │   └── Sidebar.jsx         # Side navigation menu
│   ├── pages/
│   │   ├── Dashboard.jsx       # Landing page
│   │   ├── FacultyInformation.jsx
│   │   ├── Publication.jsx
│   │   ├── ExpertTalk.jsx
│   │   ├── EventAttended.jsx
│   │   ├── EventOrganized.jsx
│   │   ├── Student.jsx
│   │   ├── Faculty.jsx
│   │   └── PartB.jsx
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx               # Application entry point
│   └── index.css              # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Technologies Used

- **React 18** - UI Framework
- **React Router v6** - Navigation and Routing
- **Vite** - Build Tool and Dev Server
- **Lucide React** - Icon Library
- **CSS3** - Styling

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Color Scheme

- Primary: #5b6e9f (Blue)
- Danger: #d64550 (Red)
- Dark: #2c3e50
- Background: #e8ecf1
- White: #ffffff

## Future Enhancements

- Authentication and Authorization
- Backend API Integration
- Form validation and submission
- Data persistence
- File upload functionality
- Report generation
- Admin dashboard

## License

This project is created for educational purposes.
