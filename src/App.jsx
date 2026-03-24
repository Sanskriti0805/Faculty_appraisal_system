import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const FacultyInformation = lazy(() => import('./pages/FacultyInformation'))
const CoursesTaught = lazy(() => import('./pages/CoursesTaught'))
const NewCourses = lazy(() => import('./pages/NewCourses'))
const Courseware = lazy(() => import('./pages/Courseware'))
const TeachingInnovation = lazy(() => import('./pages/TeachingInnovation'))
const ResearchPublications = lazy(() => import('./pages/ResearchPublications'))
const ResearchGrants = lazy(() => import('./pages/ResearchGrants'))
const Patents = lazy(() => import('./pages/Patents'))
const TechnologyTransfer = lazy(() => import('./pages/TechnologyTransfer'))
const PaperReview = lazy(() => import('./pages/PaperReview'))
const ConferenceSessions = lazy(() => import('./pages/ConferenceSessions'))
const KeynotesTalks = lazy(() => import('./pages/KeynotesTalks'))
const ConferencesOutside = lazy(() => import('./pages/ConferencesOutside'))
const OtherActivities = lazy(() => import('./pages/OtherActivities'))
const AwardsHonours = lazy(() => import('./pages/AwardsHonours'))
const Consultancy = lazy(() => import('./pages/Consultancy'))
const ContinuingEducation = lazy(() => import('./pages/ContinuingEducation'))
const InstitutionalContributions = lazy(() => import('./pages/InstitutionalContributions'))
const OtherImportantActivities = lazy(() => import('./pages/OtherImportantActivities'))
const ResearchPlan = lazy(() => import('./pages/ResearchPlan'))
const TeachingPlan = lazy(() => import('./pages/TeachingPlan'))
const PartB = lazy(() => import('./pages/PartB'))

// DOFA and DOFA Office pages
const DOFADashboard = lazy(() => import('./pages/DOFADashboard'))
const DOFAReview = lazy(() => import('./pages/DOFAReview'))
const DOFAOfficeDashboard = lazy(() => import('./pages/DOFAOfficeDashboard'))
const RubricsManagement = lazy(() => import('./pages/RubricsManagement'))
const EvaluationSheet = lazy(() => import('./pages/EvaluationSheet'))

// Loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
    color: '#5b6e9f'
  }}>
    Loading...
  </div>
)

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Faculty Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="faculty-information" element={<FacultyInformation />} />
            <Route path="courses-taught" element={<CoursesTaught />} />
            <Route path="new-courses" element={<NewCourses />} />
            <Route path="courseware" element={<Courseware />} />
            <Route path="teaching-innovation" element={<TeachingInnovation />} />
            <Route path="research-publications" element={<ResearchPublications />} />
            <Route path="research-grants" element={<ResearchGrants />} />
            <Route path="patents" element={<Patents />} />
            <Route path="technology-transfer" element={<TechnologyTransfer />} />
            <Route path="paper-review" element={<PaperReview />} />
            <Route path="conference-sessions" element={<ConferenceSessions />} />
            <Route path="keynotes-talks" element={<KeynotesTalks />} />
            <Route path="conferences-outside" element={<ConferencesOutside />} />
            <Route path="other-activities" element={<OtherActivities />} />
            <Route path="awards-honours" element={<AwardsHonours />} />
            <Route path="consultancy" element={<Consultancy />} />
            <Route path="continuing-education" element={<ContinuingEducation />} />
            <Route path="institutional-contributions" element={<InstitutionalContributions />} />
            <Route path="other-important-activities" element={<OtherImportantActivities />} />
            <Route path="research-plan" element={<ResearchPlan />} />
            <Route path="teaching-plan" element={<TeachingPlan />} />
            <Route path="part-b" element={<PartB />} />
          </Route>

          {/* DOFA Routes */}
          <Route path="/dofa" element={<Layout />}>
            <Route index element={<DOFADashboard />} />
            <Route path="dashboard" element={<DOFADashboard />} />
            <Route path="rubrics" element={<RubricsManagement />} />
            <Route path="review/:id" element={<DOFAReview />} />
            <Route path="sheet1" element={<EvaluationSheet />} />
            <Route path="evaluation" element={<EvaluationSheet />} />
            <Route path="sheet2" element={<div style={{padding:'40px'}}><h2>Sheet 2</h2><p>Coming soon...</p></div>} />
            <Route path="sheet3" element={<div style={{padding:'40px'}}><h2>Sheet 3</h2><p>Coming soon...</p></div>} />
          </Route>

          {/* DOFA Office Routes */}
          <Route path="/dofa-office" element={<Layout />}>
            <Route path="dashboard" element={<DOFAOfficeDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App

