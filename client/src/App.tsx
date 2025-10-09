import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { VoiceProvider } from './contexts/VoiceContext';

// Route Protection and Layouts
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import Layout from './components/Layout';
import AdminLayout from './components/admin/AdminLayout';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/admin/AdminLogin';

// User Pages
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import History from './pages/History';
import Profile from './pages/Profile';

// Admin Pages
import UserManagement from './pages/admin/UserManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import SystemReports from './pages/admin/SystemReports';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminProvider>
          <VoiceProvider>
            <Toaster position="top-right" />
            <Routes>
              {/* === Public Routes === */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* === Admin Protected Routes (Layout Route) === */}
              <Route 
                path="/admin" 
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <Outlet />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              >
                {/* The "index" route handles the base path '/admin' */}
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="categories" element={<CategoryManagement />} />
                <Route path="reports" element={<SystemReports />} />
              </Route>

              {/* === User Protected Routes (Layout Route) === */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* The "index" route handles the base path '/' */}
                <Route index element={<Dashboard />} /> 
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="income" element={<Income />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="budget" element={<Budget />} />
                <Route path="categories" element={<Categories />} />
                <Route path="reports" element={<Reports />} />
                <Route path="history" element={<History />} />
                <Route path="profile" element={<Profile />} />
              </Route>

            </Routes>
          </VoiceProvider>
        </AdminProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;