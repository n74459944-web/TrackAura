'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [item, setItem] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
  const [category, setCategory] = useState(''); // For future category filtering

  const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!item) return;

  try {
    const response = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    const data = await response.json();
    if (data.error) {
      alert(data.error); // TODO: Better UX toast
      return;
    }
    setPrice(data.currentPrice);
    setHistory(data.history);
  } catch (err) {
    console.error('Search error:', err);
  }
};

  // Mock categories for teaser
  const categories = [
    { name: 'Electronics', img: 'https://source.unsplash.com/random/300x200/?electronics', items: 15000 },
    { name: 'Crypto', img: 'https://source.unsplash.com/random/300x200/?bitcoin', items: 5000 },
    { name: 'Collectibles', img: 'https://source.unsplash.com/random/300x200/?comics', items: 100000 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">TrackAura: Unlock the Value of Everything</h1>
        <p className="text-center text-gray-600 mt-2">Historical trends, specs, and market insights for any item.</p>
      </header>

      {/* Search */}
      <main className="flex flex-col items-center justify-center p-8">
        <form onSubmit={handleSearch} className="w-full max-w-md mb-8">
          <div className="flex">
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g., 'Bitcoin' or 'iPhone 14'"
              className="flex-1 border border-gray-300 p-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700">
              Track Value
            </button>
          </div>
        </form>

        {/* Results */}
        {price && (
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Current Value: ${price.toLocaleString()}</h2>
            
            {/* Historical Chart */}
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quick History List */}
            <ul className="space-y-1">
              {history.map((point) => (
                <li key={point.date} className="flex justify-between text-sm">
                  <span>{point.date}</span>
                  <span className={point.price > history[0]?.price ? 'text-green-600' : 'text-red-600'}>
                    ${point.price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Categories Teaser */}
        {!price && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
            {categories.map((cat) => (
              <div key={cat.name} className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => setCategory(cat.name)}>
                <img src={cat.img} alt={cat.name} className="w-full h-32 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-sm text-gray-600">{cat.items.toLocaleString()} items tracked</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
