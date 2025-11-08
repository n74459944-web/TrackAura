const fs = require('fs');

async function populate() {
  try {
    // Crypto: Live from CoinGecko (top 10, slice to 6)
    const cryptoRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1');
    if (!cryptoRes.ok) throw new Error(`CoinGecko fetch failed: ${cryptoRes.status}`);
    const cryptos = await cryptoRes.json();
    const cryptoItems = cryptos.slice(0, 6).map(c => ({
      slug: c.id,
      name: c.name,
      image_url: c.image,
      teaser_price: Math.round(c.current_price),
      trend: c.price_change_percentage_1y_in_currency || 0
    }));

    // Other categories: Static 2025 data (add fetches like Yahoo for stocks later)
    const staticCategories = [
      {
        name: 'stocks',
        label: 'Stocks',
        icon: '📈',
        items: [
          { slug: 'nvidia', name: 'Nvidia (NVDA)', image_url: 'https://logo.clearbit.com/nvidia.com', teaser_price: 140, trend: 180.2 },
          { slug: 'broadcom', name: 'Broadcom (AVGO)', image_url: 'https://logo.clearbit.com/broadcom.com', teaser_price: 170, trend: 95.6 },
          { slug: 'jpmorgan', name: 'JPMorgan Chase (JPM)', image_url: 'https://logo.clearbit.com/jpmorgan.com', teaser_price: 210, trend: 25.4 },
          { slug: 'eli-lilly', name: 'Eli Lilly (LLY)', image_url: 'https://logo.clearbit.com/lilly.com', teaser_price: 900, trend: 65.8 },
          { slug: 'palantir', name: 'Palantir (PLTR)', image_url: 'https://logo.clearbit.com/palantir.com', teaser_price: 35, trend: 120.1 },
          { slug: 'microsoft', name: 'Microsoft (MSFT)', image_url: 'https://logo.clearbit.com/microsoft.com', teaser_price: 420, trend: 40.3 }
        ]
      },
      {
        name: 'watches',
        label: 'Watches',
        icon: '⌚',
        items: [
          { slug: 'rolex-submariner', name: 'Rolex Submariner', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rolex_Submariner_116610LN_%282020%29_%28cropped%29.png/800px-Rolex_Submariner_116610LN_%282020%29_%28cropped%29.png', teaser_price: 13500, trend: 12.4 },
          { slug: 'patek-philippe-nautilus', name: 'Patek Philippe Nautilus', image_url: 'https://www.patek.com/sites/default/files/2023-07/5711_1NA_010_RGB.jpg', teaser_price: 55000, trend: 25.3 },
          { slug: 'audemars-piguet-royal-oak', name: 'Audemars Piguet Royal Oak', image_url: 'https://www.audemarspiguet.com/content/dam/ap/royal-oak-selfwinding-41mm-stainless-steel-15500st-1220st-01.jpg', teaser_price: 28000, trend: 18.7 },
          { slug: 'omega-seamaster', name: 'Omega Seamaster', image_url: 'https://www.omegawatches.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/s/e/seamaster-diver-300m-co-axial-master-chronometer-42-mm-210-30-42-20-03-001_1.jpg', teaser_price: 5500, trend: 8.9 },
          { slug: 'richard-mille-rm-011', name: 'Richard Mille RM 011', image_url: 'https://www.richardmille.com/sites/default/files/2023-01/rm011-f1.jpg', teaser_price: 150000, trend: 30.2 },
          { slug: 'tag-heuer-carrera', name: 'TAG Heuer Carrera', image_url: 'https://www.tagheuer.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/c/a/carrera-calibre-5-day-date-wbn2110-ba0625_1.jpg', teaser_price: 3500, trend: 6.1 }
        ]
      },
      {
        name: 'sneakers',
        label: 'Sneakers',
        icon: '👟',
        items: [
          { slug: 'nike-air-jordan-1', name: 'Nike Air Jordan 1', image_url: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/0b1d2c3e-4f5a-4b2a-8c1d-3e9f8a7b6c5d/air-jordan-1-high-og-shoes-0b1d2c3e-4f5a-4b2a-8c1d-3e9f8a7b6c5d.jpg', teaser_price: 180, trend: 20.4 },
          { slug: 'nike-air-max-95', name: 'Nike Air Max 95 OG Neon', image_url: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6/air-max-95-og-shoes-1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6.jpg', teaser_price: 200, trend: 15.6 },
          { slug: 'air-jordan-3-black-cat', name: 'Air Jordan 3 Black Cat', image_url: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/2b3c4d5e-6f7g-8h9i-0j1k-l2m3n4o5p6q7/air-jordan-3-black-cat-shoes-2b3c4d5e-6f7g-8h9i-0j1k-l2m3n4o5p6q7.jpg', teaser_price: 250, trend: 25.1 },
          { slug: 'new-balance-992', name: 'New Balance 992 Aged Well', image_url: 'https://www.newbalance.com/on/demandware.static/-/Sites-nb-us-Library/default/dw1a1b2c3d/992.jpg', teaser_price: 220, trend: 18.3 },
          { slug: 'puma-speedcat', name: 'Puma Speedcat', image_url: 'https://www.puma.com/us/en/pd/speedcat-puma-white/381246.html', teaser_price: 100, trend: 30.5 },
          { slug: 'adidas-taekwondo', name: 'Adidas Taekwondo Tokyo', image_url: 'https://www.adidas.com/us/taekwondo-tokyo-shoes.jpg', teaser_price: 120, trend: 12.8 }
        ]
      },
      {
        name: 'art',
        label: 'Art',
        icon: '🎨',
        items: [
          { slug: 'david-hockney-portrait', name: 'David Hockney Portrait', image_url: 'https://maddoxgallery.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/d/a/david-hockney-portrait-of-an-artist-pool-with-two-figures-1972.jpg', teaser_price: 90000000, trend: 15.2 },
          { slug: 'andy-warhol-marilyn', name: 'Andy Warhol Marilyn', image_url: 'https://maddoxgallery.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/a/n/andy-warhol-marilyn-di-pt-109-ser-1962.jpg', teaser_price: 20000000, trend: 10.5 },
          { slug: 'banksy-girl-with-balloon', name: 'Banksy Girl with Balloon', image_url: 'https://maddoxgallery.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/b/a/banksy-girl-with-balloon-love-is-in-the-bin-2018.jpg', teaser_price: 25000000, trend: 22.1 },
          { slug: 'jasper-johns-flag', name: 'Jasper Johns Flag', image_url: 'https://bluewater-ins.com/wp-content/uploads/2025/05/jasper-johns-flag-1958.jpg', teaser_price: 110000000, trend: 18.7 },
          { slug: 'jeff-koons-rabbit', name: 'Jeff Koons Rabbit', image_url: 'https://bluewater-ins.com/wp-content/uploads/2025/05/jeff-koons-rabbit-1986.jpg', teaser_price: 91000000, trend: 20.3 },
          { slug: 'gabriele-zago-abstract', name: 'Gabriele Zago Abstract', image_url: 'https://www.artelier.com/wp-content/uploads/2024/12/gabriele-zago.jpg', teaser_price: 50000, trend: 35.6 }
        ]
      },
      {
        name: 'wine',
        label: 'Wine',
        icon: '🍷',
        items: [
          { slug: 'chapoutier-ermitage-le-pavillon-2008', name: 'M. Chapoutier Ermitage Le Pavillon 2008', image_url: 'https://www.wineinvestment.com/wp-content/uploads/2025/08/chapoutier-ermitage.jpg', teaser_price: 500, trend: 38.7 },
          { slug: 'vega-sicilia-valbuena-5-2016', name: 'Vega Sicilia Valbuena 5° 2016', image_url: 'https://www.wineinvestment.com/wp-content/uploads/2025/08/vega-sicilia.jpg', teaser_price: 150, trend: 29.0 },
          { slug: 'penfolds-grange-2018', name: 'Penfolds Grange 2018', image_url: 'https://www.vinovest.co/wp-content/uploads/penfolds-grange.jpg', teaser_price: 700, trend: 25.4 },
          { slug: 'henschke-hill-of-grace-2019', name: 'Henschke Hill of Grace 2019', image_url: 'https://www.vinovest.co/wp-content/uploads/henschke-hill-of-grace.jpg', teaser_price: 300, trend: 18.2 },
          { slug: 'brotte-creation-grosset-red-2022', name: 'Brotte Création Grosset Red 2022', image_url: 'https://www.wineenthusiast.com/wp-content/uploads/2025/09/brotte-creation-grosset.jpg', teaser_price: 20, trend: 12.1 },
          { slug: 'jim-barry-the-armagh-2020', name: 'Jim Barry The Armagh 2020', image_url: 'https://www.vinovest.co/wp-content/uploads/jim-barry-armagh.jpg', teaser_price: 200, trend: 15.8 }
        ]
      },
      {
        name: 'real-estate',
        label: 'Real Estate',
        icon: '🏠',
        items: [
          { slug: 'union-city-ca', name: 'Union City, CA', image_url: 'https://constructioncoverage.com/wp-content/uploads/union-city-ca.jpg', teaser_price: 950000, trend: 94.3 },
          { slug: 'lawrence-ma', name: 'Lawrence, MA', image_url: 'https://constructioncoverage.com/wp-content/uploads/lawrence-ma.jpg', teaser_price: 450000, trend: 94.0 },
          { slug: 'santa-clara-ca', name: 'Santa Clara, CA', image_url: 'https://constructioncoverage.com/wp-content/uploads/santa-clara-ca.jpg', teaser_price: 1400000, trend: 91.7 },
          { slug: 'boise-id', name: 'Boise, ID', image_url: 'https://www.quickenloans.com/wp-content/uploads/boise-id.jpg', teaser_price: 480000, trend: 85.2 },
          { slug: 'st-petersburg-fl', name: 'St. Petersburg, FL', image_url: 'https://www.quickenloans.com/wp-content/uploads/st-petersburg-fl.jpg', teaser_price: 350000, trend: 78.4 },
          { slug: 'omaha-ne', name: 'Omaha, NE', image_url: 'https://realestate.usnews.com/wp-content/uploads/omaha-ne.jpg', teaser_price: 280000, trend: 76.2 }
        ]
      }
    ];

    const data = {
      categories: [
        { name: 'crypto', label: 'Crypto', icon: '₿', items: cryptoItems },
        ...staticCategories
      ]
    };

    fs.writeFileSync('public/data/categories.json', JSON.stringify(data, null, 2));
    console.log('Populated! Updated crypto live (top 6:', cryptoItems.map(i => i.name).join(', '), '), others static. Commit & push.');
  } catch (error) {
    console.error('Populate error:', error.message);
  }
}

populate();