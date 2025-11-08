'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import Auth from '@/components/Auth';

interface Category {
  name: string;
  label: string;
  icon: string;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch('/data/categories.json')
      .then(res => res.json())
      .then(data => setCategories(data.categories))
      .catch(() => setCategories([])); // Fallback empty
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/item/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 z-10">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero/Search Bar – unchanged */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">TrackAura</h1>
          <p className="text-xl text-gray-600 mb-8">Track the value of every item in the world—historical prices, specs, and charts.</p>
          <form onSubmit={handleSearch} className="max-w-md mx-auto flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items (e.g., bitcoin, rolex submariner)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button type="submit" className="ml-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Track
            </button>
          </form>
        </div>

        {/* Dynamic Category Teasers */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-6 text-center">Explore Categories</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/categories/${cat.name}`}
                className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 min-w-[120px] text-center"
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <h3 className="font-semibold text-gray-900">{cat.label}</h3>
                <div className="flex items-center mt-2 text-sm text-blue-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  <span>Live Trends</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Item Teasers – unchanged */}
        <div className="grid md:grid-cols-3 gap-6">
          {['bitcoin', 'rolex-submariner', 'nike-air-jordan-1'].map((slug) => (
            <Link key={slug} href={`/item/${slug}`} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="font-semibold mb-2 capitalize">{slug.replace(/-/g, ' ')}</h3>
              <p className="text-gray-600">Track value over time</p>
            </Link>
          ))}
        </div>

        {/* Auth Overlay – NEW: Sign-up/login form */}
        <Auth />
      </div>
    </div>
  );
}