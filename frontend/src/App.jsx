import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationsListPage from './pages/ApplicationsListPage';
import NewApplicationPage from './pages/NewApplicationPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import FindingsPage from './pages/FindingsPage';
import VerificationPage from './pages/VerificationPage';
import RegulatoryRAGPage from './pages/RegulatoryRAGPage';
import EvidencePage from './pages/EvidencePage';
import RectificationsPage from './pages/RectificationsPage';
import AuditPage from './pages/AuditPage';
import AdminRulesPage from './pages/AdminRulesPage';
import AdminUsersPage from './pages/AdminUsersPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Application Routes inside AppLayout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ApplicationsListPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/new"
            element={
              <ProtectedRoute roles={['institution_user', 'admin']}>
                <AppLayout>
                  <NewApplicationPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ApplicationDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/findings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <FindingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <VerificationPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/regulations"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <RegulatoryRAGPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/evidence"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EvidencePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rectifications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <RectificationsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AuditPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Exclusive Routes */}
          <Route
            path="/admin/rules"
            element={
              <ProtectedRoute roles={['admin']}>
                <AppLayout>
                  <AdminRulesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AppLayout>
                  <AdminUsersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
