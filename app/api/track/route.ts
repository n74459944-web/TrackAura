import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    if (!item) return NextResponse.json({ error: 'Item query required' }, { status: 400 });

    let currentPrice: number | null = null;
    let history: { date: string; price: number }[] = [];

    // Route to sources based on item
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('bitcoin') || lowerItem.includes('btc')) {
      // Live CoinGecko API (free, no key needed)
      const { data: coinData } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
      );
      currentPrice = coinData.bitcoin.usd;

      // Historical: Last 30 days (daily)
      const { data: histData } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30`
      );
      history = histData.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString().split('T')[0], // YYYY-MM-DD
        price: Math.round(price),
      }));
    } else {
      // Fallback: Mock for non-crypto (eBay integration next—needs API key)
      currentPrice = Math.floor(Math.random() * 1000) + 100;
      history = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: currentPrice + (Math.random() - 0.5) * 200, // Wiggly trend
      }));
    }

    return NextResponse.json({ currentPrice, history, item });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data—try again!' }, { status: 500 });
  }
}