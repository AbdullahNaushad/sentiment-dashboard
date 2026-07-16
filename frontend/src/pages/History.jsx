import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://sentiment-dashboard-api-production.up.railway.app';

const COLORS = {
  Positive: '#22c55e',
  Negative: '#ef4444',
  Neutral:  '#3b82f6',
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/history?limit=50`);
      setHistory(res.data.history);
    } catch {
      setError('Failed to load history. Make sure Flask is running and MongoDB is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis History</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Last 50 single analysis results stored in MongoDB
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-gray-500">Loading history...</div>
      )}

      {/* Empty */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🕓</div>
          <div className="text-gray-400">No history yet.</div>
          <div className="text-gray-500 text-sm mt-1">
            Analyze some tweets on the Single Analysis page first.
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-300">
              {history.length} records
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Text</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Sentiment</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Confidence</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3 text-gray-300 max-w-xs truncate">{r.raw_text}</td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                          background: COLORS[r.sentiment] + '20',
                          color: COLORS[r.sentiment],
                        }}
                      >
                        {r.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-300">
                      {(r.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
