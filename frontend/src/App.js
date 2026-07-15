import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SingleAnalysis from './pages/SingleAnalysis';
import BatchUpload from './pages/BatchUpload';
import History from './pages/History';
import ModelComparison from './pages/ModelComparison';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/single" replace />} />
            <Route path="/single" element={<SingleAnalysis />} />
            <Route path="/batch" element={<BatchUpload />} />
            <Route path="/history" element={<History />} />
            <Route path="/comparison" element={<ModelComparison />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;