import { NextRequest, NextResponse } from 'next/server';

interface CategoryItem {
  slug: string;
  name: string;
  image_url: string;
  teaser_price: number;
  trend: number;
}

export async function POST(request: NextRequest) {
  try {
    const { item, category }: { item?: string; category?: string } = await request.json();
    console.log('Received in API:', { item, category });

    if (!item) {
      return NextResponse.json({ error: 'Missing item slug' }, { status: 400 });
    }

    // Category teasers handler (e.g., 'top-6-crypto') – JSON + Mock Sync (no API for speed)
    if (item.startsWith('top-6-')) {
  const teaserCategory = item.slice(6).toLowerCase();
  let staticData;
  try {
    const staticDataRes = await fetch(
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}/data/categories.json`
    );
    if (!staticDataRes.ok) {
      console.error('JSON fetch failed:', staticDataRes.status, staticDataRes.statusText);  // NEW: Log fetch errors
      return NextResponse.json({ error: 'Category data unavailable—check /data/categories.json' }, { status: 500 });
    }
    staticData = await staticDataRes.json();
  } catch (err) {
    console.error('JSON load error:', err);
    return NextResponse.json({ error: 'Category data unavailable' }, { status: 500 });
  }

  const categoryData = staticData.categories.find((c: any) => c.name === teaserCategory);
  console.log('DEBUG: Looking for', teaserCategory, '| Found:', categoryData ? categoryData.name : 'MISSING! Available cats:', staticData.categories.map((c: any) => c.name));  // NEW: Spill all for debug

  let relatedItems: CategoryItem[] = categoryData?.items || [];

      // Mock live sync (or optional Grok batch for prices—add if needed)
      // For now, use static trends; Grok for individual items

      const returnData = { related: relatedItems.slice(0, 6) };
      console.log('API Category Return:', returnData);
      return NextResponse.json(returnData);
    }

    // All items (crypto + general): Grok or Mock
    const grokApiKey = process.env.GROK_API_KEY;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev && !grokApiKey) {
      const mockData = {
        currentPrice: category === 'crypto' ? 70000 : 9500,  // Crypto mock higher
        history: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          price: (category === 'crypto' ? 70000 : 9500) + Math.sin(i / 3) * (category === 'crypto' ? 5000 : 500),
        })),
        specs: {
          'Name': item.replace(/-/g, ' '),
          'Description': `Premium ${item} with historical value tracking via TrackAura.`,
          'Image URL': `https://via.placeholder.com/256?text=${item.toUpperCase()}`,
          'Source': 'Mock for Dev',
        },
      };
      return NextResponse.json(mockData);
    }

    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key missing in .env.local—add it for all items' },
        { status: 500 }
      );
    }

    // Unified Grok prompt: Tailor for crypto vs general
    const isCrypto = category === 'crypto' || ['bitcoin', 'ethereum', 'solana'].includes(item.toLowerCase());
    const categoryPart = category ? ` in category "${category}"` : '';
    const typePart = isCrypto ? ' (crypto: use CoinMarketCap/TradingView for live USD price + 24h change)' : ' (non-crypto: eBay/StockX/Wiki)';
    const grokPrompt = `For "${item}"${categoryPart}${typePart}: Fetch current avg USD price, 30-day history (YYYY-MM-DD, USD prices/trends). Key specs: Name, Description (200 chars), Image URL (high-res HTTPS from official/Wikimedia/eBay). 
Output ONLY valid JSON: { "currentPrice": number, "history": [{ "date": "YYYY-MM-DD", "price": number }], "specs": { "Name": string, "Description": string, "Image URL": string, ... } }. Sources: CoinMarketCap (crypto), eBay/StockX (general). Accurate as of now. Always include Image URL.`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: grokPrompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    const grokText = await grokRes.text();
    console.log('Grok Raw Response:', grokText.substring(0, 200) + '...');

    if (!grokRes.ok) {
      return NextResponse.json({ 
        error: `Grok API error (${grokRes.status}): ${grokRes.statusText}. Check https://x.ai/api.` 
      }, { status: 500 });
    }

    const grokData = JSON.parse(grokText);
    let parsed;
    try {
      parsed = JSON.parse(grokData.choices[0].message.content.trim());
    } catch {
      return NextResponse.json(
        { error: 'Grok JSON parse failed—response not structured.' },
        { status: 500 }
      );
    }

    if (!parsed.currentPrice || !parsed.history?.length || !parsed.specs) {
      return NextResponse.json(
        { error: 'Grok data incomplete—try simpler item.' },
        { status: 500 }
      );
    }

    // Fallback image if missing
    if (!parsed.specs['Image URL']) {
      parsed.specs['Image URL'] = `https://via.placeholder.com/256x256/4F46E5/FFFFFF?text=${item.replace(/-/g, ' ').toUpperCase()}`;
    }

    // Trim history to 30 days
    if (parsed.history.length > 30) {
      parsed.history = parsed.history.slice(-30);
    }

    return NextResponse.json({
      currentPrice: parsed.currentPrice,
      history: parsed.history,
      specs: parsed.specs,
    });
  } catch (error) {
    console.error('TrackAura API error:', error);
    return NextResponse.json(
      { error: 'Server hiccup—check console for details' },
      { status: 500 }
    );
  }
}