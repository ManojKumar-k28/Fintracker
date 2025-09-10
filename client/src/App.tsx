import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { VoiceProvider } from './contexts/VoiceContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import History from './pages/History';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <VoiceProvider>
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/income" element={<Income />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/budget" element={<Budget />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </VoiceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;