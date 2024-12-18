const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// 管理员API的速率限制器
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: { message: '请求过于频繁，请稍后再试' }
});

// 加密函数
const encryptPayload = (timestamp, apiKey) => {
  return crypto
    .createHash('sha256')
    .update(`${timestamp}:${apiKey}`)
    .digest('hex');
};

// API Key 认证中间件
const apiKeyAuth = (req, res, next) => {
  try {
    const apiKey = req.header('X-API-KEY');
    const timestamp = req.header('X-TIMESTAMP');
    const signature = req.header('X-SIGNATURE');
    
    if (!apiKey || !timestamp || !signature) {
      return res.status(401).json({ message: '缺少认证信息' });
    }

    // 验证时间戳是否在1分钟内
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 60 * 1000) {
      return res.status(401).json({ message: '请求已过期' });
    }

    // 验证签名
    const expectedSignature = encryptPayload(timestamp, process.env.ADMIN_API_KEY);
    if (signature !== expectedSignature) {
      return res.status(401).json({ message: '签名无效' });
    }

    next();
  } catch (error) {
    console.error('API Key 验证错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = { apiKeyAuth, adminApiLimiter, encryptPayload };