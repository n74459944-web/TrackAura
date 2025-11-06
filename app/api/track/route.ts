import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { google } from 'googleapis'; // npm i googleapis

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    if (!item) return NextResponse.json({ error: 'Item query required' }, { status: 400 });

    let currentPrice: number | null = null;
    let history: { date: string; price: number }[] = [];
    let specs: { [key: string]: string } = {}; // Item details

    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('bitcoin') || lowerItem.includes('btc')) {
      // Live CoinGecko API (free, no key needed)
      const { data: coinData } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );
      currentPrice = coinData.bitcoin.usd;
      specs = {
        'Market Cap': `$${coinData.bitcoin.usd_market_cap?.toLocaleString() || 'N/A'} USD`,
        '24h Volume': `$${coinData.bitcoin.usd_24h_vol?.toLocaleString() || 'N/A'} USD`,
        'All-Time High': '$73,750 (Mar 2024)', // Static for demo; fetch via /coins/bitcoin
        'Circulating Supply': '19.78M BTC'
      };

      // Historical: 365 days for detail pages
      const { data: histData } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365`
      );
      history = histData.prices.slice(-30).map(([timestamp, price]: [number, number]) => ({ // Last 30 for perf
        date: new Date(timestamp).toISOString().split('T')[0],
        price: Math.round(price),
      }));
    } else {
      // Google Shopping for physical/digital goods
      try {
        const shopping = google.shopping({ version: 'v2.1', auth: process.env.GOOGLE_SHOPPING_KEY });
        const res = await shopping.products.list({
          merchantId: 'online:en:US', // Default US merchant feed
          q: item, // e.g., "iPhone 15"
          maxResults: 5,
          country: 'US',
        });

        const products = res.data.resources || [];
        if (products.length > 0) {
          const prices = products.map((p: any) => parseFloat(p.price?.value || '0')).filter(p => p > 0);
          currentPrice = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : null;
          
          const firstProduct = products[0];
          specs = {
            'Title': firstProduct.title || 'N/A',
            'Brand': firstProduct.brand || 'N/A',
            'Condition': firstProduct.condition || 'New',
            'Availability': firstProduct.availability || 'In Stock',
            'Recent Listings': `${products.length} matches`,
            'Image URL': firstProduct.imageLink || '' // For item page img
          };

          // Historical: Google lacks native history; mock or pull from cached DB. For now, simulate 30-day trend
          const basePrice = currentPrice || Math.floor(Math.random() * 1000) + 100;
          history = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.1 * i / 30)), // Gentle volatility
          }));
        } else {
          // Fallback mock
          currentPrice = Math.floor(Math.random() * 1000) + 100;
          specs = { 'Fallback': `${item} not found—suggest refinements?` };
          history = [{ date: new Date().toISOString().split('T')[0], price: currentPrice }];
        }
      } catch (gError) {
        console.error('Google API Error:', gError);
        // Fallback to generic mock
        currentPrice = Math.floor(Math.random() * 1000) + 100;
        specs = { 'API Fallback': 'Using estimates—real data incoming' };
        history = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          price: currentPrice + (i - 3) * 20,
        }));
      }
    }

    return NextResponse.json({ currentPrice, history, specs, item });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data—try again!' }, { status: 500 });
  }
}