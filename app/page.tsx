'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, TrendingUp, ChevronDown, Menu } from 'lucide-react';  // Add Menu for hamburger
import Auth from '@/components/Auth';

interface Category {
  name: string;
  label: string;
  icon: string;
  subCategories?: { name: string; label: string; icon: string }[];
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(false);  // NEW: Mobile toggle

  useEffect(() => {
    fetch('/data/categories.json')
      .then(res => res.json())
      .then(data => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/item/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;
    }
  };

  const toggleSubCat = (catName: string) => {
    const newExpanded = new Set(expandedCats);
    if (newExpanded.has(catName)) {
      newExpanded.delete(catName);
    } else {
      newExpanded.add(catName);
    }
    setExpandedCats(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile Hamburger - NEW */}
      <button
        onClick={() => setShowSidebar(true)}
        className="fixed top-4 left-4 lg:hidden z-50 bg-white p-2 rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      <div className="max-w-7xl mx-auto px-2 lg:px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">  {/* FIXED: px-2 for left push */}
        
        {/* Left Sidebar: Categories Column */}
        <aside 
          className={`lg:col-span-1 bg-white rounded-xl shadow-md p-6 h-fit sticky top-12 transition-transform duration-300 ease-in-out ${
            showSidebar ? 'fixed inset-y-0 left-0 z-40 w-64 transform translate-x-0' : 'lg:block -translate-x-full lg:translate-x-0'
          }`}  // FIXED: Mobile slide-in, always block on lg
        >
          {/* Mobile Backdrop - NEW */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
              onClick={() => setShowSidebar(false)}
            />
          )}
          
          <h2 className="text-xl font-bold mb-6 text-gray-900 text-center">Categories</h2>
          <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">  // Scroll if many cats
            {categories.map((cat) => (
              <div key={cat.name} className="border-b border-gray-200 pb-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <Link
                    href={`/categories/${cat.name}`}
                    className="flex items-center flex-1 p-2 hover:bg-gray-50 rounded text-left"
                    onClick={() => setShowSidebar(false)}  // Close on mobile click
                  >
                    <span className="text-xl mr-2">{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </Link>
                  {cat.subCategories && (
                    <button
                      onClick={() => toggleSubCat(cat.name)}
                      className="p-2 hover:bg-gray-50 rounded"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedCats.has(cat.name) ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {cat.subCategories && expandedCats.has(cat.name) && (
                  <ul className="ml-6 mt-2 space-y-1 text-sm">
                    {cat.subCategories.map((sub) => (
                      <li key={sub.name}>
                        <Link
                          href={`/categories/${cat.name}/${sub.name}`}
                          className="flex items-center text-blue-600 hover:text-blue-800 p-1 rounded"
                          onClick={() => setShowSidebar(false)}  // Close on mobile
                        >
                          <span className="text-xs mr-2">{sub.icon}</span>
                          {sub.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content: Col-span-3 */}
        <main className="lg:col-span-3">
          {/* Hero/Search Bar */}
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

          {/* Quick Item Teasers */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {['bitcoin', 'rolex-submariner', 'nike-air-jordan-1'].map((slug) => (
              <Link key={slug} href={`/item/${slug}`} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <h3 className="font-semibold mb-2 capitalize">{slug.replace(/-/g, ' ')}</h3>
                <p className="text-gray-600">Track value over time</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
      <Auth />
    </div>
  );
}