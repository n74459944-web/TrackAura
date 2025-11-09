'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, TrendingUp, ChevronDown, Menu } from 'lucide-react';
import Auth from '@/components/Auth';
import { supabase } from '@/lib/supabase';  // Shared client

interface Category {
  id: string;
  name: string;
  label: string;
  icon: string;
  slug: string;  // FIXED: Explicit for TS
  children?: Category[];  // Recursive for nesting
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

  // FIXED: Dynamic fetch with .is(null) + explicit slug in children select
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, label, icon, slug, *, children:categories(id, name, label, icon, slug, *)')  // FIXED: Recursive + slug
        .is('parent_id', null)  // FIXED: .is() for null checks
        .order('name');
      if (error) {
        console.error('Category fetch error:', error);
        setCategories([]);  // Fallback to empty
      } else {
        setCategories(data || []);
      }
      setLoadingCats(false);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showSidebar]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/item/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;
    }
  };

  const toggleSubCat = (catId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newExpanded = new Set(expandedCats);
    if (newExpanded.has(catId)) {
      newExpanded.delete(catId);
    } else {
      newExpanded.add(catId);
    }
    setExpandedCats(newExpanded);
  };

  const closeSidebar = () => setShowSidebar(false);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = href;
    closeSidebar();
  };

  if (loadingCats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">TrackAura</h1>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile Hamburger */}
      <button
        onClick={() => setShowSidebar(true)}
        className="fixed top-4 left-4 lg:hidden z-50 bg-white p-2 rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      <div className="max-w-7xl mx-auto px-2 lg:px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar (Dynamic from Supabase) */}
        <aside 
          className={`lg:col-span-1 bg-white rounded-xl shadow-md p-6 h-fit sticky top-12 transition-all duration-300 ease-in-out overflow-y-auto max-h-screen z-50 ${
            showSidebar ? 'fixed inset-y-0 left-0 w-64 transform translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ pointerEvents: 'auto' }}
        >
          <h2 className="text-xl font-bold mb-2 text-gray-900 text-center">Categories ({categories.length})</h2>
          <nav className="space-y-2" style={{ pointerEvents: 'auto' }}>
            {categories.map((cat) => (
              <div key={cat.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <button
                    onClick={(e) => handleLinkClick(e, `/categories/${cat.slug}`)}
                    className="flex items-center flex-1 p-2 hover:bg-gray-50 rounded text-left"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <span className="text-xl mr-2">{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </button>
                  {cat.children && cat.children.length > 0 && (
                    <button
                      onClick={(e) => toggleSubCat(cat.id, e)}
                      className="p-2 hover:bg-gray-50 rounded"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedCats.has(cat.id) ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {cat.children && expandedCats.has(cat.id) && (
                  <ul className="ml-6 mt-2 space-y-1 text-sm transition-all duration-300 overflow-hidden max-h-96 opacity-100">
                    {cat.children.map((sub) => (
                      <li key={sub.id}>
                        <button
                          onClick={(e) => handleLinkClick(e, `/categories/${cat.slug}/${sub.slug}`)}
                          className="flex items-center text-blue-600 hover:text-blue-800 p-1 rounded w-full text-left"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-xs mr-2">{sub.icon}</span>
                          <span className="font-medium">{sub.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
          {categories.length === 0 && (
            <p className="text-center text-gray-500 mt-4">No categories yet—run npm run seed!</p>
          )}
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 relative">
          {/* Backdrop */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-gray-500/10 lg:hidden z-30"
              onClick={closeSidebar}
            />
          )}
          
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
                  placeholder="Search items (e.g., bitcoin, Rolex submariner)..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button type="submit" className="ml-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Track
              </button>
            </form>
          </div>

          {/* Quick Item Teasers (Static for now—dynamize later from Supabase top-trends) */}
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