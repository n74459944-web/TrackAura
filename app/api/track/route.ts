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
    const { item } = await request.json();
    console.log('Received item in API:', item); // Debug log
    if (!item) {
      return NextResponse.json({ error: 'Missing item slug' }, { status: 400 });
    }

    // Known cryptos: Fast CoinGecko
    const coinMap: { [key: string]: string } = {
      bitcoin: 'bitcoin',
      ethereum: 'ethereum',
      litecoin: 'litecoin',
      dogecoin: 'dogecoin',
      solana: 'solana',
      cardano: 'cardano',
      bnb: 'binancecoin',
      xrp: 'ripple',
    };
    const coinId = coinMap[item.toLowerCase()];
    if (coinId) {
      const currentRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_24hr_vol=true`);
      if (!currentRes.ok) {
        return NextResponse.json({ error: 'CoinGecko current price fetch failed' }, { status: 500 });
      }
      const currentData = await currentRes.json();
      const coinData = currentData[coinId];
      if (!coinData || !coinData.usd) {
        return NextResponse.json({ error: 'Invalid coin data' }, { status: 500 });
      }

      const historyRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`);
      if (!historyRes.ok) {
        return NextResponse.json({ error: 'CoinGecko history fetch failed' }, { status: 500 });
      }
      const historyData = await historyRes.json();
      const history = historyData.prices
        ?.map(([timestamp, price]: [number, number]) => ({
          date: new Date(timestamp).toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
        })) || []
        .slice(-30);

      const specsRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&sparkline=false`);
      if (!specsRes.ok) {
        return NextResponse.json({ error: 'CoinGecko specs fetch failed' }, { status: 500 });
      }
      const specsData = await specsRes.json();

      console.log('CoinGecko Specs for', coinId, ':', specsData);

      if (!specsData) {
        return NextResponse.json({ error: 'Empty specs data from CoinGecko' }, { status: 500 });
      }

      const specs: { [key: string]: string } = {
        'Name': specsData.name || 'N/A',
        'Symbol': specsData.symbol?.toUpperCase() || 'N/A',
        'Market Cap': `$${coinData.usd_market_cap?.toLocaleString() || 'N/A'}`,
        '24h Change': `${coinData.usd_24h_change?.toFixed(2) || 0}%`,
        'Description': specsData.description?.en?.substring(0, 200) + '...' || 'N/A',
        'Image URL': specsData.image?.large || '',
      };

      return NextResponse.json({ currentPrice: coinData.usd, history, specs });
    }

    // Category teasers handler (e.g., 'top-6-crypto') – JSON + Live Sync
    if (item.startsWith('top-6-')) {
      const category = item.slice(6).toLowerCase(); // e.g., 'crypto'
      const isDev = process.env.NODE_ENV === 'development';

      // Load static JSON data
      let staticData;
      try {
        const staticDataRes = await fetch(`${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}/data/categories.json`);
        staticData = await staticDataRes.json();
      } catch (err) {
        console.error('JSON load error:', err);
        return NextResponse.json({ error: 'Category data unavailable' }, { status: 500 });
      }

      const categoryData = staticData.categories.find((c: any) => c.name === category);
      let relatedItems: CategoryItem[] = categoryData?.items || [];

      // Live sync for crypto (fetch fresh prices/trends)
      if (category === 'crypto' && relatedItems.length > 0) {
        const slugs = relatedItems.map(r => coinMap[r.slug] || r.slug).filter(Boolean);
        if (slugs.length > 0) {
          const liveRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${slugs.join(',')}&vs_currencies=usd&include_24hr_change=true`);
          const liveData = await liveRes.json();
          relatedItems = relatedItems.map((item, index) => {
            const id = coinMap[item.slug] || item.slug;
            const live = liveData[id];
            return {
              ...item,
              teaser_price: live?.usd || item.teaser_price,
              trend: live?.usd_24h_change || item.trend, // Use 24h for teaser; full 1Y in item page
            };
          });
        }
      }

      const returnData = { related: relatedItems.slice(0, 6) };
      console.log('API Category Return:', returnData); // Debug log
      return NextResponse.json(returnData);
    }

    // General items: Grok or Mock
    const grokApiKey = process.env.GROK_API_KEY;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev && !grokApiKey) {
      const mockData = {
        currentPrice: 9500,
        history: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          price: 9500 + Math.sin(i / 3) * 500,
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
      return NextResponse.json({ error: 'Grok API key missing in .env.local—add it for non-crypto items' }, { status: 500 });
    }

    const grokPrompt = `For "${item}": Fetch current avg USD price (e.g., eBay/StockX), 30 recent history points (YYYY-MM-DD, USD prices from 1Y trends), key specs (Name, Description, Image URL from reliable source like Wiki/Google). 
    Output ONLY valid JSON: { "currentPrice": number, "history": [{ "date": "YYYY-MM-DD", "price": number }], "specs": { "Name": string, "Description": string, "Image URL": string, ... } }. Sources: eBay, StockX, Wikipedia. Accurate USD.`;

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
    console.log('Grok Raw Response:', grokText);

    if (!grokRes.ok) {
      return NextResponse.json({ 
        error: `Grok API error (${grokRes.status}): ${grokRes.statusText}. Check key/limits at https://x.ai/api. Raw: ${grokText.substring(0, 200)}...` 
      }, { status: 500 });
    }

    const grokData = JSON.parse(grokText);
    let parsed;
    try {
      parsed = JSON.parse(grokData.choices[0].message.content.trim());
    } catch {
      return NextResponse.json({ error: 'Grok JSON parse failed—response not structured. Raw: ' + grokData.choices[0].message.content.substring(0, 200) }, { status: 500 });
    }

    if (!parsed.currentPrice || !parsed.history?.length || !parsed.specs) {
      return NextResponse.json({ error: 'Grok data incomplete—try simpler item. Raw parsed: ' + JSON.stringify(parsed).substring(0, 200) }, { status: 500 });
    }

    return NextResponse.json({
      currentPrice: parsed.currentPrice,
      history: parsed.history,
      specs: parsed.specs,
    });
  } catch (error) {
    console.error('TrackAura API error:', error);
    return NextResponse.json({ error: 'Server hiccup—check console for details' }, { status: 500 });
  }
}