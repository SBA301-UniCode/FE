import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthProvider'
import Login from './pages/Login'
import Register from './pages/Register'
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
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'

const NotFound = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', color: 'var(--text-main)', textAlign: 'center', padding: '2rem' }}>
    <div style={{ fontSize: '8rem', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg, #0056D2, #003E99)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</div>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--text-main)' }}>Trang bạn tìm không tồn tại</p>
    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 0 1.5rem' }}>Trang này có thể đã bị xóa, chuyển đi, hoặc URL không chính xác.</p>
    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.5rem', background: 'var(--primary-gradient)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(0,86,210,0.25)' }}>← Về trang chủ</Link>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1F1F1F',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '0.9rem',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
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
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute allowedRoles={['LEARNER']}>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
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
              <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
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
              <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                <VerifyContent />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
