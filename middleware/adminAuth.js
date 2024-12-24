const jwt = require('jsonwebtoken');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 验证是否是管理员token
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: '无权限访问' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('管理员认证错误:', error);
    res.status(401).json({ message: '认证失败', error: error.message });
  }
};

module.exports = { adminAuth }; 