import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import MyCourses from './pages/MyCourses'
import ManageCourseVideos from './pages/ManageCourseVideos'
import MyLearning from './pages/MyLearning'
import CourseLearning from './pages/CourseLearning'
import MyCertificates from './pages/MyCertificates'
import VerifyCertificate from './pages/VerifyCertificate'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import OAuthCallback from './pages/OAuthCallback'
import AdminPanel from './pages/AdminPanel'
import SyllabusManagement from './pages/SyllabusManagement'
import QuizPage from './pages/QuizPage'
import CourseMindMap from './pages/CourseMindMap'
import VerifyContent from './pages/VerifyContent'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-learning"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <MyLearning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses/:courseId/videos"
            element={
              <ProtectedRoute>
                <ManageCourseVideos />
              </ProtectedRoute>
            }
          />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/verify-certificate" element={<VerifyCertificate />} />
          <Route
            path="/payment"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route
            path="/learning/:courseId"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <CourseLearning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning/:courseId/mindmap"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <CourseMindMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-certificates"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <MyCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/syllabuses"
            element={
              <ProtectedRoute>
                <SyllabusManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:contentId"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify-content"
            element={
              <ProtectedRoute>
                <VerifyContent />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
