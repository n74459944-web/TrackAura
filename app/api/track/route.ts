// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface CategoryItem {
  slug: string;
  name: string;
  image_url: string;
  teaser_price: number;
  trend: number;
}

interface TrackData {
  currentPrice: number;
  history: { date: string; price: number }[];
  specs: { [key: string]: string };
}

export async function POST(request: NextRequest) {
  try {
    const { item, category }: { item?: string; category?: string } = await request.json();
    console.log('TrackAura API Received:', { item, category });

    if (!item) {
      return NextResponse.json({ error: 'Missing item slug' }, { status: 400 });
    }

    // Category teasers handler (main or sub, e.g., top-6-crypto or top-3-altcoins)
    if (item.startsWith('top-')) {
      const match = item.match(/top-(\d+)-(.+)/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid teaser format (e.g., top-6-crypto or top-3-altcoins)' }, { status: 400 });
      }
      const num = parseInt(match[1]);
      const teaserCategory = match[2].toLowerCase();  // e.g., "crypto" or "altcoins"
      
      let staticData;
      try {
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const staticDataRes = await fetch(`${proto}://${host}/data/categories.json`);
        if (!staticDataRes.ok) {
          console.error('TrackAura JSON fetch failed:', staticDataRes.status, staticDataRes.statusText);
          return NextResponse.json({ error: 'Category data unavailable—check public/data/categories.json exists' }, { status: 500 });
        }
        staticData = await staticDataRes.json();
      } catch (err) {
        console.error('TrackAura JSON load error:', err);
        return NextResponse.json({ error: 'Category data unavailable' }, { status: 500 });
      }

      const mainCatData = staticData.categories.find((c: any) => c.name === (category || teaserCategory));
      if (!mainCatData) {
        console.log('TrackAura DEBUG: Main cat missing for', category || teaserCategory, '| Available cats:', staticData.categories.map((c: any) => c.name));
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      let relatedItems: CategoryItem[] = [];
      if (teaserCategory === mainCatData.name) {
        // Main category: Use .items
        relatedItems = mainCatData.items || [];
      } else {
        // Sub-category: Nested lookup in .subCategories
        const subCatData = mainCatData.subCategories?.find((s: any) => s.name === teaserCategory);
        if (!subCatData) {
          console.log('TrackAura DEBUG: Sub cat missing', teaserCategory, 'in main', category, '| Available subs:', mainCatData.subCategories?.map((s: any) => s.name));
          return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 });
        }
        relatedItems = subCatData.items || [];
      }

      // Trim to requested number (e.g., 6 for main, 3 for subs)
      relatedItems = relatedItems.slice(0, num);
      console.log('TrackAura API Teaser Return:', { mainCategory: category || teaserCategory, teaserCategory, numItems: relatedItems.length });

      const returnData = { related: relatedItems };
      return NextResponse.json(returnData);
    }

    // Individual item handler (e.g., "bitcoin" or "rolex-submariner")
    const isDev = process.env.NODE_ENV === 'development';
    const grokApiKey = process.env.GROK_API_KEY;

    // Dev mocks for common items (expand as needed for faster local testing on Windows)
    if (isDev && !grokApiKey) {
      const mockData: TrackData = {
        currentPrice: category === 'crypto' ? 95000 : 9500,  // Higher for crypto mocks
        history: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          price: (category === 'crypto' ? 95000 : 9500) + Math.sin(i / 3) * (category === 'crypto' ? 5000 : 500),
        })),
        specs: {
          'Name': item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          'Description': `Premium ${item.replace(/-/g, ' ')} with historical value tracking via TrackAura.`,
          'Image URL': `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=${item.toUpperCase()}`,
          'Source': 'TrackAura Dev Mock',
        },
      };
      console.log('TrackAura Dev Mock Served:', item);
      return NextResponse.json(mockData);
    }

    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key missing in .env.local—add GROK_API_KEY for live item data' },
        { status: 500 }
      );
    }

    // Unified Grok prompt: Tailored for crypto vs general items
    const isCrypto = category === 'crypto' || ['bitcoin', 'ethereum', 'solana', 'tether', 'binancecoin', 'ripple'].includes(item.toLowerCase());
    const categoryPart = category ? ` in category "${category}"` : '';
    const typePart = isCrypto ? ' (crypto: use CoinMarketCap/TradingView for live USD price + 24h change)' : ' (non-crypto: eBay/StockX/Wikimedia for auctions/historical values)';
    const grokPrompt = `For item "${item}"${categoryPart}${typePart}: Fetch current average USD price, EXACTLY 30-day history (array of { "date": "YYYY-MM-DD" (strict ISO, no times/zones), "price": number (USD) }, sorted newest first, daily intervals only—no gaps/invalids). Key specs: "Name" (exact), "Description" (200 chars), "Image URL" (high-res HTTPS required). Additional: "Category", "Source" (e.g., CoinMarketCap).

Output ONLY valid JSON—no extra text: { "currentPrice": number, "history": [{ "date": "YYYY-MM-DD", "price": number }], "specs": { "Name": string, "Description": string, "Image URL": string, ... } }. Use real-time data as of ${new Date().toISOString().split('T')[0]}. Always include "Image URL" and 30 history entries.`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',  // Or 'grok-beta' if updated
        messages: [{ role: 'user', content: grokPrompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    const grokText = await grokRes.text();
    console.log('TrackAura Grok Raw Response (first 200 chars):', grokText.substring(0, 200) + '...');

    if (!grokRes.ok) {
      return NextResponse.json({ 
        error: `Grok API error (${grokRes.status}): ${grokRes.statusText}. Check https://x.ai/api for status.` 
      }, { status: 500 });
    }

    let parsed: TrackData;
    try {
      const grokData = JSON.parse(grokText);
      parsed = JSON.parse(grokData.choices[0].message.content.trim());
    } catch (parseErr) {
      console.error('TrackAura Grok JSON Parse Error:', parseErr);
      return NextResponse.json(
        { error: 'Grok response not valid JSON—try a simpler item name.' },
        { status: 500 }
      );
    }

    if (!parsed.currentPrice || !parsed.history?.length || parsed.history.length < 20 || !parsed.specs) {
      return NextResponse.json(
        { error: 'Incomplete Grok data (needs currentPrice, 30-day history, specs)—retry or check prompt.' },
        { status: 500 }
      );
    }

    // Fallbacks & Cleanup
    if (!parsed.specs['Image URL']) {
      parsed.specs['Image URL'] = `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=${item.toUpperCase()}`;
    }
    if (!parsed.specs['Name']) {
      parsed.specs['Name'] = item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!parsed.specs['Description']) {
      parsed.specs['Description'] = `Track the value of ${parsed.specs['Name']} over time with TrackAura—historical prices, specs, and charts for every item worldwide.`;
    }

    // Trim/ensure 30-day history (sorted newest first)
    parsed.history = parsed.history
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    console.log('TrackAura Grok Parsed Success:', { item, currentPrice: parsed.currentPrice, historyCount: parsed.history.length });

    // Optional: Vercel KV Caching (uncomment & install @vercel/kv if using)
    // import { kv } from '@vercel/kv';
    // const cacheKey = `track:${item}:${category || 'general'}`;
    // await kv.set(cacheKey, parsed, { ex: 3600 });  // 1hr TTL

    return NextResponse.json({
      currentPrice: parsed.currentPrice,
      history: parsed.history,
      specs: parsed.specs,
    });
  } catch (error) {
    console.error('TrackAura API Error:', error);
    return NextResponse.json(
      { error: 'Server error—check console logs for details. Try refreshing.' },
      { status: 500 }
    );
  }
}