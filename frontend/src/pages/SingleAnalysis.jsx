import React, { useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:5000';

const COLORS = {
  Positive: '#22c55e',
  Negative: '#ef4444',
  Neutral:  '#3b82f6',
};

const EMOJIS = {
  Positive: '😊',
  Negative: '😠',
  Neutral:  '😐',
};

export default function SingleAnalysis() {
  const [text, setText]       = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post(`${API}/analyze-single`, { text });
      setResult(res.data);
    } catch (err) {
      setError('Failed to connect to the API. Make sure Flask is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? Object.entries(result.probabilities).map(([name, value]) => ({
        name,
        value: Math.round(value * 100),
      }))
    : [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Single Tweet Analysis</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Enter any tweet or text to classify its sentiment
        </p>
      </div>

      {/* Input */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <label className="text-sm font-medium text-gray-300 mb-2 block">
          Tweet or Text
        </label>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows={4}
          placeholder="Type or paste a tweet here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">{text.length} characters</span>
          <button
            onClick={analyze}
            disabled={loading || !text.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Analysis Result</h2>

          {/* Sentiment Badge */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="text-5xl w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: COLORS[result.sentiment] + '20' }}
            >
              {EMOJIS[result.sentiment]}
            </div>
            <div>
              <div
                className="text-3xl font-bold"
                style={{ color: COLORS[result.sentiment] }}
              >
                {result.sentiment}
              </div>
              <div className="text-gray-400 text-sm mt-1">
                {(result.confidence * 100).toFixed(1)}% confidence
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Confidence</span>
              <span>{(result.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${result.confidence * 100}%`,
                  background: COLORS[result.sentiment],
                }}
              />
            </div>
          </div>

          {/* Donut Chart + Probabilities */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-400 mb-3">Probability Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[entry.name]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Probability']}
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

            <div>
              <div className="text-xs text-gray-400 mb-3">Class Probabilities</div>
              <div className="space-y-3">
                {Object.entries(result.probabilities).map(([label, prob]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{label}</span>
                      <span style={{ color: COLORS[label] }}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${prob * 100}%`,
                          background: COLORS[label],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean text */}
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Processed text</div>
                <div className="text-xs text-gray-300 break-words">
                  {result.clean_text || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
