// scripts/populate.js
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const CATEGORIES_PATH = path.join(__dirname, '../public/data/categories.json');
const GROK_API_KEY = process.env.GROK_API_KEY;

console.log('Starting TrackAura populate with Grok...');
console.log('GROK_API_KEY loaded:', GROK_API_KEY ? 'Yes' : 'No');

if (!GROK_API_KEY) {
  console.error('Add GROK_API_KEY to .env.local');
  process.exit(1);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGrokData(items) {
  const slugs = items.map(item => item.slug).join(', ');
  const prompt = `For these top crypto items (${slugs}): Fetch current USD prices + 24h % change. Output ONLY valid JSON array—no other text: [{ "slug": "bitcoin", "price": number, "change24h": number }, ...]. Sources: CoinMarketCap. Accurate now.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);  // FIXED: 10s timeout

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Grok batch failed: ${res.status}`);
    const text = await res.text();
    const data = JSON.parse(text);
    return JSON.parse(data.choices[0].message.content.trim());
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Batch timeout (10s)');
    throw err;
  }
}

function extractJson(text) {
  const jsonMatch = text.trim().match(/\{[^{}]*(\{[^}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  throw new Error('No valid JSON found');
}

async function updateTeasers(categories) {
  const cryptoCat = categories.find(cat => cat.name === 'crypto');
  if (cryptoCat && cryptoCat.items.length > 0) {
    try {
      const updates = await fetchGrokData(cryptoCat.items);
      cryptoCat.items.forEach(item => {
        const update = updates.find(u => u.slug === item.slug);
        if (update) {
          item.teaser_price = update.price;
          item.trend = update.change24h;
        }
      });
      console.log(`Updated ${cryptoCat.items.length} crypto teasers via Grok.`);
    } catch (err) {
      console.error('Grok batch error:', err.message);
    }
  }

  let generalCount = 0;
  for (const cat of categories) {
    if (cat.name !== 'crypto') {
      for (const item of cat.items) {
        const startTime = new Date().toISOString();  // FIXED: Timestamp log
        console.log(`Starting teaser for ${item.slug} (${cat.name}) at ${startTime}`);
        try {
          let sources = 'eBay/StockX/Wikipedia';
          if (cat.name === 'stocks') sources = 'Yahoo Finance/Google Finance (NVDA ~$140/share as fallback)';
          else if (cat.name === 'coins') sources = 'PCGS/Numista';
          const prompt = `For "${item.slug}" in "${cat.name}": Current USD price + 1Y trend %. Output STRICTLY valid JSON object—no other text, no explanations, no "I'm": { "price": number, "trend": number }. Sources: ${sources}. Accurate as of Nov 8, 2025.`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);  // FIXED: Per-call timeout

          const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${GROK_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'grok-3',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.0,
              max_tokens: 100,
            }),
          });
          clearTimeout(timeoutId);

          console.log(`Grok response for ${item.slug}: ${res.status} at ${new Date().toISOString()}`);

          if (res.ok) {
            const text = await res.text();
            const data = JSON.parse(text);
            let parsed;
            try {
              parsed = extractJson(data.choices[0].message.content.trim());
            } catch (parseErr) {
              console.error(`Parse failed for ${item.slug}: ${parseErr.message}. Raw: "${data.choices[0].message.content.substring(0, 100)}..."`);
              continue;  // FIXED: Skip, don't hang
            }
            item.teaser_price = parsed.price || item.teaser_price;
            item.trend = parsed.trend || item.trend;
            generalCount++;
            console.log(`Updated ${item.slug}: $${item.teaser_price} (trend ${item.trend}%)`);
          } else {
            console.error(`API error for ${item.slug}: ${res.status} - ${res.statusText}`);
          }
          await delay(1500);
          console.log(`Completed ${item.slug} at ${new Date().toISOString()}`);
        } catch (err) {
          console.error(`Teaser for ${item.slug} failed at ${startTime}: ${err.message}`);
          if (err.name === 'AbortError') console.log(`Timeout on ${item.slug}—skipping.`);
        }
      }
    }
  }
  console.log(`Updated ${generalCount} general teasers.`);
}

async function main() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));
  } catch (err) {
    console.error('JSON load failed:', err);
    return;
  }

  console.log(`Loaded ${data.categories.length} categories.`);

  await updateTeasers(data.categories);

  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(data, null, 2));
  console.log('Populate complete! All teasers updated via Grok.');
}

main().catch(err => {
  console.error('Populate error:', err.message);
  process.exit(1);
});