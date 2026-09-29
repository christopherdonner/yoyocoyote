require("dotenv").config();

var express = require("express");


app = express();


const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
var PORT = Number(process.env.PORT || 443);
var DEV_HTTP = process.env.DEV_HTTP === "true";
var TLS_LIVE_DIR = process.env.LETSENCRYPT_LIVE_DIR || 'C:/Certbot/live/yoyocoyote.ca';
var TLS_KEY_PATH = process.env.TLS_KEY_PATH || path.join(TLS_LIVE_DIR, 'privkey.pem');
var TLS_CERT_PATH = process.env.TLS_CERT_PATH || path.join(TLS_LIVE_DIR, 'fullchain.pem');
var COOKIE_SECURE = process.env.COOKIE_SECURE !== 'false';
const SESSION_COOKIE = 'yc_session';
const CSRF_COOKIE = 'yc_csrf';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const COYOTE_LIFETIME_MS = 100 * 60 * 60 * 1000;
const MAX_COYOTE_PHOTO_BYTES = 3 * 1024 * 1024;
const scrypt = promisify(crypto.scrypt);

// Sets up the Express app to handle data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '5mb' }));

function query(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

function deactivateExpiredCoyotes() {
  const cutoff = Date.now() - COYOTE_LIFETIME_MS;
  return query('UPDATE coyotes SET active = 0 WHERE active = 1 AND dtime <= ?', [cutoff]);
}

function decodeCoyotePhoto(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== 'string') throw new Error('Photo must be a JPEG image.');

  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('Photo must be a compressed JPEG image.');

  const encoded = match[1];
  const image = Buffer.from(encoded, 'base64');
  if (image.length > MAX_COYOTE_PHOTO_BYTES) throw new Error('Photo must be 3 MB or smaller.');
  if (image.toString('base64') !== encoded || image.length < 3 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
    throw new Error('Photo data is not a valid JPEG image.');
  }
  return image;
}

function readCookie(req, name) {
  const pair = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  if (!pair) return '';
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return '';
  }
}

function writeCookie(res, name, value, maxAge, httpOnly = true) {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}${COOKIE_SECURE ? '; Secure' : ''}`;
  res.append('Set-Cookie', cookie);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(String(left));
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

app.use((req, res, next) => {
  let csrfToken = readCookie(req, CSRF_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(csrfToken)) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    writeCookie(res, CSRF_COOKIE, csrfToken, SESSION_MAX_AGE_SECONDS);
  }
  req.csrfToken = csrfToken;

  const sessionToken = readCookie(req, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(sessionToken)) return next();

  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  query('SELECT u.id, u.username FROM auth_sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()', [tokenHash])
    .then(rows => {
      if (rows[0]) req.user = { id: rows[0].id, username: rows[0].username };
      next();
    })
    .catch(error => {
      console.error('Unable to load login session:', error.message);
      next();
    });
});

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const suppliedToken = req.get('x-csrf-token') || req.body._csrf || '';
  if (!safeEqual(suppliedToken, req.csrfToken)) return res.status(403).send('Invalid request token. Reload the page and try again.');
  next();
});

// set public directory for assetts
app.use(express.static('public'));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var mysql = require("mysql2");

if(process.env.JAWSDB_URL){
  connection=mysql.createConnection(process.env.JAWSDB_URL);
} else {
  connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "coyote_db"
  });
}

  
  
connection.connect(function(err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }

  console.log("connected as id " + connection.threadId);
  deactivateExpiredCoyotes().catch(error => console.error('Unable to deactivate expired coyote reports:', error.message));
  const coyoteExpiryTimer = setInterval(() => {
    deactivateExpiredCoyotes().catch(error => console.error('Unable to deactivate expired coyote reports:', error.message));
  }, 60 * 1000);
  coyoteExpiryTimer.unref();
});

function renderAuthForm(res, view, csrfToken, error = '') {
  res.render(view, { csrfToken, error });
}

function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).redirect('/login');
  next();
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return query('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP()')
    .then(() => query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))', [tokenHash, userId, SESSION_MAX_AGE_SECONDS]))
    .then(() => writeCookie(res, SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS));
}

async function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function passwordMatches(password, record) {
  const [saltHex, hashHex] = String(record || '').split(':');
  if (!/^[a-f0-9]{32}$/i.test(saltHex || '') || !/^[a-f0-9]{128}$/i.test(hashHex || '')) return false;
  const candidate = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  return safeEqual(candidate, Buffer.from(hashHex, 'hex'));
}

app.get('/', async (req, res) => {
  try {
    const coyotes = await query('SELECT id, coyoteName, longitude, latitude, dtime, active FROM coyotes');
    res.render('index', { coyotes, user: req.user, csrfToken: req.csrfToken });
  } catch (error) {
    console.error('Unable to load coyote reports:', error.message);
    res.status(500).send('Unable to load reports. Check the database setup.');
  }
});

app.get('/about', (req, res) => {
  res.render('about', { user: req.user, csrfToken: req.csrfToken });
});

app.get('/signup', (req, res) => renderAuthForm(res, 'signup', req.csrfToken));
app.get('/login', (req, res) => renderAuthForm(res, 'login', req.csrfToken));

app.post('/signup', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 200) {
    return res.status(400).render('signup', { csrfToken: req.csrfToken, error: 'Use a 3-32 character username, valid email, and password of at least 12 characters.' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await query('INSERT INTO app_users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);
    await startSession(res, result.insertId);
    res.redirect('/');
  } catch (error) {
    console.error('Signup failed:', error.message);
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 503).render('signup', { csrfToken: req.csrfToken, error: duplicate ? 'That username or email is already registered.' : 'Signup is temporarily unavailable.' });
  }
});

app.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  try {
    const users = await query('SELECT id, username, password_hash FROM app_users WHERE username = ? LIMIT 1', [username]);
    if (!users[0] || !await passwordMatches(password, users[0].password_hash)) {
      return res.status(401).render('login', { csrfToken: req.csrfToken, error: 'Username or password is incorrect.' });
    }
    const priorToken = readCookie(req, SESSION_COOKIE);
    if (/^[a-f0-9]{64}$/.test(priorToken)) {
      const priorHash = crypto.createHash('sha256').update(priorToken).digest('hex');
      await query('DELETE FROM auth_sessions WHERE token_hash = ?', [priorHash]);
    }
    await startSession(res, users[0].id);
    res.redirect('/');
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(503).render('login', { csrfToken: req.csrfToken, error: 'Login is temporarily unavailable.' });
  }
});

app.post('/logout', async (req, res) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (/^[a-f0-9]{64}$/.test(token)) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
      await query('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
    } catch (error) {
      console.error('Logout session cleanup failed:', error.message);
    }
  }
  writeCookie(res, SESSION_COOKIE, '', 0);
  res.redirect('/');
});

app.get('/reports', requireLogin, async (req, res) => {
  try {
    const coyotes = await query('SELECT id, coyoteName, longitude, latitude, dtime, active, details, photo_mime FROM coyotes WHERE userid = ? ORDER BY dtime DESC', [req.user.id]);
    res.render('reports', { coyotes, user: req.user, csrfToken: req.csrfToken });
  } catch (error) {
    console.error('Unable to load user reports:', error.message);
    res.status(500).send('Unable to load your reports.');
  }
});

app.post('/Coyotes', async (req, res) => {
  const longitude = Number(req.body.longitude);
  const latitude = Number(req.body.latitude);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'Valid coordinates are required.' });
  }
  const coyoteName = String(req.body.coyoteName || 'coyote').slice(0, 64);
  const details = String(req.body.details || '').trim();
  if (details.length > 1000) return res.status(400).json({ error: 'Details must be 1000 characters or fewer.' });

  let photoData;
  try {
    photoData = decodeCoyotePhoto(req.body.photoDataUrl);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const userid = req.user ? req.user.id : null;
  try {
    const result = await query('INSERT INTO coyotes (coyoteName, longitude, latitude, dtime, active, userid, details, photo_mime, photo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [coyoteName, longitude, latitude, Date.now(), 1, userid, details || null, photoData ? 'image/jpeg' : null, photoData]);
    res.status(201).json({ id: result.insertId, userid });
  } catch (error) {
    console.error('Unable to save coyote report:', error.message);
    res.status(503).json({ error: 'Unable to save this report.' });
  }
});

app.get('/Coyotes', async (req, res) => {
  try {
    await deactivateExpiredCoyotes();
    const coyotes = await query('SELECT c.id, c.coyoteName, c.longitude, c.latitude, c.dtime, c.active, c.details, c.photo_mime, COALESCE(u.username, \'Guest\') AS reported_by FROM coyotes c LEFT JOIN app_users u ON u.id = c.userid WHERE c.active = 1');
    res.json(coyotes);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load reports.' });
  }
});

app.get('/Coyotes/:id/photo', async (req, res) => {
  try {
    const rows = await query('SELECT photo_mime, photo_data FROM coyotes WHERE id = ? AND photo_data IS NOT NULL', [req.params.id]);
    if (!rows[0]) return res.status(404).end();
    res.set('Content-Type', rows[0].photo_mime || 'image/jpeg');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=3600');
    res.end(rows[0].photo_data);
  } catch (error) {
    res.status(500).end();
  }
});

app.put('/Coyotes/:id', requireLogin, async (req, res) => {
  try {
    const result = await query('UPDATE coyotes SET active = true WHERE id = ? AND userid = ? AND dtime > ?', [req.params.id, req.user.id, Date.now() - COYOTE_LIFETIME_MS]);
    if (!result.affectedRows) return res.status(404).end();
    res.status(200).end();
  } catch (error) {
    res.status(500).end();
  }
});

app.delete('/coyotes/:id', requireLogin, async (req, res) => {
  try {
    const result = await query('DELETE FROM coyotes WHERE id = ? AND userid = ?', [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).end();
    res.status(200).end();
  } catch (error) {
    res.status(500).end();
  }
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large. Choose a smaller photo.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request data.' });
  next(error);
});

var server;

if (DEV_HTTP) {
  server = require('http').createServer(app);
  server.listen(PORT, '127.0.0.1', () => {
    console.log("HTTP server behind reverse proxy on port : " + PORT);
  });
} else {
  var key = fs.readFileSync(TLS_KEY_PATH);
  var cert = fs.readFileSync(TLS_CERT_PATH);
  server = https.createServer({ key: key, cert: cert }, app);
  server.listen(PORT, () => {
    console.log("HTTPS server starting on port : " + PORT);
  });
}