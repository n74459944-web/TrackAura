// scripts/seed.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('TrackAura Seeder: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local—check Dashboard > Settings > API > service_role');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTables() {
  console.log('Clearing existing data...');
  const { error: itemError } = await supabase.from('items').delete().neq('id', '');
  if (itemError) console.warn('Items clear warning:', itemError);
  const { error: catError } = await supabase.from('categories').delete().neq('id', '');
  if (catError) console.warn('Categories clear warning:', catError);
}

async function seedCrypto() {
  console.log('Seeding Crypto Categories & Items...');
  
  // FIXED: Insert root 'crypto' category first
  const rootCrypto = {
    name: 'Crypto',
    slug: 'crypto',
    label: 'Crypto',
    icon: '₿',
    description: 'Root category for all cryptocurrencies'
  };
  const { error: rootError } = await supabase.from('categories').upsert(rootCrypto, { onConflict: 'slug' });
  if (rootError) throw rootError;

  // Categories (top 20 from CoinGecko—upsert on name/slug, optional parent_id for subs later)
  const { data: catsRes } = await axios.get('https://api.coingecko.com/api/v3/coins/categories/list');
  const categories = catsRes.slice(0, 20).map(cat => ({
    name: cat.name,
    slug: cat.id,
    label: cat.name,
    icon: '₿',
    description: `Crypto category: ${cat.name}`,
    // parent_id: rootCrypto.id  // Uncomment to nest under root (add FK if needed)
  }));
  const { error: catError } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'name' });
  if (catError) throw catError;

  // Items (top 100 markets, link to root 'crypto'—upsert on slug)
  const { data: itemsRes } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=100&page=1');
  const rootCat = await supabase.from('categories').select('id').eq('slug', 'crypto').single();
  if (!rootCat.data) throw new Error('Crypto root category not found—seed failed');
  const items = itemsRes.map(item => ({
    slug: item.id,
    name: item.name,
    category_id: rootCat.data.id,  // FIXED: Links to root
    teaser_price: item.current_price,
    trend: item.price_change_percentage_24h || 0,
    image_url: item.image,
    description: `${item.name} - Market Cap: $${item.market_cap?.toLocaleString() || 'N/A'}`
  }));
  const { error: itemError } = await supabase
    .from('items')
    .upsert(items, { onConflict: 'slug' });
  if (itemError) throw itemError;

  console.log(`Seeded/Updated root + ${categories.length} crypto cats + ${items.length} items!`);
}

async function seedStocks() {
  console.log('Seeding Stocks Categories & Items...');
  
  // Categories (sectors—upsert on name)
  const sectors = [
    { name: 'technology', slug: 'technology', label: 'Technology', icon: '💻' },
    { name: 'finance', slug: 'finance', label: 'Finance', icon: '🏦' },
    { name: 'healthcare', slug: 'healthcare', label: 'Healthcare', icon: '🏥' }
  ];
  const { error: catError } = await supabase
    .from('categories')
    .upsert(sectors, { onConflict: 'name' });
  if (catError) throw catError;

  // Symbols (Alpha Vantage—upsert on slug)
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('No ALPHA_VANTAGE_API_KEY—skipping stocks (crypto seeded). Add to .env.local from alphavantage.co.');
    return;
  }

  const csvUrl = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`;
  const { data: csvData } = await axios.get(csvUrl, { responseType: 'text' });
  const symbols = [];
  csvData.split('\n').slice(1).forEach(line => {
    const [symbol, name, exchange] = line.split(',');
    if (symbol && name && exchange === 'NASDAQ') symbols.push({ symbol, name });
    if (symbols.length >= 500) return;
  });

  const techCat = await supabase.from('categories').select('id').eq('slug', 'technology').single();
  if (!techCat.data) throw new Error('Technology category not found');
  const items = symbols.map(s => ({
    slug: s.symbol.toLowerCase(),
    name: `${s.name} Stock`,
    category_id: techCat.data.id,
    teaser_price: 0,
    trend: 0,
    image_url: `https://source.unsplash.com/256x256/?${s.name.toLowerCase().split(' ').join('-')},stock`,
    description: `${s.name} - NASDAQ Listed`
  }));
  const { error: itemError } = await supabase
    .from('items')
    .upsert(items, { onConflict: 'slug' });
  if (itemError) throw itemError;

  console.log(`Seeded/Updated ${sectors.length} stock sectors + ${symbols.length} items!`);
}

// Main: Optional Clear + Seed
(async () => {
  try {
    // await clearTables();  // Comment to append
    await seedCrypto();
    await seedStocks();
    console.log('TrackAura Seeding Complete! Check Supabase > Table Editor > categories/items.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
})();