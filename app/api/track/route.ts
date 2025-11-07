import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    if (!item) return NextResponse.json({ error: 'Item query required' }, { status: 400 });

    let currentPrice: number | null = null;
    let history: { date: string; price: number }[] = [];
    let specs: { [key: string]: string } = {};

    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('bitcoin') || lowerItem.includes('btc')) {
      // CoinGecko for Crypto
      const { data: coinData } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );
      currentPrice = coinData.bitcoin.usd;
      specs = {
        'Market Cap': `$${coinData.bitcoin.usd_market_cap?.toLocaleString() || 'N/A'} USD`,
        '24h Volume': `$${coinData.bitcoin.usd_24h_vol?.toLocaleString() || 'N/A'} USD`,
        'All-Time High': '$73,750 (Mar 2024)',
        'Circulating Supply': '19.78M BTC'
      };

      // Historical: 365 days, show last 30
      const { data: histData } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365`
      );
      history = histData.prices.slice(-30).map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        price: Math.round(price),
      }));
    } else {
      // Mock for goods (expand to eBay Browse API later—no auth hassle)
      specs = {}; // Flexible indexed type
      let mockPrice = 0;
      let mockHistory = [];

      if (lowerItem.includes('iphone')) {
        mockPrice = 799;
        specs = {
          'Brand': 'Apple',
          'Condition': 'New',
          'Storage': '128GB',
          'Screen': '6.1-inch OLED',
          'Battery': '3349 mAh',
          'Release': 'Sep 2023'
        };
        mockHistory = [
          { date: '2025-09', price: 999 },
          { date: '2025-10', price: 899 },
          { date: '2025-11', price: 799 },
        ];
      } else if (lowerItem.includes('rolex')) {
        mockPrice = 8500;
        specs = {
          'Model': 'Submariner',
          'Material': 'Stainless Steel',
          'Condition': 'Excellent',
          'Year': 'Vintage 1980s',
          'Water Resistance': '300m'
        };
        mockHistory = [
          { date: '2025-08', price: 8200 },
          { date: '2025-09', price: 8350 },
          { date: '2025-11', price: 8500 },
        ];
      } else if (lowerItem.includes('airpods')) {
        mockPrice = 199;
        specs = {
          'Brand': 'Apple',
          'Type': 'Pro (2nd Gen)',
          'Noise Canceling': 'Active',
          'Battery': '30 hrs total',
          'Color': 'White'
        };
        mockHistory = [
          { date: '2025-09', price: 249 },
          { date: '2025-10', price: 229 },
          { date: '2025-11', price: 199 },
        ];
      } else {
        // Generic mock
        mockPrice = Math.floor(Math.random() * 1000) + 100;
        specs = { 'Category': 'General', 'Status': 'Tracked' };
        mockHistory = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          price: mockPrice + (Math.random() - 0.5) * 200,
        }));
      }

      currentPrice = mockPrice;
      history = mockHistory;
    }

    return NextResponse.json({ currentPrice, history, specs, item });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data—try again!' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 });

  // Mock + API items per cat (paginated ready)
  let items: { name: string; price: number; trend: string; img: string }[] = [];
  const lowerCat = category.toLowerCase();

  if (lowerCat === 'crypto') {
    // Real CoinGecko top 10
    const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1');
    items = data.map((coin: any) => ({
      name: coin.name,
      price: Math.round(coin.current_price),
      trend: `${coin.price_change_percentage_24h?.toFixed(1) || 0}%`,
      img: `https://source.unsplash.com/200x200/?${coin.symbol}-crypto`,
    }));
  } else if (lowerCat === 'electronics') {
    items = [
      { name: 'iPhone 15', price: 799, trend: '+5%', img: 'https://source.unsplash.com/200x200/?iphone-15' },
      { name: 'MacBook Pro', price: 1999, trend: '-2%', img: 'https://source.unsplash.com/200x200/?macbook-pro' },
      { name: 'AirPods Pro', price: 199, trend: '+12%', img: 'https://source.unsplash.com/200x200/?airpods-pro' },
      { name: 'Samsung Galaxy S24', price: 899, trend: '+3%', img: 'https://source.unsplash.com/200x200/?galaxy-s24' },
      { name: 'Google Pixel 8', price: 699, trend: '-1%', img: 'https://source.unsplash.com/200x200/?pixel-8' },
      { name: 'Sony WH-1000XM5', price: 399, trend: '+7%', img: 'https://source.unsplash.com/200x200/?sony-headphones' },
      { name: 'Nintendo Switch', price: 299, trend: '+4%', img: 'https://source.unsplash.com/200x200/?nintendo-switch' },
      { name: 'Kindle Paperwhite', price: 149, trend: '-3%', img: 'https://source.unsplash.com/200x200/?kindle-paperwhite' },
    ];
  } else if (lowerCat === 'collectibles') {
    items = [
      { name: 'Pokémon Charizard Card', price: 250, trend: '+15%', img: 'https://source.unsplash.com/200x200/?charizard-pokemon-card' },
      { name: 'Vintage Rolex Submariner', price: 8500, trend: '+8%', img: 'https://source.unsplash.com/200x200/?rolex-submariner-watch' },
      { name: '1980s Air Jordan 1', price: 1200, trend: '+20%', img: 'https://source.unsplash.com/200x200/?air-jordan-1-sneakers' },
      { name: 'First Edition Harry Potter', price: 4500, trend: '+12%', img: 'https://source.unsplash.com/200x200/?harry-potter-book' },
      { name: 'LeBron James Rookie Card', price: 1800, trend: '+25%', img: 'https://source.unsplash.com/200x200/?lebron-james-basketball-card' },
    ];
  } else if (lowerCat === 'stocks') {
    // Mock; Alpha Vantage free key for real TSLA/AAPL later
    items = [
      { name: 'Tesla (TSLA)', price: 250, trend: '+10%', img: 'https://source.unsplash.com/200x200/?tesla-stock' },
      { name: 'Apple (AAPL)', price: 220, trend: '-4%', img: 'https://source.unsplash.com/200x200/?apple-stock' },
      { name: 'NVIDIA (NVDA)', price: 120, trend: '+25%', img: 'https://source.unsplash.com/200x200/?nvidia-stock' },
      { name: 'Amazon (AMZN)', price: 185, trend: '+6%', img: 'https://source.unsplash.com/200x200/?amazon-stock' },
      { name: 'Google (GOOGL)', price: 165, trend: '+2%', img: 'https://source.unsplash.com/200x200/?google-stock' },
    ];
  } else {
    items = []; // Unknown cat fallback
  }

  return NextResponse.json({ items, category });
}