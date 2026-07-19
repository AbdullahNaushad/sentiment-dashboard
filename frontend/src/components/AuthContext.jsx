import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://sentiment-dashboard-api-production.up.railway.app';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('token');
    const savedUser  = sessionStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/login`, { email, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    sessionStorage.setItem('token', t);
    sessionStorage.setItem('user', JSON.stringify(u));
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/register`, { name, email, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    sessionStorage.setItem('token', t);
    sessionStorage.setItem('user', JSON.stringify(u));
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}