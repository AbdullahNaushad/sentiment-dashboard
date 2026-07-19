import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import SingleAnalysis from './pages/SingleAnalysis';
import BatchUpload from './pages/BatchUpload';
import History from './pages/History';
import ModelComparison from './pages/ModelComparison';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login"  element={!user ? <Login />  : <Navigate to="/single" replace />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/single" replace />} />

        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img src={require('./logo.jpg')} alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold">Sentiment Analysis On X</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/"           element={<Navigate to="/single" replace />} />
            <Route path="/single"     element={<SingleAnalysis />} />
            <Route path="/batch"      element={<BatchUpload />} />
            <Route path="/history"    element={<History />} />
            <Route path="/comparison" element={<ModelComparison />} />
          </Routes>
        </main>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}