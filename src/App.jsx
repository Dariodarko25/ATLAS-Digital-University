import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import ClassroomErrorBoundary from './components/ClassroomErrorBoundary.jsx'
import Layout from './components/Layout.jsx'
import Admin from './pages/Admin.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ClassroomPage from './pages/ClassroomPage.jsx'
import Community from './pages/Community.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explore from './pages/Explore.jsx'
import JourneyPage from './pages/JourneyPage.jsx'
import LabPage from './pages/LabPage.jsx'
import Onboarding from './pages/Onboarding.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route
            path="/classroom"
            element={
              <ClassroomErrorBoundary>
                <ClassroomPage />
              </ClassroomErrorBoundary>
            }
          />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
