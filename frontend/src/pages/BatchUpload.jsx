import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const API = 'https://sentiment-dashboard-api-production.up.railway.app';

const COLORS = {
  Positive: '#22c55e',
  Negative: '#ef4444',
  Neutral:  '#3b82f6',
};

export default function BatchUpload() {
  const [file, setFile]         = useState(null);
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef                 = useRef();

  const handleFile = (f) => {
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError('');
    } else {
      setError('Please upload a CSV file.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/analyze-batch`, form);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to API.');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    if (!results) return;
    try {
      const res = await axios.post(
        `${API}/export-csv`,
        { results: results.results },
        { responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', 'sentiment_results.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Export failed.');
    }
  };

  const pieData = results
    ? Object.entries(results.summary).map(([name, value]) => ({ name, value }))
    : [];

  const barData = results
    ? results.results.slice(0, 20).map((r, i) => ({
        name: `#${i + 1}`,
        Positive: Math.round(r.probabilities.Positive * 100),
        Negative: Math.round(r.probabilities.Negative * 100),
        Neutral:  Math.round(r.probabilities.Neutral  * 100),
      }))
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Batch CSV Analysis</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Upload a CSV file with a "text" column to analyze multiple tweets at once
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6 ${
          dragging
            ? 'border-blue-500 bg-blue-950'
            : 'border-gray-700 bg-gray-900 hover:border-gray-500'
        }`}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="text-4xl mb-3">📂</div>
        {file ? (
          <>
            <div className="text-white font-medium">{file.name}</div>
            <div className="text-gray-400 text-sm mt-1">
              {(file.size / 1024).toFixed(1)} KB — Click to change
            </div>
          </>
        ) : (
          <>
            <div className="text-gray-300 font-medium">
              Drag & drop a CSV file here
            </div>
            <div className="text-gray-500 text-sm mt-1">
              or click to browse — must have a "text" column
            </div>
          </>
        )}
      </div>

      {/* Analyze Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={analyze}
          disabled={!file || loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze CSV'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{results.total}</div>
              <div className="text-xs text-gray-400 mt-1">Total Tweets</div>
            </div>
            {Object.entries(results.summary).map(([label, count]) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl font-bold" style={{ color: COLORS[label] }}>
                  {count}
                </div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Donut Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-sm font-medium text-gray-300 mb-4">
                Sentiment Distribution
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-sm font-medium text-gray-300 mb-4">
                Confidence per Tweet (first 20)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                  <Bar dataKey="Positive" fill={COLORS.Positive} radius={[2,2,0,0]} />
                  <Bar dataKey="Negative" fill={COLORS.Negative} radius={[2,2,0,0]} />
                  <Bar dataKey="Neutral"  fill={COLORS.Neutral}  radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={exportCSV}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⬇ Export Enriched CSV
            </button>
          </div>

          {/* Results Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="text-sm font-medium text-gray-300">Results Table</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">#</th>
                    <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Text</th>
                    <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Sentiment</th>
                    <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r, i) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
