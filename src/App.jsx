import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AppAlertHost from './components/AppAlertHost'
import AppDialogHost from './components/AppDialogHost'

// Public pages
import { SubmissionProvider } from './context/SubmissionContext'
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

// Dofa Registration (migrated from Admin)
const DofaRegistration = lazy(() => import('./pages/DofaRegistration'))

// HoD
const HODDashboard = lazy(() => import('./pages/HODDashboard'))

// Faculty form pages
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
const TalksAndConferences = lazy(() => import('./pages/TalksAndConferences'))
const OtherActivities = lazy(() => import('./pages/OtherActivities'))
const AwardsHonours = lazy(() => import('./pages/AwardsHonours'))
const Consultancy = lazy(() => import('./pages/Consultancy'))
const ContinuingEducation = lazy(() => import('./pages/ContinuingEducation'))
const InstitutionalContributions = lazy(() => import('./pages/InstitutionalContributions'))
const OtherImportantActivities = lazy(() => import('./pages/OtherImportantActivities'))
const ResearchPlan = lazy(() => import('./pages/ResearchPlan'))
const TeachingPlan = lazy(() => import('./pages/TeachingPlan'))
const PartB = lazy(() => import('./pages/PartB'))
const DynamicFormSection = lazy(() => import('./pages/DynamicFormSection'))
const MySubmissionView = lazy(() => import('./pages/MySubmissionView'))
const HelpCenter = lazy(() => import('./pages/HelpCenter'))

// Dofa pages
const DofaDashboard = lazy(() => import('./pages/DofaDashboard'))
const DofaReview = lazy(() => import('./pages/DofaReview'))
const DofaOfficeDashboard = lazy(() => import('./pages/DofaOfficeDashboard'))
const RubricsManagement = lazy(() => import('./pages/RubricsManagement'))
const EvaluationSheet = lazy(() => import('./pages/EvaluationSheet'))
const EvaluationSheet2 = lazy(() => import('./pages/EvaluationSheet2'))
const EvaluationSheet3 = lazy(() => import('./pages/EvaluationSheet3'))
const SessionLogs = lazy(() => import('./pages/SessionLogs'))
const FormBuilder = lazy(() => import('./pages/FormBuilder'))
const FormRelease = lazy(() => import('./pages/FormRelease'))

const LoadingFallback = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', fontSize: '1.2rem', color: '#5b6e9f'
  }}>
    Loading...
  </div>
)

// Root redirect based on role
const RootRedirect = () => {
  // The ProtectedRoute wrapping this will redirect to /login if not authed
  // If authed, Layout + Dashboard will render
  return null
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppAlertHost />
        <AppDialogHost />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* -- Public Routes -- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* -- Onboarding (first-login profile completion) -- */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />



            {/* -- HoD Routes -- */}
            <Route path="/hod/dashboard" element={
              <ProtectedRoute allowedRoles={['hod']}>
                <HODDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hod/review/:id" element={
              <ProtectedRoute allowedRoles={['hod']}>
                <DofaReview />
              </ProtectedRoute>
            } />

            {/* -- Faculty Routes (with Layout) -- */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <SubmissionProvider>
                  <Layout />
                </SubmissionProvider>
              </ProtectedRoute>
            }>
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
              <Route path="talks-and-conferences" element={<TalksAndConferences />} />
              <Route path="other-activities" element={<OtherActivities />} />
              <Route path="awards-honours" element={<AwardsHonours />} />
              <Route path="consultancy" element={<Consultancy />} />
              <Route path="continuing-education" element={<ContinuingEducation />} />
              <Route path="institutional-contributions" element={<InstitutionalContributions />} />
              <Route path="other-important-activities" element={<OtherImportantActivities />} />
              <Route path="research-plan" element={<ResearchPlan />} />
              <Route path="teaching-plan" element={<TeachingPlan />} />
              <Route path="part-b" element={<PartB />} />
              <Route path="faculty/dynamic/:sectionId" element={<DynamicFormSection />} />
              <Route path="my-submission" element={<MySubmissionView />} />
              <Route path="help" element={<HelpCenter />} />
            </Route>

            {/* -- Dofa Routes -- */}
            <Route path="/Dofa" element={
              <ProtectedRoute allowedRoles={['Dofa']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<DofaDashboard />} />
              <Route path="dashboard" element={<DofaDashboard />} />
              <Route path="rubrics" element={<RubricsManagement />} />
              <Route path="review/:id" element={<DofaReview />} />
              <Route path="sheet1" element={<EvaluationSheet />} />
              <Route path="evaluation" element={<EvaluationSheet />} />
              <Route path="sheet2" element={<EvaluationSheet2 />} />
              <Route path="sheet3" element={<EvaluationSheet3 />} />
              <Route path="logs" element={<SessionLogs />} />
              <Route path="registration" element={<DofaRegistration />} />
              <Route path="manage-users" element={<DofaRegistration />} />
              <Route path="form-release" element={<FormRelease />} />
              <Route path="help" element={<HelpCenter />} />
            </Route>

            {/* -- Dofa Office Routes -- */}
            <Route path="/Dofa-office" element={
              <ProtectedRoute allowedRoles={['Dofa_office']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<DofaOfficeDashboard />} />
              <Route path="dashboard" element={<DofaOfficeDashboard />} />
              <Route path="rubrics" element={<RubricsManagement />} />
              <Route path="sheet1" element={<EvaluationSheet />} />
              <Route path="evaluation" element={<EvaluationSheet />} />
              <Route path="sheet2" element={<EvaluationSheet2 />} />
              <Route path="sheet3" element={<EvaluationSheet3 />} />
              <Route path="logs" element={<SessionLogs />} />
              <Route path="form-builder" element={<FormBuilder />} />
              <Route path="registration" element={<DofaRegistration />} />
              <Route path="manage-users" element={<DofaRegistration />} />
              <Route path="form-release" element={<FormRelease />} />
              <Route path="review/:id" element={<DofaReview />} />
              <Route path="help" element={<HelpCenter />} />
            </Route>

            {/* -- Catch-all -> login -- */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App

