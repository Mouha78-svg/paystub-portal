import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './theme';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import FirstLogin from './pages/FirstLogin';
import Dashboard from './pages/Dashboard';
import Payslips from './pages/Payslips';
import Profile from './pages/Profile';
import Sync from './pages/Sync';
import AdminUsers from './pages/AdminUsers';

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/first-login" element={<FirstLogin />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="payslips" element={<Payslips />} />
              <Route path="profile" element={<Profile />} />
              <Route path="sync" element={<AdminRoute><Sync /></AdminRoute>} />
              <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
