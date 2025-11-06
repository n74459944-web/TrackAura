import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    if (!item) return NextResponse.json({ error: 'Item query required' }, { status: 400 });

    let currentPrice: number | null = null;
    let history: { date: string; price: number }[] = [];
    let specs: { [key: string]: string } = {}; // New: Item details

    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('bitcoin') || lowerItem.includes('btc')) {
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
    } else if (lowerItem.includes('iphone')) {
      // Mock Apple/iPhone specs + price (eBay next)
      currentPrice = 799;
      specs = {
        'Screen': '6.1-inch Super Retina XDR',
        'Battery': '3349 mAh',
        'Storage Options': '128GB / 256GB / 512GB',
        'Camera': '48MP Main + 12MP Ultra Wide',
        'Release Date': 'Sep 2023'
      };
      history = [
        { date: '2024-09', price: 999 },
        { date: '2025-01', price: 899 },
        { date: '2025-05', price: 799 },
        { date: '2025-11', price: 749 }, // Hypothetical drop
      ];
    } else {
      // Generic mock
      currentPrice = Math.floor(Math.random() * 1000) + 100;
      specs = { 'Category': 'General', 'Status': 'Tracked' };
      history = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: currentPrice + (Math.random() - 0.5) * 200,
      }));
    }

    return NextResponse.json({ currentPrice, history, specs, item });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data—try again!' }, { status: 500 });
  }
}