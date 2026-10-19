const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, cleanExpiredSessions } = require('./db');

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// Rate limiting for login attempts: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware to verify session
function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  cleanExpiredSessions();

  const session = db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.username
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, Date.now());

  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  // Attach authenticated user to request
  req.user = {
    id: session.user_id,
    username: session.username,
    sessionId: session.id
  };

  next();
}

// Controller: Login
function handleLogin(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate secure random session ID
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, user.id, expiresAt, createdAt);

  // Set HTTP-only cookie
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
}

// Controller: Logout
function handleLogout(req, res) {
  const sessionId = req.cookies?.session_id;

  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  res.clearCookie('session_id');
  return res.json({ success: true, message: 'Logged out successfully.' });
}

// Controller: Get Auth Status
function handleAuthStatus(req, res) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return res.json({ authenticated: false, user: null });
  }

  const session = db.prepare(`
    SELECT u.id, u.username
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, Date.now());

  if (!session) {
    res.clearCookie('session_id');
    return res.json({ authenticated: false, user: null });
  }

  return res.json({
    authenticated: true,
    user: {
      id: session.id,
      username: session.username
    }
  });
}

// Controller: Change Password
function handleChangePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    return res.status(401).json({ error: 'Current password does not match.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
  `).run(newHash, now, user.id);

  return res.json({ success: true, message: 'Password changed successfully.' });
}

module.exports = {
  requireAuth,
  loginLimiter,
  handleLogin,
  handleLogout,
  handleAuthStatus,
  handleChangePassword
};
