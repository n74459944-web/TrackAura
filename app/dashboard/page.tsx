'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthWrapper';  // Your shared auth hook
import Link from 'next/link';
import { supabase } from '@/lib/supabase';  // Shared client
import { TrendingUp } from 'lucide-react';  // For trend icons (if Lucide installed; npm i lucide-react)

interface WatchItem {
  id: string;
  item_slug: string;
  notes: string;
  category: string;
  created_at: string;
  current_price?: number;  // Enhanced: From API fetch
  trend?: number;  // Optional: 24h change from API
  image_url?: string;  // From API specs
}

export default function Dashboard() {
  const { session } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      window.location.href = '/';  // Redirect to home if not signed in
      return;
    }

    // Fetch user's watchlist from Supabase
    supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })  // Newest saves first
      .then(({ data, error }) => {
        if (error) {
          console.error('Watchlist fetch error:', error);
          setFetchError('Failed to load watchlist—try refreshing.');
          setLoading(false);
          return;
        }

        const rawWatchlist = data || [];
        setWatchlist(rawWatchlist);
        setLoading(false);

        // ENHANCED: Parallel fetch live prices/history for each item
        if (rawWatchlist.length > 0) {
          fetchLivePrices(rawWatchlist).then((enhancedList) => {
            setWatchlist(enhancedList);
          }).catch((err) => {
            console.error('Live prices fetch error:', err);
            setFetchError('Prices updating—some may show as loading.');
          });
        }
      });
  }, [session]);

  // ENHANCED: Parallel API calls to /api/track for current_price + trend/image
  async function fetchLivePrices(items: WatchItem[]): Promise<WatchItem[]> {
    const promises = items.map(async (item) => {
      try {
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: item.item_slug }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return {
          ...item,
          current_price: data.currentPrice,
          trend: data.specs?.Trend || 0,  // Assume Grok returns trend in specs; adjust if needed
          image_url: data.specs?.['Image URL'] || `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=${item.item_slug.toUpperCase()}`,
        };
      } catch (err) {
        console.error(`Price fetch failed for ${item.item_slug}:`, err);
        return { ...item, current_price: null, trend: 0, image_url: `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=LOADING` };
      }
    });

    const enhancedItems = await Promise.all(promises);  // Parallel: Fast even for 20+ items
    return enhancedItems;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Loading your watchlist...</h2>
          <p className="text-gray-600">Fetching saved items and live prices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Your Watchlist</h1>
        <p className="text-center text-gray-600 mb-8">Track saved items with live prices and trends—add more from item pages!</p>
        {fetchError && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6 text-center">
            {fetchError}
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((item) => (
            <Link
              key={item.id || item.item_slug}
              href={`/item/${item.item_slug}`}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden"
            >
              <img
                src={item.image_url}
                alt={item.item_slug}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://via.placeholder.com/384x256/4F46E5/FFFFFF?text=${item.item_slug.substring(0, 8)}`;
                }}
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 capitalize">{item.item_slug.replace(/-/g, ' ')}</h3>
                <p className="text-sm text-gray-600 mb-2">Category: {item.category}</p>
                {item.notes && <p className="text-sm text-gray-500 italic mb-2">Notes: {item.notes}</p>}
                <p className="text-2xl font-bold text-gray-900">
                  {item.current_price ? `$${item.current_price.toLocaleString()}` : 'Loading price...'}
                </p>
                {item.trend !== undefined && (
                  <div className={`flex items-center mt-2 text-sm ${
                    item.trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${item.trend < 0 ? 'rotate-180' : ''}`} />
                    <span>{item.trend >= 0 ? '+' : ''}{item.trend.toFixed(2)}% (24h)</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        {watchlist.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500 mb-4">No items tracked yet</p>
            <Link href="/categories/crypto" className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition">
              Browse & Track Items
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}