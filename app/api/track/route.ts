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

    // Category teasers (e.g., top-6-crypto)
    if (item.startsWith('top-')) {
      const match = item.match(/top-(\d+)-(.+)/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid teaser format (e.g., top-6-crypto)' }, { status: 400 });
      }
      const num = parseInt(match[1]);
      const teaserCategory = match[2].toLowerCase();
      
      let staticData;
      try {
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const staticDataRes = await fetch(`${proto}://${host}/data/categories.json`);
        if (!staticDataRes.ok) {
          console.error('JSON fetch failed:', staticDataRes.status);  // DEBUG: Log for 404s
          return NextResponse.json({ error: 'Category data unavailable—ensure public/data/categories.json exists' }, { status: 500 });
        }
        staticData = await staticDataRes.json();
      } catch (err) {
        console.error('JSON load error:', err);
        return NextResponse.json({ error: 'Category data unavailable' }, { status: 500 });
      }

      // FIXED: Case-insensitive matching for robust cat find
      const mainCatData = staticData.categories.find((c: any) => 
        c.name.toLowerCase() === (category || teaserCategory).toLowerCase()  // FIXED: Case-insensitive
      );
      if (!mainCatData) {
        console.log('DEBUG: Main cat missing for', category || teaserCategory, '| Available:', staticData.categories?.map((c: any) => c.name));  // DEBUG: Spill for diagnosis
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      let relatedItems: CategoryItem[] = [];
      if (teaserCategory === mainCatData.name.toLowerCase()) {
        relatedItems = mainCatData.items || [];
      } else {
        const subCatData = mainCatData.subCategories?.find((s: any) => s.name.toLowerCase() === teaserCategory);
        if (!subCatData) {
          console.log('DEBUG: Sub cat missing', teaserCategory, 'in main', category);  // DEBUG
          return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 });
        }
        relatedItems = subCatData.items || [];
      }

      relatedItems = relatedItems.slice(0, num);
      console.log('API Teaser Return:', { mainCategory: category || teaserCategory, numItems: relatedItems.length });  // DEBUG

      return NextResponse.json({ related: relatedItems });
    }

    // Individual items (Grok/mock)
    const isDev = process.env.NODE_ENV === 'development';
    const grokApiKey = process.env.GROK_API_KEY;

    if (isDev && !grokApiKey) {
      const mockData: TrackData = {
        currentPrice: category === 'crypto' ? 95000 : 9500,
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
      return NextResponse.json(mockData);
    }

    if (!grokApiKey) {
      return NextResponse.json({ error: 'Grok API key missing—add to .env.local' }, { status: 500 });
    }

    // Grok prompt (tailored)
    const isCrypto = category === 'crypto' || ['bitcoin', 'ethereum', 'solana'].includes(item.toLowerCase());
    const categoryPart = category ? ` in category "${category}"` : '';
    const typePart = isCrypto ? ' (crypto: CoinMarketCap/TradingView for USD + 24h)' : ' (non-crypto: eBay/StockX/Wikimedia)';
    const grokPrompt = `For "${item}"${categoryPart}${typePart}: Current avg USD price, 30-day history ({ "date": "YYYY-MM-DD", "price": number }). Specs: "Name", "Description" (200 chars), "Image URL" (HTTPS high-res). Output ONLY JSON: { "currentPrice": number, "history": [...], "specs": { ... } }.`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${grokApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: grokPrompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!grokRes.ok) {
      return NextResponse.json({ error: `Grok API error (${grokRes.status})` }, { status: 500 });
    }

    const grokText = await grokRes.text();
    let parsed: TrackData;
    try {
      const grokData = JSON.parse(grokText);
      parsed = JSON.parse(grokData.choices[0].message.content.trim());
    } catch {
      return NextResponse.json({ error: 'Grok JSON parse failed' }, { status: 500 });
    }

    if (!parsed.currentPrice || !parsed.history?.length || !parsed.specs) {
      return NextResponse.json({ error: 'Incomplete Grok data' }, { status: 500 });
    }

    // Fallbacks
    if (!parsed.specs['Image URL']) {
      parsed.specs['Image URL'] = `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=${item.toUpperCase()}`;
    }

    parsed.history = parsed.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

    return NextResponse.json({
      currentPrice: parsed.currentPrice,
      history: parsed.history,
      specs: parsed.specs,
    });
  } catch (error) {
    console.error('TrackAura API Error:', error);
    return NextResponse.json({ error: 'Server error—check console' }, { status: 500 });
  }
}