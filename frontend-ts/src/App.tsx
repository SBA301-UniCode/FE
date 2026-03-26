import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthProvider'
import { useAuth } from './contexts/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import LandingPage from './pages/LandingPage'
import VerifyCertificate from './pages/VerifyCertificate'
import Courses from './pages/Courses'
import Dashboard from './pages/Dashboard'
import OAuthCallback from './pages/OAuthCallback'
import ProtectedRoute from './components/ProtectedRoute'
/* ── Phase 4: Learner Pages ── */
import MyLearning from './pages/MyLearning'
import CourseLearning from './pages/CourseLearning'
import MyCertificates from './pages/MyCertificates'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import QuizPage from './pages/QuizPage'
import CourseMindMap from './pages/CourseMindMap'
import Profile from './pages/Profile'
/* ── Phase 5: Instructor & Admin Pages ── */
import MyCourses from './pages/MyCourses'
import ManageCourseVideos from './pages/ManageCourseVideos'
import CourseDetail from './pages/CourseDetail'
import AdminPanel from './pages/AdminPanel'
import SyllabusManagement from './pages/SyllabusManagement'
import VerifyContent from './pages/VerifyContent'
import ChatWidget from './components/ChatWidget'

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-bg-page text-text-main text-center p-8">
    <div className="text-8xl font-black leading-none bg-[linear-gradient(135deg,#0056D2,#003E99)] bg-clip-text text-transparent">404</div>
    <p className="text-xl font-bold mt-4 mb-2 text-text-main">Trang bạn tìm không tồn tại</p>
    <p className="text-[0.92rem] text-text-muted max-w-[400px] mb-6">Trang này có thể đã bị xóa, chuyển đi, hoặc URL không chính xác.</p>
    <Link to="/" className="inline-flex items-center gap-1.5 px-6 py-3 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white rounded-[10px] no-underline font-bold text-[0.95rem] shadow-[0_4px_14px_rgba(0,86,210,0.25)]">
      ← Về trang chủ
    </Link>
  </div>
)

/** Route wrapper: Admin/Instructor → Dashboard, Student/Guest → Courses catalog */
const CoursesOrDashboard = () => {
  // Must use useAuth() since AuthProvider stores user in React state, not localStorage
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, isAuthenticated } = useAuth()
  if (isAuthenticated && user) {
    const roles = (user.roles || []).map((r) => String((r as unknown as Record<string, unknown>).roleCode || (r as unknown as Record<string, unknown>).roleName || '').toUpperCase())
    if (roles.includes('ADMIN') || roles.includes('INSTRUCTOR')) return <Dashboard />
  }
  return <Courses />
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: '#1F1F1F', color: '#fff', borderRadius: '8px', fontSize: '0.9rem' },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/my-courses" element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}><MyCourses /></ProtectedRoute>} />
          <Route path="/my-learning" element={<ProtectedRoute allowedRoles={['LEARNER']}><MyLearning /></ProtectedRoute>} />
          <Route path="/my-courses/:courseSlug/videos" element={<ProtectedRoute><ManageCourseVideos /></ProtectedRoute>} />
          <Route path="/courses" element={<CoursesOrDashboard />} />
          <Route path="/courses/:courseSlug" element={<CourseDetail />} />
          <Route path="/verify-certificate" element={<VerifyCertificate />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/learning/:courseSlug" element={<ProtectedRoute allowedRoles={['LEARNER']}><CourseLearning /></ProtectedRoute>} />
          <Route path="/learning/:courseSlug/mindmap" element={<ProtectedRoute allowedRoles={['LEARNER']}><CourseMindMap /></ProtectedRoute>} />
          <Route path="/my-certificates" element={<ProtectedRoute allowedRoles={['LEARNER']}><MyCertificates /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPanel /></ProtectedRoute>} />
          <Route path="/syllabuses" element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}><SyllabusManagement /></ProtectedRoute>} />
          <Route path="/quiz/:contentId" element={<ProtectedRoute allowedRoles={['LEARNER']}><QuizPage /></ProtectedRoute>} />
          <Route path="/verify-content" element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}><VerifyContent /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatWidget />
      </Router>
    </AuthProvider>
  )
}

export default App
