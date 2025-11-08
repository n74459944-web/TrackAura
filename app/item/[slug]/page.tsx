// app/item/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        
        {/* Hero Image */}
        <div className="text-center mb-8">
          <img
            src={data.specs['Image URL'] || 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=No+Image'}
            alt={data.specs.Name || slug}
            className="mx-auto rounded-xl shadow-lg max-w-full h-64 object-cover"  // NEW: Render image
          />
          <h1 className="text-4xl font-bold text-gray-900 mt-4">{data.specs.Name}</h1>
          <p className="text-2xl font-semibold text-green-600 mt-2">${data.currentPrice?.toLocaleString()}</p>
        </div>

        {/* Specs Table */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(data.specs).map(([key, value]) => (
            <div key={key} className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="font-semibold text-gray-900">{key}</h3>
              <p className="text-gray-600">{value}</p>
            </div>
          ))}
        </div>

        {/* Price Chart - Add Recharts here */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">30-Day Price Trend</h2>
          {/* Your Recharts <LineChart data={data.history} /> */}
          <p className="text-gray-500">Chart placeholder—integrate Recharts for live line graph.</p>
        </div>
      </div>
    </div>
  );
}