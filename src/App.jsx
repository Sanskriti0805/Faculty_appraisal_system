import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FacultyInformation from './pages/FacultyInformation'
import CoursesTaught from './pages/CoursesTaught'
import NewCourses from './pages/NewCourses'
import Courseware from './pages/Courseware'
import TeachingInnovation from './pages/TeachingInnovation'
import ResearchPublications from './pages/ResearchPublications'
import ResearchGrants from './pages/ResearchGrants'
import SubmittedProposals from './pages/SubmittedProposals'
import Patents from './pages/Patents'
import TechnologyTransfer from './pages/TechnologyTransfer'
import PaperReview from './pages/PaperReview'
import ConferenceSessions from './pages/ConferenceSessions'
import KeynotesTalks from './pages/KeynotesTalks'
import ConferencesOutside from './pages/ConferencesOutside'
import OtherActivities from './pages/OtherActivities'
import AwardsHonours from './pages/AwardsHonours'
import Consultancy from './pages/Consultancy'
import ContinuingEducation from './pages/ContinuingEducation'
import InstitutionalContributions from './pages/InstitutionalContributions'
import OtherImportantActivities from './pages/OtherImportantActivities'
import ResearchPlan from './pages/ResearchPlan'
import TeachingPlan from './pages/TeachingPlan'
import PartB from './pages/PartB'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="faculty-information" element={<FacultyInformation />} />
          <Route path="courses-taught" element={<CoursesTaught />} />
          <Route path="new-courses" element={<NewCourses />} />
          <Route path="courseware" element={<Courseware />} />
          <Route path="teaching-innovation" element={<TeachingInnovation />} />
          <Route path="research-publications" element={<ResearchPublications />} />
          <Route path="research-grants" element={<ResearchGrants />} />
          <Route path="submitted-proposals" element={<SubmittedProposals />} />
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
      </Routes>
    </Router>
  )
}

export default App

