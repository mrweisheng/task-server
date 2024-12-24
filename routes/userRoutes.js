const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const sequelize = require('../config/database');
const { body, validationResult } = require('express-validator');

// 添加注册验证规则
const registerValidation = [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
  body('nickname').isLength({ min: 2 }).trim()
];

// 用户注册
router.post('/register', registerValidation, async (req, res) => {
  console.log('\n=== 注册过程编码追踪 ===');
  const { username, password, nickname } = req.body;
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  console.log('1. 接收到的昵称:', nickname);
  console.log('2. 昵称编码:', Buffer.from(nickname).toString('utf8'));

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
      nickname
    });

    console.log('3. 存储后的昵称:', user.nickname);
    
    // 修改查询方式
    const encodingResult = await sequelize.query('SHOW client_encoding;', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log('4. 数据库编码:', encodingResult[0].client_encoding);
    console.log('5. 完整的编码信息:', encodingResult[0]);
    console.log('=== 追踪结束 ===\n');

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('\n=== 登录过程追踪 ===');
    console.log('1. 尝试登录用户:', username);
    
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log('2. 用户不存在');
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 添加用户状态检查
    if (user.status === 'disabled') {
      console.log('2. 用户已被禁用');
      return res.status(403).json({ 
        message: '账号已被禁用',
        disabled_at: user.disabled_at,
        disabled_reason: user.disabled_reason
      });
    }

    console.log('2. 数据库中的用户信息:', {
      id: user.id,
      username: user.username,
      passwordHash: user.password,
      status: user.status  // 添加状态日志
    });

    console.log('3. 开始验证密码');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('4. 密码验证结果:', isMatch);

    if (!isMatch) {
      console.log('5. 密码不匹配');
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    console.log('5. 密码验证通过，生成 token');
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('6. 登录成功');
    console.log('=== 登录过程结束 ===\n');

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('查询用户信息:', req.user.id);
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'nickname']
    });
    
    if (!user) {
      console.log('用户不存在，重新注册用户');
      // 如果用户不存在，返回特殊状态码
      return res.status(498).json({ 
        message: '用户信息已过期，请重新登录',
        code: 'USER_EXPIRED'
      });
    }
    
    console.log('查询到的用户信息:', user.toJSON());
    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router; 