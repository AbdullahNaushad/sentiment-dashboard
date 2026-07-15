import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/single',     label: 'Single Analysis',   icon: '💬' },
  { path: '/batch',      label: 'Batch Upload',       icon: '📂' },
  { path: '/history',    label: 'History',            icon: '🕓' },
  { path: '/comparison', label: 'Model Comparison',   icon: '📊' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg">
            🐦
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Sentiment AI</div>
            <div className="text-xs text-gray-400">Twitter Analysis</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">Powered by</div>
        <div className="text-xs text-gray-400 font-medium mt-0.5">
          TF-IDF + Linear SVM
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-400">API Online</span>
        </div>
      </div>
    </aside>
  );
}
