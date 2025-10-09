import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface AdminContextType {
  adminUser: AdminUser | null;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  adminLogout: () => void;
  loading: boolean;
  checkAdminAuth: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/admin/auth-health', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAdminUser(response.data.admin);
    } catch (error: any) {
      console.error('Admin auth check failed:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/admin/login', { email, password });
      
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
      setAdminUser(response.data.admin);
      
      toast.success('Admin login successful!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Admin login failed';
      toast.error(message);
      return false;
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdminUser(null);
    toast.success('Admin logged out successfully');
  };

  const value = {
    adminUser,
    adminLogin,
    adminLogout,
    loading,
    checkAdminAuth,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};