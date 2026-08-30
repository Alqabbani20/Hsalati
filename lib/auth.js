const jwt = require("jsonwebtoken");
const { findUserById } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "hsalati-dev-secret-change-in-production";
const COOKIE_NAME = "hsalati_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const { maxAge: _maxAge, ...COOKIE_CLEAR_OPTIONS } = COOKIE_OPTIONS;

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Invalid or expired session" });

    const user = await findUserById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  COOKIE_CLEAR_OPTIONS,
  signToken,
  verifyToken,
  authMiddleware,
  adminMiddleware,
};
