'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    // Clean up legacy PII from storage if it exists
    localStorage.removeItem('user');

    if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
      setToken(storedToken);
      // Fetch user profile securely without trusting localStorage
      fetch(`${API_BASE_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          setToken(null);
        }
      })
      .catch(err => {
          console.error("Failed to fetch user securely", err);
          localStorage.removeItem('token');
      })
      .finally(() => setIsLoading(false));
    } else {
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.removeItem('user'); // Ensure PII is stripped
    setToken(newToken);
    setUser(newUser);
    router.push('/');
  };

  const logout = async () => {
    // Revoke the token server-side before clearing it locally
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to revoke token server-side", err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
