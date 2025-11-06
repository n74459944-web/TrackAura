'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Item { name: string; price: number; trend: string; img: string; }

export default function CategoryPage() {
  const params = useParams();
  const name = params?.name as string;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    fetch(`/api/track?category=${encodeURIComponent(name)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setItems(data.items || []);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setItems([]); // Fallback empty to avoid crash
      })
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) return <div className="flex justify-center items-center h-64 text-black">Loading {name}...</div>;
  if (!name) return <div className="flex justify-center items-center h-screen text-black">Head <Link href="/">home</Link> to explore.</div>;

  const title = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <Link href="/" className="mb-6 text-black hover:underline inline-flex items-center">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center capitalize">{title}</h1>
        <p className="text-xl text-black text-center mb-12">Discover trending values—click for full specs & charts.</p>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {items.map((item, idx) => (
            <Link 
              key={idx} 
              href={`/item/${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
              className="block w-full h-auto"
            >
              <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={item.img} 
                    alt={`${item.name} image`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 truncate">{item.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">${item.price.toLocaleString()}</span>
                    <div className={`flex items-center text-sm ${
                      item.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className={`w-4 h-4 mr-1 ${item.trend.startsWith('+') ? '' : 'rotate-180'}`} />
                      {item.trend}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {items.length === 0 && <p className="text-center text-black mt-8">No items yet—coming soon! Try <Link href="/categories/crypto" className="text-blue-600">Crypto</Link>.</p>}
      </div>
    </div>
  );
}