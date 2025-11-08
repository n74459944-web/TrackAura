import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    if (!item) {
      return NextResponse.json({ error: 'Missing item slug' }, { status: 400 });
    }

    // Map slugs to CoinGecko IDs (expand for more items/categories)
    const coinMap: { [key: string]: string } = {
      bitcoin: 'bitcoin',
      ethereum: 'ethereum',
      litecoin: 'litecoin',
      dogecoin: 'dogecoin',
      // Add more: e.g., 'nike-air-jordan-1': 'custom-nft-or-sneaker-id'
    };
    const coinId = coinMap[item.toLowerCase()];
    if (!coinId) {
      return NextResponse.json({ error: `Item "${item}" not tracked yet` }, { status: 404 });
    }

    // Fetch current price & specs (USD)
    const currentRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`);
    const currentData = await currentRes.json();
    const coinData = currentData[coinId];
    if (!coinData) {
      return NextResponse.json({ error: 'Failed to fetch item data' }, { status: 500 });
    }

    // Fetch 1Y history (daily prices; CoinGecko free tier limits to ~365 days)
    const historyRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`);
    const historyData = await historyRes.json();
    const history = historyData.prices
      .map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString().split('T')[0], // YYYY-MM-DD
        price: Math.round(price * 100) / 100, // 2 decimals
      }))
      .slice(-30); // Last 30 days for chart perf (expand if needed)

    // Basic specs (pull from /coins/{id} endpoint)
    const specsRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const specsData = await specsRes.json();
    const specs: { [key: string]: string } = {
      'Name': specsData.name,
      'Symbol': specsData.symbol.toUpperCase(),
      'Market Cap': `$${coinData.usd_market_cap?.toLocaleString() || 'N/A'}`,
      '24h Change': `${coinData.usd_24h_change?.toFixed(2) || 0}%`,
      'Description': specsData.description?.en?.substring(0, 200) + '...' || 'N/A',
      'Image URL': specsData.image?.large || '', // For ItemPage img
      // Add more: e.g., 'Total Supply': specsData.market_data.total_supply.toLocaleString()
    };

    return NextResponse.json({
      currentPrice: coinData.usd,
      history,
      specs,
    });
  } catch (error) {
    console.error('TrackAura API error:', error);
    return NextResponse.json({ error: 'Server error—try again?' }, { status: 500 });
  }
}