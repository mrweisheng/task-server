const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    console.log('收到的token:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('解码后的用户信息:', decoded);

    // 将用户信息存储在请求对象中
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({ message: '认证失败', error: error.message });
  }
};

module.exports = { auth }; 