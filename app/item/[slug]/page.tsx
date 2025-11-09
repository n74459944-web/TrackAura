'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrackData {
  currentPrice: number;
  history: { date: string; price: number }[];
  specs: { [key: string]: string };
}

export default function ItemPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: slug }),
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading item...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Item not found.</div>;

  // NEW: Robust history prep—filter invalids, then sort newest first, cap at 30
  const validHistory = data.history.filter(h => 
    h.date && 
    !isNaN(new Date(h.date).getTime()) &&  // Valid date check
    typeof h.price === 'number' && !isNaN(h.price)  // Valid price too
  );
  console.log('Item History Debug:', { 
    rawCount: data.history.length, 
    validCount: validHistory.length, 
    sample: validHistory.slice(0, 3) 
  });  // Log for debug—check console on load

  const chartData = validHistory
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);  // Now safe—no NaNs

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{label}</p>
          <p>${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        
        {/* Hero Image & Price */}
        <div className="text-center mb-8">
          <img
            src={data.specs['Image URL'] || 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=No+Image'}
            alt={data.specs.Name || slug}
            className="mx-auto rounded-xl shadow-lg max-w-full h-64 object-cover"
            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Image+Error')}
          />
          <h1 className="text-4xl font-bold text-gray-900 mt-4">{data.specs.Name}</h1>
          <p className="text-2xl font-semibold text-green-600 mt-2">
            ${data.currentPrice?.toLocaleString() || 'Price unavailable'}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(data.specs).map(([key, value]) => (
            <div key={key} className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="font-semibold text-gray-900">{key}</h3>
              <p className="text-gray-600">{value}</p>
            </div>
          ))}
        </div>

        {/* Price History Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">30-Day Price Trend</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No historical data available yet—check back soon or explore similar items!
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2 text-center">
            Data powered by Grok API—prices in USD, updated live.
          </p>
        </div>
      </div>
    </div>
  );
}