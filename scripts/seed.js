// scripts/seed.js
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const { promisify } = require('util');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function seedCrypto() {
  console.log('🌟 TrackAura Seeding Crypto Categories & Items...');
  
  // Step 1: Seed top categories (e.g., from CoinGecko /coins/categories)
  try {
    const { data: cats } = await axios.get('https://api.coingecko.com/api/v3/coins/categories/list');
    const topCats = cats.slice(0, 20);  // Limit for quick seed; expand later
    const inserts = topCats.map(cat => ({
      name: cat.name,
      slug: cat.id,
      label: cat.name,
      icon: '₿',
      description: `Crypto category: ${cat.name}`
    }));
    const { error: catError } = await supabase.from('categories').insert(inserts).select();
    if (catError) throw catError;
    console.log(`✅ Seeded ${topCats.length} crypto categories (e.g., bitcoin, stablecoins)`);
  } catch (err) {
    console.error('❌ Crypto cat seed error:', err.message);
    return;
  }

  // Step 2: Seed items (top 100 markets, link to 'crypto' root cat)
  try {
    const { data: items } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=100&page=1&sparkline=false');
    const rootCat = await supabase.from('categories').select('id').eq('slug', 'crypto').single();  // Assume 'crypto' root exists or seed it first
    if (!rootCat.data) {
      console.log('⚠️ Creating root crypto category...');
      const { data: newRoot } = await supabase.from('categories').insert({ name: 'crypto', slug: 'crypto', label: 'Crypto', icon: '₿' }).select().single();
      rootCatId = newRoot.id;
    } else {
      rootCatId = rootCat.data.id;
    }

    const itemInserts = items.map(item => ({
      slug: item.id,
      name: item.name,
      category_id: rootCatId,
      teaser_price: item.current_price,
      trend: item.price_change_percentage_24h || 0,
      image_url: item.image,
      description: `${item.name} - Current: $${item.current_price} | 24h: ${item.price_change_percentage_24h?.toFixed(2)}%`
    }));
    const { error: itemError } = await supabase.from('items').insert(itemInserts).select();
    if (itemError) throw itemError;
    console.log(`✅ Seeded ${items.length} crypto items (e.g., Bitcoin at $${items[0].current_price})`);
  } catch (err) {
    console.error('❌ Crypto item seed error:', err.message);
  }
}

async function seedStocks() {
  console.log('📈 TrackAura Seeding Stocks Sectors & Items...');
  
  // Step 1: Seed sectors (hardcoded top 5; fetch from Alpha Vantage /SECTOR later)
  const sectors = [
    { name: 'technology', slug: 'technology', label: 'Technology', icon: '💻' },
    { name: 'finance', slug: 'finance', label: 'Finance', icon: '🏦' },
    { name: 'healthcare', slug: 'healthcare', label: 'Healthcare', icon: '🩺' },
    { name: 'energy', slug: 'energy', label: 'Energy', icon: '⚡' },
    { name: 'consumer', slug: 'consumer', label: 'Consumer Goods', icon: '🛒' }
  ];
  try {
    const { error: sectorError } = await supabase.from('categories').insert(sectors).select();
    if (sectorError) throw sectorError;
    console.log(`✅ Seeded ${sectors.length} stock sectors`);
  } catch (err) {
    console.error('❌ Stock sector seed error:', err.message);
    return;
  }

  // Step 2: Download/parse CSV (Alpha Vantage LISTING_STATUS—~4k symbols)
  const csvUrl = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${process.env.ALPHA_VANTAGE_KEY || 'demo'}`;
  let csvData;
  try {
    const { data: csvResponse } = await axios.get(csvUrl);
    csvData = csvResponse;  // Raw CSV text
    fs.writeFileSync('temp_listing_status.csv', csvData);  // Temp file for streaming
  } catch (err) {
    console.error('❌ CSV download error:', err.message);
    return;
  }

  // Step 3: Stream/parse rows, collect for async batch
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream('temp_listing_status.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Filter US stocks only, skip if no name/symbol
        if (row.name && row.symbol && row['exchange'] === 'NASDAQ' || row['exchange'] === 'NYSE') {
          results.push(row);
        }
      })
      .on('end', async () => {
        console.log(`📊 Parsed ${results.length} stock symbols from CSV`);
        
        // Batch insert (5 at a time for rate limits; assign to 'technology' as example—randomize sectors in prod)
        const techCat = await supabase.from('categories').select('id').eq('slug', 'technology').single();
        if (!techCat.data) {
          reject(new Error('Tech category not found—seed sectors first'));
          return;
        }
        const techCatId = techCat.data.id;

        const batchSize = 5;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize).map(row => ({
            slug: row.symbol,
            name: row.name,
            category_id: techCatId,  // TODO: Map to real sector via row['sector']
            teaser_price: 0,  // Fetch real prices via TIME_SERIES_DAILY in separate cron
            trend: 0,  // Pull from daily API
            image_url: `https://logo.clearbit.com/${row.symbol.toLowerCase()}.com`,  // Fallback
            description: `${row.name} (${row.symbol}) - ${row['sector'] || 'Unknown Sector'} on ${row['exchange']}`
          }));
          try {
            const { error } = await supabase.from('items').insert(batch).select();
            if (error) throw error;
            console.log(`✅ Batched stocks ${i + 1}-${Math.min(i + batchSize, results.length)}`);
            await new Promise(resolve => setTimeout(resolve, 12000));  // 12s sleep for free tier (500 calls/day)
          } catch (err) {
            console.error(`❌ Batch ${i} error:`, err.message);
          }
        }
        fs.unlinkSync('temp_listing_status.csv');  // Cleanup
        console.log(`✅ Seeded ${results.length} stocks!`);
        resolve();
      })
      .on('error', reject);
  });
}

// Run seeders sequentially
async function main() {
  await seedCrypto();
  await seedStocks();
  console.log('🎉 TrackAura DB Seeding Complete—Check Supabase Dashboard for new categories/items!');
}

main().catch(console.error);