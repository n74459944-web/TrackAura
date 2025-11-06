import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { google } from 'googleapis';

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
      // Google Shopping for physical/digital goods
      try {
        const shopping = google.shopping({ version: 'v2.1', auth: process.env.GOOGLE_SHOPPING_KEY });
        const res = await shopping.products.list({
          merchantId: 'online:en:US',
          q: item,
          maxResults: 5,
          country: 'US',
        });

        const products = res.data.resources || [];
        if (products.length > 0) {
          const prices = products.map((p: any) => parseFloat(p.price?.value || '0')).filter(p => !isNaN(p));
          currentPrice = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : null;
          
          const firstProduct = products[0];
          specs = {
            'Title': firstProduct.title || 'N/A',
            'Brand': firstProduct.brand || 'N/A',
            'Condition': firstProduct.condition || 'New',
            'Availability': firstProduct.availability || 'In Stock',
            'Recent Listings': `${products.length} matches`,
            'Image URL': firstProduct.imageLink || ''
          };

          // Historical: Simulate 30-day trend (add CamelCamel for real later)
          const basePrice = currentPrice || Math.floor(Math.random() * 1000) + 100;
          history = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.1 * i / 30)),
          }));
        }
      } catch (gError) {
        console.error('Google API Error:', gError);
      }

      // Fallback mock if no data
      if (!currentPrice) {
        currentPrice = Math.floor(Math.random() * 1000) + 100;
        specs = { 'Fallback': `${item} estimates—refine search?` };
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 });

  // Mock + API items per cat (paginated ready)
  let items: { name: string; price: number; trend: string; img: string }[] = [];
  const lowerCat = category.toLowerCase();

  if (lowerCat === 'crypto') {
    // Real CoinGecko top 10 (add &per_page=${pageSize} for pagination later)
    const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1');
    items = data.map((coin: any) => ({
      name: coin.name,
      price: Math.round(coin.current_price),
      trend: `${coin.price_change_percentage_24h?.toFixed(1) || 0}%`,
      img: `https://source.unsplash.com/200x200/?${coin.symbol}`,
    }));
  } else if (lowerCat === 'electronics') {
    // Mock array—swap with Google loop for live
    items = [
      { name: 'iPhone 15', price: 799, trend: '+5%', img: 'https://source.unsplash.com/200x200/?iphone' },
      { name: 'MacBook Pro', price: 1999, trend: '-2%', img: 'https://source.unsplash.com/200x200/?macbook' },
      { name: 'AirPods Pro', price: 199, trend: '+12%', img: 'https://source.unsplash.com/200x200/?airpods' },
      { name: 'Samsung Galaxy S24', price: 899, trend: '+3%', img: 'https://source.unsplash.com/200x200/?galaxy' },
      { name: 'Google Pixel 8', price: 699, trend: '-1%', img: 'https://source.unsplash.com/200x200/?pixel' },
      { name: 'Sony WH-1000XM5', price: 399, trend: '+7%', img: 'https://source.unsplash.com/200x200/?headphones' },
      { name: 'Nintendo Switch', price: 299, trend: '+4%', img: 'https://source.unsplash.com/200x200/?nintendo' },
      { name: 'Kindle Paperwhite', price: 149, trend: '-3%', img: 'https://source.unsplash.com/200x200/?kindle' },
    ];
  } else if (lowerCat === 'collectibles') {
    items = [
      { name: 'Pokémon Charizard Card', price: 250, trend: '+15%', img: 'https://source.unsplash.com/200x200/?charizard-pokemon-card' || 'https://via.placeholder.com/200x200?text=Card' },
      { name: 'Vintage Rolex Submariner', price: 8500, trend: '+8%', img: 'https://source.unsplash.com/200x200/?rolex-submariner-watch' || 'https://via.placeholder.com/200x200?text=Watch' },
      { name: '1980s Air Jordan 1', price: 1200, trend: '+20%', img: 'https://source.unsplash.com/200x200/?air-jordan-1-sneakers' || 'https://via.placeholder.com/200x200?text=Sneakers' },
      { name: 'First Edition Harry Potter', price: 4500, trend: '+12%', img: 'https://source.unsplash.com/200x200/?harry-potter-book' || 'https://via.placeholder.com/200x200?text=Book' },
      { name: 'LeBron James Rookie Card', price: 1800, trend: '+25%', img: 'https://source.unsplash.com/200x200/?lebron-james-basketball-card' || 'https://via.placeholder.com/200x200?text=Card' },
    ];
  } else if (lowerCat === 'stocks') {
    // Mock; Alpha Vantage free key for real TSLA/AAPL later
    items = [
      { name: 'Tesla (TSLA)', price: 250, trend: '+10%', img: 'https://source.unsplash.com/200x200/?tesla' },
      { name: 'Apple (AAPL)', price: 220, trend: '-4%', img: 'https://source.unsplash.com/200x200/?apple' },
      { name: 'NVIDIA (NVDA)', price: 120, trend: '+25%', img: 'https://source.unsplash.com/200x200/?nvidia' },
      { name: 'Amazon (AMZN)', price: 185, trend: '+6%', img: 'https://source.unsplash.com/200x200/?amazon' },
      { name: 'Google (GOOGL)', price: 165, trend: '+2%', img: 'https://source.unsplash.com/200x200/?google' },
    ];
  } else {
    items = []; // Unknown cat fallback
  }

  return NextResponse.json({ items, category });
}