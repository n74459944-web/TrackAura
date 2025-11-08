import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    console.log('Received item in API:', item); 
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
    };
    const coinId = coinMap[item.toLowerCase()];
    if (coinId) {
      const currentRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`);
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

      const specsRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
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

    // Category teasers handler (e.g., 'top-6-crypto') – Force mock in dev
    if (item.startsWith('top-6-')) {
      const category = item.slice(6).toLowerCase(); // e.g., 'crypto'
      const isDev = process.env.NODE_ENV === 'development';

      if (isDev) {
        // Always mock in dev for instant grids (expand per category)
        let mockRelated: { slug: string; name: string; image_url: string; teaser_price: number; trend: number; }[] = [];
        if (category === 'crypto') {
          mockRelated = [
            { slug: 'bitcoin', name: 'Bitcoin', image_url: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', teaser_price: 70000, trend: 150.5 },
            { slug: 'ethereum', name: 'Ethereum', image_url: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', teaser_price: 3500, trend: 120.2 },
            { slug: 'litecoin', name: 'Litecoin', image_url: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png', teaser_price: 75, trend: 45.8 },
            { slug: 'dogecoin', name: 'Dogecoin', image_url: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', teaser_price: 0.15, trend: -20.3 },
            { slug: 'solana', name: 'Solana', image_url: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', teaser_price: 180, trend: 200.1 },
            { slug: 'cardano', name: 'Cardano', image_url: 'https://assets.coingecko.com/coins/images/975/large/cardano.png', teaser_price: 0.45, trend: 30.7 },
          ];
        } else if (category === 'electronics') {
          mockRelated = [
            { slug: 'iphone-15', name: 'iPhone 15', image_url: 'https://www.apple.com/v/iphone-15-pro/a/images/overview/colors/natural_titanium__e1y1m8k0h7oq_large.jpg', teaser_price: 799, trend: -5.2 },
            { slug: 'macbook-pro', name: 'MacBook Pro', image_url: 'https://www.apple.com/v/macbook-pro-m3/16_in/hero/silver_large.jpg', teaser_price: 1999, trend: 10.5 },
            { slug: 'airpods-pro', name: 'AirPods Pro', image_url: 'https://www.apple.com/v/airpods-pro/2nd-generation/overview/hero_endframe_large.jpg', teaser_price: 249, trend: 5.1 },
            { slug: 'ipad-air', name: 'iPad Air', image_url: 'https://www.apple.com/v/ipad-air/11/overview/blue_large.jpg', teaser_price: 599, trend: 8.3 },
            { slug: 'apple-watch', name: 'Apple Watch', image_url: 'https://www.apple.com/v/watch/compare/styles_large.jpg', teaser_price: 399, trend: -2.7 },
            { slug: 'imac', name: 'iMac', image_url: 'https://www.apple.com/v/imac/24-inch/hero_large.jpg', teaser_price: 1299, trend: 15.2 },
          ];
        } else if (category === 'watches') {
          mockRelated = [
            { slug: 'rolex-submariner', name: 'Rolex Submariner', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rolex_Submariner_116610LN_%282020%29_%28cropped%29.png/800px-Rolex_Submariner_116610LN_%282020%29_%28cropped%29.png', teaser_price: 13500, trend: 12.4 },
            { slug: 'omega-seamaster', name: 'Omega Seamaster', image_url: 'https://www.omegawatches.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/s/e/seamaster-diver-300m-co-axial-master-chronometer-42-mm-210-30-42-20-03-001_1.jpg', teaser_price: 5500, trend: 8.9 },
            { slug: 'tag-heuer-carrera', name: 'TAG Heuer Carrera', image_url: 'https://www.tagheuer.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/a/carrera-calibre-5-day-date-wbn2110-ba0625_1.jpg', teaser_price: 3500, trend: 6.1 },
            { slug: 'breitling-navitimer', name: 'Breitling Navitimer', image_url: 'https://www.breitling.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/n/a/navitimer-b01-chronograph-41-ab0138a21b1x1_1.jpg', teaser_price: 8500, trend: 11.2 },
            { slug: 'patek-philippe-nautilus', name: 'Patek Philippe Nautilus', image_url: 'https://www.patek.com/sites/default/files/2023-07/5711_1NA_010_RGB.jpg', teaser_price: 55000, trend: 25.3 },
            { slug: 'audemars-piguet-royal-oak', name: 'Audemars Piguet Royal Oak', image_url: 'https://www.audemarspiguet.com/content/dam/ap/royal-oak-selfwinding-41mm-stainless-steel-15500st-1220st-01.jpg', teaser_price: 28000, trend: 18.7 },
          ];
        } else if (category === 'sneakers') {
          mockRelated = [
            { slug: 'nike-air-jordan-1', name: 'Nike Air Jordan 1', image_url: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/0b1d2c3e-4f5a-4b2a-8c1d-3e9f8a7b6c5d/air-jordan-1-high-og-shoes-0b1d2c3e-4f5a-4b2a-8c1d-3e9f8a7b6c5d.jpg', teaser_price: 180, trend: 20.4 },
            { slug: 'adidas-yeezy-boost', name: 'Adidas Yeezy Boost', image_url: 'https://www.adidas.com/us/yeezy-boost-350-v2.jpg', teaser_price: 220, trend: 15.6 },
            // Add 4 more sneakers...
          ];
        }
        const returnData = { related: mockRelated };
        console.log('API Category Return (Mock):', returnData); // Debug log
        return NextResponse.json(returnData);
      }

      // Prod: Grok (with key check)
      const grokApiKey = process.env.GROK_API_KEY;
      if (!grokApiKey) {
        return NextResponse.json({ error: 'Grok API key missing for category teasers' }, { status: 500 });
      }

      const grokPrompt = `Top 6 trending items in "${category}": [{ slug: "bitcoin", name: "Bitcoin", image_url: "https://...", teaser_price: 70000, trend: 150.5 }]. JSON only: { "related": [...] }. Sources: CoinGecko/StockX.`;

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
          max_tokens: 800,
        }),
      });

      const grokText = await grokRes.text();
      console.log('Grok Category Response:', grokText);

      if (!grokRes.ok) {
        return NextResponse.json({ error: `Grok category fetch failed (${grokRes.status})` }, { status: 500 });
      }

      const grokData = JSON.parse(grokText);
      let parsed;
      try {
        parsed = JSON.parse(grokData.choices[0].message.content.trim());
      } catch {
        return NextResponse.json({ error: 'Grok category JSON parse failed' }, { status: 500 });
      }

      if (!parsed.related || !Array.isArray(parsed.related) || parsed.related.length < 1) {
        return NextResponse.json({ error: 'Grok returned no related items' }, { status: 500 });
      }

      const returnData = { related: parsed.related.slice(0, 6) };
      console.log('API Category Return (Grok):', returnData); // Debug log
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