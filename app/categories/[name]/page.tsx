'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface CategoryItem {
  slug: string;
  name: string;
  image_url: string;
  teaser_price: number;
  trend: number;
}

export default function CategoryPage() {
  const params = useParams();
  const category = params?.name as string || 'watches';
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    console.log('Fetching for category:', category, 'Sending item:', `top-6-${category}`); // Log request
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: `top-6-${category}` }),
    })
      .then(res => {
        console.log('API Response Status:', res.status); // Log status
        return res.json();
      })
      .then(data => {
        console.log('Category Data Received:', data); // Full data log
        if (data.error) {
          setError(data.error);
        } else {
          const relatedItems = data.related || [];
          console.log('Setting items:', relatedItems.length, 'items'); // Log count
          setItems(relatedItems);
        }
      })
      .catch(err => {
        console.error('Category Fetch Error:', err); // Detailed error
        setError('Load failed—check console & try refresh?');
      })
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) return <div className="flex justify-center items-center h-64"><p>Loading {category}...</p></div>;
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 flex justify-center items-center">
      <div className="text-red-600 flex items-center space-x-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => window.history.back()} className="mb-6 text-blue-600 hover:underline">← Back to Search</button>
        <h1 className="text-4xl font-bold text-gray-900 capitalize mb-8 text-center">{category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item.slug} href={`/item/${item.slug}`} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden">
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="w-full h-48 object-cover" 
                onError={(e) => e.currentTarget.src = `https://via.placeholder.com/384x256?text=${item.name}`} 
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                <p className="text-2xl font-bold text-gray-900">${item.teaser_price.toLocaleString()}</p>
                <div className={`flex items-center mt-2 text-sm ${
                  item.trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${item.trend < 0 ? 'rotate-180' : ''}`} />
                  <span>{item.trend >= 0 ? '+' : ''}{item.trend.toFixed(1)}% (1Y)</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {items.length === 0 && !loading && !error && <p className="text-center text-gray-500 py-8">No items yet—check console logs for debug info!</p>}
      </div>
    </div>
  );
}