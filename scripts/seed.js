// scripts/seed.js
const path = require('path');

const dotenvPath = path.resolve(process.cwd(), '.env.local');
require('dotenv').config({ path: dotenvPath });

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // FIXED: For RLS bypass
const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
  console.error('Seeding Failed: Missing vars in .env.local—need URL/ANON_KEY + SERVICE_ROLE_KEY from dashboard > Settings > API');
  process.exit(1);
}
console.log('Seeding with Supabase (service key for writes):', { url: supabaseUrl.substring(0, 20) + '...', hasAlpha: !!alphaKey });

// Service client for inserts (bypasses RLS)
const serviceSupabase = createClient(supabaseUrl, serviceKey);
// Anon for selects (public reads)
const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearTables() {
  console.log('Clearing existing data...');
  await serviceSupabase.from('items').delete().neq('id', '');
  await serviceSupabase.from('categories').delete().neq('id', '');
}

async function seedCrypto() {
  console.log('Seeding Crypto...');
  
  // Categories (service upsert)
  const { data: catsRes } = await axios.get('https://api.coingecko.com/api/v3/coins/categories/list');
  const categories = catsRes.slice(0, 20).map(cat => ({
    name: cat.name,
    slug: cat.id,
    label: cat.name,
    icon: '₿',
    description: `Crypto: ${cat.name}`
  }));
  const { error: catError } = await serviceSupabase.from('categories').upsert(categories, { onConflict: 'name' });
  if (catError) throw catError;

  // Root crypto (anon select)
  const { data: rootCat } = await anonSupabase.from('categories').select('id').eq('slug', 'crypto').single();

  // Items (service upsert)
  const { data: itemsRes } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=100');
  const items = itemsRes.map(item => ({
    slug: item.id,
    name: item.name,
    category_id: rootCat.id,
    teaser_price: item.current_price,
    trend: item.price_change_percentage_24h || 0,
    image_url: item.image,
    description: `${item.name} - Cap: $${item.market_cap?.toLocaleString() || 'N/A'}`
  }));
  const { error: itemError } = await serviceSupabase.from('items').upsert(items, { onConflict: 'slug' });
  if (itemError) throw itemError;

  // Altcoins sub (service upsert)
  const altcoins = { name: 'altcoins', slug: 'altcoins', label: 'Altcoins', icon: '🪙', parent_id: rootCat.id };
  await serviceSupabase.from('categories').upsert(altcoins, { onConflict: 'name' });
  const { data: altCat } = await anonSupabase.from('categories').select('id').eq('slug', 'altcoins').single();
  const altItems = itemsRes.slice(0, 3).map(i => ({ ...i, category_id: altCat.id }));
  await serviceSupabase.from('items').upsert(altItems, { onConflict: 'slug' });

  console.log(`Crypto: 20 cats + 100 items (3 in altcoins sub)!`);
}

async function seedStocks() {
  if (!alphaKey) {
    console.warn('Skipping stocks—no ALPHA_VANTAGE_API_KEY in .env.local');
    return;
  }
  console.log('Seeding Stocks...');
  
  // Sectors (service upsert)
  const sectors = [
    { name: 'technology', slug: 'technology', label: 'Technology', icon: '💻' },
    { name: 'finance', slug: 'finance', label: 'Finance', icon: '🏦' },
    { name: 'healthcare', slug: 'healthcare', label: 'Healthcare', icon: '🏥' }
  ];
  await serviceSupabase.from('categories').upsert(sectors, { onConflict: 'name' });

  // Symbols CSV
  const csvUrl = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${alphaKey}`;
  const { data: csvText } = await axios.get(csvUrl);
  const symbols = [];
  const lines = csvText.split('\n').slice(1, 501);
  lines.forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length >= 2) {
      const symbol = parts[0].replace(/"/g, '').trim().toLowerCase();
      const name = parts[1].replace(/"/g, '').trim();
      if (symbol && name) symbols.push({ symbol, name });
    }
  });
  console.log(`Parsed ${symbols.length} symbols from CSV`);

  const { data: techCat } = await anonSupabase.from('categories').select('id').eq('slug', 'technology').single();
  const items = symbols.map(s => ({
    slug: s.symbol,
    name: `${s.name} Stock`,
    category_id: techCat.id,
    teaser_price: 0,
    trend: 0,
    image_url: `https://source.unsplash.com/256x256/?${s.name.toLowerCase().split(' ').join('-')},stock`,
    description: `${s.name} - NASDAQ`
  }));
  await serviceSupabase.from('items').upsert(items, { onConflict: 'slug' });

  // Tech sub (service upsert)
  const techSub = { name: 'tech-giants', slug: 'tech-giants', label: 'Tech Giants', icon: '🚀', parent_id: techCat.id };
  await serviceSupabase.from('categories').upsert(techSub, { onConflict: 'name' });
  const { data: techSubCat } = await anonSupabase.from('categories').select('id').eq('slug', 'tech-giants').single();
  const subItems = items.slice(0, 3).map(i => ({ ...i, category_id: techSubCat.id }));
  await serviceSupabase.from('items').upsert(subItems, { onConflict: 'slug' });

  console.log(`Stocks: 3 sectors + ${symbols.length} items (3 in tech-giants sub)!`);
}

// Run
(async () => {
  try {
    await clearTables();
    await seedCrypto();
    await seedStocks();
    console.log('Seeding done! Check Supabase > Tables for nested cats/items.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
})();