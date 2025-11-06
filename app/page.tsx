'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, AlertTriangle } from 'lucide-react'; // npm i lucide-react

export default function Home() {
  const [item, setItem] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setPrice(data.currentPrice);
      setHistory(data.history);
      window.location.href = `/item/${data.item.toLowerCase().replace(/\s+/g, '-')}`;
    } catch (err) {
      setError('Oops—network hiccup. Try again?');
    } finally {
      setLoading(false);
    }
  };

  // Mock categories with richer data
  const categories = [
    { name: 'Electronics', img: 'https://source.unsplash.com/400x300/?electronics', items: 15000, trend: '+8%' },
    { name: 'Crypto', img: 'https://source.unsplash.com/400x300/?bitcoin', items: 5000, trend: '+22%' },
    { name: 'Collectibles', img: 'https://source.unsplash.com/400x300/?comics', items: 100000, trend: '-3%' },
    { name: 'Stocks', img: 'https://source.unsplash.com/400x300/?stock-market', items: 8000, trend: '+15%' },
  ];

  // Calc overall trend for display
  const overallTrend = history.length > 1 ? 
    ((history[history.length - 1].price - history[0].price) / history[0].price * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            TrackAura
          </h1>
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
            <a href="#categories" className="hover:text-blue-600 transition">Categories</a>
            <a href="#" className="hover:text-blue-600 transition">About</a>
          </div>
        </div>
      </header>

      {/* Hero Search */}
      <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center">
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Unlock Hidden Value</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track prices, trends, and specs for every item—from Bitcoin to vintage watches. See the full story.
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-12 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Search any item (e.g., 'Bitcoin' or 'Rolex Submariner')"
              className="w-full pl-12 pr-32 py-4 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 text-lg placeholder-gray-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !item.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
            >
              {loading ? 'Tracking...' : 'Track Now'}
            </button>
          </div>
          {error && (
            <p className="mt-2 flex items-center text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" /> {error}
            </p>
          )}
        </form>

        {/* Results: Enhanced Card */}
        {price && (
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-gray-900">Current Value: ${price.toLocaleString()}</h3>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  overallTrend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${overallTrend >= 0 ? '' : 'rotate-180'}`} />
                  <span>{overallTrend >= 0 ? '+' : ''}{overallTrend}% Trend</span>
                </div>
              </div>
              <p className="text-gray-600 mt-1">As of today—powered by live markets.</p>
            </div>
            
            {/* Chart: Framed & Responsive */}
            <div className="p-8">
              <h4 className="text-lg font-semibold mb-4 text-gray-700">Price History (Last 30 Days)</h4>
              <div className="h-80 bg-gray-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Categories: Hover-Ready Grid */}
        {!price && (
          <section id="categories" className="w-full mt-16">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-8">Explore Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat, idx) => (
                <div
                  key={idx}
                  className="group cursor-pointer bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-200"
                  onClick={() => setItem(cat.name)} // Quick search trigger
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">{cat.name}</h4>
                    <p className="text-gray-600 mb-2">{cat.items.toLocaleString()} items tracked</p>
                    <div className={`text-sm font-medium flex items-center ${
                      cat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className={`w-4 h-4 mr-1 ${cat.trend.startsWith('+') ? '' : 'rotate-180'}`} />
                      {cat.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
