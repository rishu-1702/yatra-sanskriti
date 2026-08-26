/**
 * YATRAसंस्कृति — AI Smart Tourism & Living Heritage Platform
 * Backend Server Engine (Node.js REST API & Geospatial Proximity Calculator)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');

// Haversine Distance Formula (km)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// Load JSON Datasets
function loadJsonData(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`[Data Load Error] Failed reading ${fileName}:`, err.message);
  }
  return [];
}

let foodData = loadJsonData('food.json');
let hotelData = loadJsonData('hotels.json');
let transportData = loadJsonData('transport.json');
let destinationData = loadJsonData('destinations.json');
let artisanData = loadJsonData('artisans.json');

function sendJsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // 1. Health Status
  if (pathname === '/api' || pathname === '/api/health') {
    return sendJsonResponse(res, 200, {
      status: 'active',
      platform: 'YATRAसंस्कृति Backend Engine',
      version: '2.0.4',
      region: 'Odisha Prototype'
    });
  }

  // 2. Real-Time Proximity Search API
  if (pathname === '/api/location/nearby' && method === 'GET') {
    const userLat = parseFloat(query.lat) || 19.8135;
    const userLng = parseFloat(query.lng) || 85.8312;
    const maxRadius = parseFloat(query.radius) || 35;
    const filterDistrict = (query.district || '').toLowerCase();

    const nearbyFood = foodData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius || (filterDistrict && item.district.toLowerCase().includes(filterDistrict)))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyHotels = hotelData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius || (filterDistrict && item.district.toLowerCase().includes(filterDistrict)))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyTransport = transportData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius || (filterDistrict && item.district.toLowerCase().includes(filterDistrict)))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyDestinations = destinationData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius || (filterDistrict && item.district.toLowerCase().includes(filterDistrict)))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return sendJsonResponse(res, 200, {
      success: true,
      userCoordinates: { lat: userLat, lng: userLng },
      radiusKm: maxRadius,
      nearbyFood,
      nearbyHotels,
      nearbyTransport,
      nearbyDestinations
    });
  }

  // 3. Food API
  if (pathname === '/api/food' && method === 'GET') {
    let list = [...foodData];
    if (query.district && query.district !== 'all') {
      list = list.filter((f) => f.district.toLowerCase() === query.district.toLowerCase());
    }
    if (query.tier) list = list.filter((f) => f.budgetTier === query.tier);
    return sendJsonResponse(res, 200, { success: true, count: list.length, data: list });
  }

  // 4. Hotels API
  if (pathname === '/api/hotels' && method === 'GET') {
    let list = [...hotelData];
    if (query.district && query.district !== 'all') {
      list = list.filter((h) => h.district.toLowerCase() === query.district.toLowerCase());
    }
    return sendJsonResponse(res, 200, { success: true, count: list.length, data: list });
  }

  // 5. Transport API
  if (pathname === '/api/transport' && method === 'GET') {
    let list = [...transportData];
    if (query.district && query.district !== 'all') {
      list = list.filter((t) => t.district.toLowerCase() === query.district.toLowerCase());
    }
    return sendJsonResponse(res, 200, { success: true, count: list.length, data: list });
  }

  // 6. Destinations API
  if (pathname === '/api/destinations' && method === 'GET') {
    return sendJsonResponse(res, 200, { success: true, count: destinationData.length, data: destinationData });
  }

  // 7. Artisans API
  if (pathname === '/api/artisans' && method === 'GET') {
    return sendJsonResponse(res, 200, { success: true, count: artisanData.length, data: artisanData });
  }

  // 8. Book Masterclass
  if (pathname === '/api/artisans/book' && method === 'POST') {
    const body = await parseRequestBody(req);
    return sendJsonResponse(res, 201, {
      success: true,
      message: `Masterclass confirmed with ${body.artisanName || 'Master Craftsman'}!`,
      bookingReceipt: { receiptId: `YS-BOOK-${Date.now().toString().slice(-6)}`, ...body }
    });
  }

  // 9. Direct Tip Checkout
  if (pathname === '/api/artisans/tip' && method === 'POST') {
    const body = await parseRequestBody(req);
    return sendJsonResponse(res, 200, {
      success: true,
      message: `Direct micro-tip of ₹${body.amount || 100} transferred to ${body.artisanName || 'Artisan Guild'}!`,
      txId: `YS-TIP-${Date.now().toString().slice(-6)}`
    });
  }

  // 10. Login Endpoint
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    return sendJsonResponse(res, 200, {
      success: true,
      user: {
        name: body.identifier ? body.identifier.split('@')[0] : 'Ananya Mishra',
        role: body.role === 'artisan' ? 'GI Master Craftsman (#OD-PATTA-204)' : 'Verified Cultural Explorer',
        token: `ys_jwt_${Date.now()}`
      }
    });
  }

  // 11. Static File Server (serves index.html, style.css)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJsonResponse(res, 404, { error: 'Route not found.' });
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[extname] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, () => {
  console.log(`🛕 YATRAसंस्कृति Backend Engine running at http://localhost:${PORT}`);
});