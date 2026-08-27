/**
 * YATRAसंस्कृति — AI Smart Tourism & Living Heritage Platform
 * Backend Server Engine (Node.js REST API & MongoDB Atlas Database)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB_PATH = path.join(__dirname, 'users.json');

// --- 1. MONGODB ATLAS CLOUD DATABASE CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rishukrishna17_db_user:Yatra2026Secure@cluster0.fn327ln.mongodb.net/yatra_sanskritiD?appName=Cluster0';
let mongoClient = null;
let usersCollection = null;

async function initMongoDB() {
  try {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db('yatra_sanskritiD');
    usersCollection = db.collection('user');
    console.log('🍃 Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.log('⚠️ MongoDB connection warning (operating in resilient mode):', err.message);
  }
}
initMongoDB();

// Optional XLSX library loader
let xlsx = null;
try {
  xlsx = require('xlsx');
} catch (e) {}

const EXCEL_FILE_PATH = path.join(__dirname, 'database.xlsx');

// 2. Haversine Distance Formula (km)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// 3. Local JSON Database Helpers (Resilient Backup)
function getUsersDatabase() {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      return JSON.parse(fs.readFileSync(USERS_DB_PATH, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveUsersDatabase(users) {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {}
}

// 4. Smart Dataset Loader (Excel database.xlsx or JSON fallback)
function loadDataset(sheetName, jsonFileName) {
  if (xlsx && fs.existsSync(EXCEL_FILE_PATH)) {
    try {
      const workbook = xlsx.readFile(EXCEL_FILE_PATH);
      if (workbook.Sheets[sheetName]) {
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        return rows.map((item) => {
          if (item.famousDishes && typeof item.famousDishes === 'string') {
            item.famousDishes = item.famousDishes.split(',').map((s) => s.trim());
          }
          if (item.amenities && typeof item.amenities === 'string') {
            item.amenities = item.amenities.split(',').map((s) => s.trim());
          }
          if (item.isPureVeg !== undefined) item.isPureVeg = String(item.isPureVeg).toUpperCase() === 'TRUE';
          if (item.isGem !== undefined) item.isGem = String(item.isGem).toUpperCase() === 'TRUE';
          if (item.lat) item.lat = parseFloat(item.lat);
          if (item.lng) item.lng = parseFloat(item.lng);
          return item;
        });
      }
    } catch (err) {}
  }

  const rootPath = path.join(__dirname, jsonFileName);
  const dataPath = path.join(DATA_DIR, jsonFileName);
  try {
    if (fs.existsSync(rootPath)) return JSON.parse(fs.readFileSync(rootPath, 'utf8'));
    if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {}
  return [];
}

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

// 5. Main Server Request Router
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // Health API
  if (pathname === '/api' || pathname === '/api/health') {
    return sendJsonResponse(res, 200, {
      status: 'active',
      platform: 'YATRAसंस्कृति Backend & MongoDB Cloud Engine',
      version: '3.0.0',
      database: usersCollection ? 'Connected to MongoDB Atlas (yatra_sanskritiD.user)' : 'Local File Backup Mode'
    });
  }

  // =========================================================================
  // USER AUTH & MONGODB CLOUD SAVE
  // =========================================================================
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    let displayName = body.name || body.identifier || 'Explorer';
    if (displayName.includes('@')) {
      const raw = displayName.split('@')[0].replace(/[._-]/g, ' ');
      displayName = raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const userData = {
      id: `usr-${Date.now().toString().slice(-5)}`,
      name: displayName,
      email: body.email || (body.identifier?.includes('@') ? body.identifier : ''),
      phone: body.phone || (!body.identifier?.includes('@') ? body.identifier : ''),
      role: body.role || 'Verified Cultural Explorer',
      authMethod: body.authMethod || 'direct-login',
      lastLoginAt: new Date().toISOString()
    };

    // 1. Save directly into MongoDB Atlas
    if (usersCollection) {
      try {
        await usersCollection.updateOne(
          { name: userData.name },
          { $set: userData, $setOnInsert: { createdAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (e) {
        console.error('[MongoDB Save Error]', e.message);
      }
    }

    // 2. Backup to users.json
    const users = getUsersDatabase();
    let existing = users.find(u => u.name?.toLowerCase() === displayName.toLowerCase());
    if (!existing) {
      userData.createdAt = new Date().toISOString();
      users.push(userData);
    } else {
      existing.lastLoginAt = new Date().toISOString();
    }
    saveUsersDatabase(users);

    return sendJsonResponse(res, 200, {
      success: true,
      message: `Namaste ${userData.name}! Login recorded in MongoDB Atlas.`,
      user: userData
    });
  }

  // View All Registered Users in Database
  if (pathname === '/api/users' && method === 'GET') {
    if (usersCollection) {
      try {
        const mongoUsers = await usersCollection.find({}).toArray();
        return sendJsonResponse(res, 200, {
          database: 'MongoDB Atlas Cloud (yatra_sanskritiD)',
          totalUsers: mongoUsers.length,
          users: mongoUsers
        });
      } catch (e) {}
    }
    const localUsers = getUsersDatabase();
    return sendJsonResponse(res, 200, {
      database: 'Local Backup File',
      totalUsers: localUsers.length,
      users: localUsers
    });
  }

  // =========================================================================
  // REAL-TIME NEARBY SERVICES API
  // =========================================================================
  const foodData = loadDataset('Food_Eateries', 'food.json');
  const hotelData = loadDataset('Hotels_Stays', 'hotels.json');
  const transportData = loadDataset('Transport_Rentals', 'transport.json');

  if (pathname === '/api/location/nearby' && method === 'GET') {
    const userLat = parseFloat(query.lat) || 19.8135;
    const userLng = parseFloat(query.lng) || 85.8312;
    const maxRadius = parseFloat(query.radius) || 35;

    const nearbyFood = foodData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyHotels = hotelData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyTransport = transportData
      .map((item) => ({ ...item, distanceKm: calculateHaversineDistance(userLat, userLng, item.lat, item.lng) }))
      .filter((item) => item.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return sendJsonResponse(res, 200, {
      success: true,
      userCoordinates: { lat: userLat, lng: userLng },
      radiusKm: maxRadius,
      nearbyFood,
      nearbyHotels,
      nearbyTransport
    });
  }

  // Static File Server
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJsonResponse(res, 404, { error: 'Route not found.' });
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, () => {
  console.log(`🛕 YATRAसंस्कृति Backend & MongoDB Server running on port ${PORT}`);
});
