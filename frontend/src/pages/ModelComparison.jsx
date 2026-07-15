import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API = 'http://localhost:5000';

const MODEL_COLORS = {
  'Logistic Regression': '#3b82f6',
  'Linear SVM':          '#22c55e',
  'Naive Bayes':         '#f59e0b',
};

const CLASS_COLORS = {
  Negative: '#ef4444',
  Neutral:  '#3b82f6',
  Positive: '#22c55e',
};

export default function ModelComparison() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    axios.get(`${API}/model-comparison`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => {
        setError('Could not load model comparison. Make sure train_model.py has been run.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (error)   return (
    <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
      {error}
    </div>
  );

  const models   = Object.keys(data).filter(k => k !== '_meta');
  const bestModel = data._meta?.best_model;

  // Bar chart data for CV F1 comparison
  const f1ChartData = models.map(name => ({
    name:    name === 'Logistic Regression' ? 'LR' : name === 'Linear SVM' ? 'SVM' : 'NB',
    fullName: name,
    'CV F1':   data[name].cv_macro_f1,
    'Test F1': data[name].test_macro_f1,
  }));

  // Per-class F1 chart
  const classChartData = ['Negative', 'Neutral', 'Positive'].map(cls => ({
    name: cls,
    ...Object.fromEntries(
      models.map(m => [
        m === 'Logistic Regression' ? 'LR' : m === 'Linear SVM' ? 'SVM' : 'NB',
        data[m].per_class?.[cls]?.f1 ?? 0,
      ])
    ),
  }));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Model Comparison</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Performance comparison of all three trained classifiers
        </p>
      </div>

      {/* Best Model Banner */}
      <div className="bg-green-950 border border-green-800 rounded-2xl px-6 py-4 mb-6 flex items-center gap-4">
        <div className="text-3xl">🏆</div>
        <div>
          <div className="text-green-400 font-semibold">Best Model: {bestModel}</div>
          <div className="text-green-600 text-sm mt-0.5">
            CV Macro F1: {data[bestModel]?.cv_macro_f1?.toFixed(4)} —
            currently serving predictions in the API
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {models.map(name => (
          <div
            key={name}
            className={`bg-gray-900 border rounded-2xl p-5 ${
              name === bestModel ? 'border-green-700' : 'border-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-white">{name}</div>
              {name === bestModel && (
                <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">
                  Best
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">CV Macro F1</span>
                <span className="text-white font-medium">
                  {data[name].cv_macro_f1?.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Test Macro F1</span>
                <span className="text-white font-medium">
                  {data[name].test_macro_f1?.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Std Dev</span>
                <span className="text-white font-medium">
                  ±{data[name].cv_std?.toFixed(4)}
                </span>
              </div>
            </div>
            {/* F1 bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${data[name].cv_macro_f1 * 100}%`,
                    background: MODEL_COLORS[name],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Overall F1 Comparison */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-medium text-gray-300 mb-4">
            CV F1 vs Test F1
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={f1ChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="CV F1"   fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="Test F1" fill="#22c55e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-class F1 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-medium text-gray-300 mb-4">
            Per-Class F1 Score
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="LR"  fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="SVM" fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="NB"  fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-class breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="text-sm font-medium text-gray-300">
            Detailed Per-Class Metrics
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Model</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Class</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Precision</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Recall</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">F1</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model =>
                ['Negative', 'Neutral', 'Positive'].map((cls, i) => (
                  <tr key={`${model}-${cls}`} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="px-6 py-2.5 text-gray-300 text-xs">
                      {i === 0 ? model : ''}
                    </td>
                    <td className="px-6 py-2.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: CLASS_COLORS[cls] + '20',
                          color: CLASS_COLORS[cls],
                        }}
                      >
                        {cls}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-gray-300 text-xs">
                      {data[model].per_class?.[cls]?.precision?.toFixed(4) ?? '—'}
                    </td>
                    <td className="px-6 py-2.5 text-gray-300 text-xs">
                      {data[model].per_class?.[cls]?.recall?.toFixed(4) ?? '—'}
                    </td>
                    <td className="px-6 py-2.5 text-xs font-medium"
                      style={{ color: CLASS_COLORS[cls] }}>
                      {data[model].per_class?.[cls]?.f1?.toFixed(4) ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
