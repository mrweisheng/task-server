require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const statsRoutes = require('./routes/statsRoutes');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 添加安全中间件
app.use(helmet());

// 添加速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 100个请求
});
app.use(limiter);

// 路由
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);

// 404 处理
app.use((req, res, next) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ message: '接口不存在' });
});

// 数据库连接和服务器启动
const PORT = process.env.PORT || 3000;

// 在文件开头添加环境变量检查
if (!process.env.JWT_SECRET) {
  console.error('错误: 未设置 JWT_SECRET 环境变量');
  process.exit(1);
}

if (!process.env.PORT) {
  console.warn('警告: 未设置 PORT 环境变量，使用默认值 3000');
}

sequelize.sync().then(() => {
  console.log('数据库已连接');
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}).catch(err => {
  console.error('数据库连接失败:', err);
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理:');
  console.error('请求信息:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
}); 