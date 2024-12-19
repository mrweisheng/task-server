require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const statsRoutes = require('./routes/statsRoutes');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const Task = require('./models/Task');
const { Op } = require('sequelize');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加内容类型中间件
app.use((req, res, next) => {
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 添加安全中间件
app.use(helmet());

// 添加速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 100个请求
});
app.use(limiter);

// 在现有的中间件之后添加
app.use((req, res, next) => {
  if (req.body && req.body.nickname) {
    // 确保请求体中的中文正确编码
    req.body.nickname = Buffer.from(req.body.nickname).toString();
  }
  next();
});

// 在路由之前添加日志中间件
app.use((req, res, next) => {
  if (req.body && req.body.nickname) {
    console.log('\n=== 请求编码追踪 ===');
    console.log('1. 原始昵称:', req.body.nickname);
    console.log('2. Buffer 内容:', Buffer.from(req.body.nickname));
    console.log('3. Buffer 转 UTF8:', Buffer.from(req.body.nickname).toString('utf8'));
    console.log('4. 字符编码:', Buffer.from(req.body.nickname).toString('utf8').length, '字节');
    console.log('=== 追踪结束 ===\n');
  }
  next();
});

// 在其他路由之前添加根路径处理
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '任务管理系统API服务正在运行',
    timestamp: new Date().toISOString(),
    endpoints: {
      user: '/api/user',
      tasks: '/api/tasks',
      stats: '/api/stats'
    }
  });
});

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

if (!process.env.TASK_EXECUTOR_API) {
  console.warn('警告: 未设置 TASK_EXECUTOR_API 环境变量');
}

sequelize.sync({ alter: false }).then(async () => {
  console.log('开始清理无效数据...');
  
  // 获取所有有效的用户ID
  const users = await User.findAll({
    attributes: ['id']
  });
  const validUserIds = users.map(user => user.id);
  
  // 删除无效的任务记录
  await Task.destroy({
    where: {
      user_id: {
        [Op.notIn]: validUserIds
      }
    }
  });
  
  console.log('数据清理完成');
  
  // 现在可以安全地更新表结构
  await sequelize.sync({ alter: true });
  console.log('数据库表结构已同步');
  
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