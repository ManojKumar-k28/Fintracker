import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  // Note: The function signature in the type is also updated to match
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.log('Auth check failed, user not logged in');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // === UPDATED LOGIN FUNCTION ===
  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      // The payload is now simplified. We let the backend determine
      // whether the identifier is a username or an email.
      const payload = { identifier, password };

      const response = await axios.post('/api/auth/login', payload, { withCredentials: true });

      setUser(response.data.user);
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Login error:', error.response?.data);
      if (error.response?.data?.errors) {
        const firstError = error.response.data.errors[0]?.msg;
        toast.error(firstError || 'Validation failed');
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/auth/register', { username, email, password });
      setUser(response.data.user);
      toast.success('Registration successful!');
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await axios.post('/api/auth/logout');
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout request failed:', error);
      setUser(null);
      toast.success('Logged out successfully'); // Still show success to the user
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};