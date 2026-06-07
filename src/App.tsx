import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Monitor from '@/pages/Monitor';
import MonitorRegion from '@/pages/MonitorRegion';
import Alerts from '@/pages/Alerts';
import AlertApproval from '@/pages/AlertApproval';
import Forecast from '@/pages/Forecast';
import Reports from '@/pages/Reports';
import UserAdmin from '@/pages/UserAdmin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="monitor/region/:id" element={<MonitorRegion />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="alerts/:id/approval" element={<AlertApproval />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute requiredRoles={['national', 'provincial']}>
                <UserAdmin />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
