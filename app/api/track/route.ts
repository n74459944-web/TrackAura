// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';  // Shared singleton client

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

// Supabase types (for mainCat and cachedItem)
interface Category {
  id: string;
  name: string;
  slug: string;  // FIXED: Added slug for comparison
  subCategories: { id: string; slug: string; name: string }[];  // Recursive alias
}

interface Item {
  id: string;
  slug: string;
  name: string;
  teaser_price: number;
  description: string;
  image_url: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const { item, category }: { item?: string; category?: string } = await request.json();
    console.log('TrackAura API Received:', { item, category });

    if (!item) {
      return NextResponse.json({ error: 'Missing item slug' }, { status: 400 });
    }

    const supabase = getSupabase();  // Shared client—no multi-instance issues

    // Category teasers (e.g., top-6-crypto or top-3-altcoins)
    if (item.startsWith('top-')) {
      const match = item.match(/top-(\d+)-(.+)/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid teaser format (e.g., top-6-crypto or top-3-altcoins)' }, { status: 400 });
      }
      const num = parseInt(match[1]);
      const teaserCategory = match[2].toLowerCase();
      
      // Find main category with subs (typed response, include slug)
      const { data: mainCat, error: mainError } = await supabase
        .from('categories')
        .select('id, name, slug, subCategories:categories(id, slug, name)')  // FIXED: Explicit slug in select
        .eq('slug', category || teaserCategory)
        .single() as { data: Category | null; error: any };
      if (mainError || !mainCat) {
        console.log('DEBUG: Main cat missing for', category || teaserCategory);
        return NextResponse.json({ error: 'Category not found—seed more data?' }, { status: 404 });
      }

      let query = supabase
        .from('items')
        .select('*')
        .eq('category_id', mainCat.id)
        .order('trend', { ascending: false })
        .limit(num);

      // Sub-category: Filter to sub's items (typed find)
      if (teaserCategory !== mainCat.slug) {  // FIXED: Now typed—compares slugs safely
        const subCat = mainCat.subCategories?.find((s: { slug: string }) => s.slug === teaserCategory);
        if (!subCat) {
          console.log('DEBUG: Sub cat missing', teaserCategory, 'in main', category);
          return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 });
        }
        query = supabase.from('items').select('*').eq('category_id', subCat.id).order('trend', { ascending: false }).limit(num);
      }

      const { data: relatedItems, error: queryError } = await query as { data: CategoryItem[] | null; error: any };
      if (queryError || !relatedItems) {
        console.error('Query error:', queryError);
        return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
      }

      console.log('API Teaser Return:', { mainCategory: category || teaserCategory, numItems: relatedItems.length });

      return NextResponse.json({ related: relatedItems });
    }

    // Individual item (Grok/mock + optional DB cache)
    const isDev = process.env.NODE_ENV === 'development';
    const grokApiKey = process.env.GROK_API_KEY;

    // Optional: Check DB cache first (typed response)
    const { data: cachedItem, error: cacheError } = await supabase
      .from('items')
      .select('*')
      .eq('slug', item)
      .single() as { data: Item | null; error: any };
    if (cacheError) {
      console.error('Cache query error:', cacheError);
    }
    if (cachedItem) {
      console.log('Cache hit for', item);
      // Return teaser data (expand with Grok history if needed)
      return NextResponse.json({
        currentPrice: cachedItem.teaser_price,  // FIXED: Typed access
        history: [],  // TODO: Cron-fetch history to DB or parallel Grok call
        specs: {
          Name: cachedItem.name,  // FIXED: Typed access
          Description: cachedItem.description,
          'Image URL': cachedItem.image_url,
          Category: cachedItem.category || 'general'
        }
      });
    }

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
      return NextResponse.json({ error: 'Grok API key missing in .env.local—add it for live item data' }, { status: 500 });
    }

    // Grok for fresh data (unchanged—strict prompt for JSON)
    const isCrypto = category === 'crypto' || ['bitcoin', 'ethereum', 'solana', 'tether', 'binancecoin', 'ripple'].includes(item.toLowerCase());
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
    console.log('Grok Raw Response (first 200 chars):', grokText.substring(0, 200) + '...');

    if (!grokRes.ok) {
      return NextResponse.json({ 
        error: `Grok API error (${grokRes.status}): ${grokRes.statusText}. Check https://x.ai/api.` 
      }, { status: 500 });
    }

    let parsed: TrackData;
    try {
      const grokData = JSON.parse(grokText);
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

    // Trim history to 30 days (sort newest first)
    parsed.history = parsed.history
      .filter(h => h.date && !isNaN(new Date(h.date).getTime()))  // Guard invalids
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    // Optional: Cache to DB (uncomment for prod perf)
    // await supabase.from('items').upsert({ 
    //   slug: item, 
    //   teaser_price: parsed.currentPrice,
    //   ...parsed.specs 
    // });

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