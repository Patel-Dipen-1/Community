import rateLimit from 'express-rate-limit';

// Global API Rate Limiter (600 requests per 15 mins per IP)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // 600 requests per 15 minutes for normal app traffic
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    error: 'Too many requests from this IP. Please try again later.'
  }
});

// Strict Rate Limiter for Auth & Login (20 attempts per 15 mins)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    error: 'Too many login attempts. Please wait 15 minutes before retrying.'
  }
});

// Rate Limiter for Search APIs (60 queries per minute)
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    error: 'Search query rate limit exceeded. Please slow down.'
  }
});

// Rate Limiter for Message Creation (120 messages per minute)
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    error: 'Message rate limit exceeded. Please wait a moment.'
  }
});

// Rate Limiter for File Uploads (60 uploads per 10 minutes)
export const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    error: 'Upload rate limit exceeded. Please try again after a few minutes.'
  }
});


