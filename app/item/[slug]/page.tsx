'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface Specs { [key: string]: string; }

export default function ItemPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
  const [specs, setSpecs] = useState<Specs>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: slug }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setPrice(data.currentPrice);
          setHistory(data.history || []);
          setSpecs(data.specs || {});
        }
      })
      .catch(() => setError('Load failed—back to search?'))
      .finally(() => setLoading(false));
  }, [slug]);

  const overallTrendNum = history.length > 1 && history[0].price > 0
    ? (history[history.length - 1].price - history[0].price) / history[0].price * 100
    : 0;
  const overallTrend = overallTrendNum.toFixed(1);
  const showPlus = overallTrendNum > 0;
  const trendLabel = overallTrendNum === 0 ? 'Stable' : `${showPlus ? '+' : ''}${overallTrend}% (1Y)`;

  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading {slug}...</p></div>;
  if (error) return <div className="text-red-600 flex items-center justify-center h-screen"><AlertCircle className="w-5 h-5 mr-2" /> {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => window.history.back()} className="mb-6 text-blue-600 hover:underline">← Back to Search</button>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 capitalize">{slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                overallTrendNum >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <TrendingUp className={`w-4 h-4 ${overallTrendNum < 0 ? 'rotate-180' : ''}`} />
                <span>{trendLabel}</span>
              </div>
            </div>
            {specs['Image URL'] && (
              <div className="flex justify-center mb-6">
                <img src={specs['Image URL']} alt={slug} className="w-64 h-64 object-cover rounded-lg shadow-md" />
              </div>
            )}
            <p className="text-5xl font-bold text-gray-900 mt-2 text-center">${price?.toLocaleString() || 'N/A'}</p>
            <p className="text-gray-600 text-center">Live value—updated moments ago.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Specs Panel */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Key Specs</h2>
              <dl className="space-y-3">
                {Object.entries(specs)
                  .filter(([key]) => key !== 'Image URL') // Hide image URL from specs list to avoid redundancy
                  .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{key}:</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
                Set Price Alert
              </button>
            </div>

            {/* Chart */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Value Over Time (1 Year)</h2>
              <div className="h-96 bg-gray-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Price']} />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Related Items Teaser */}
          <div className="p-8 border-t bg-gray-50">
            <h3 className="text-xl font-semibold mb-4">Related Items</h3>
            <div className="flex space-x-4 overflow-x-auto">
              {['ethereum', 'litecoin', 'dogecoin'].map((rel) => (
                <a key={rel} href={`/item/${rel}`} className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition min-w-[100px]">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mb-2 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">{rel.slice(0,3).toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-medium text-center">{rel}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}