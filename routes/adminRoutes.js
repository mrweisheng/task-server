const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { adminAuth } = require('../middleware/adminAuth');

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await admin.update({ last_login_at: new Date() });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取管理员信息
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'username', 'name', 'permissions', 'last_login_at']
    });
    
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    res.json(admin);
  } catch (error) {
    console.error('获取管理员信息错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 管理员注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, permissions } = req.body;

    // 检查管理员数量
    const adminCount = await Admin.count();
    if (adminCount >= process.env.MAX_ADMIN_COUNT) {
      return res.status(400).json({ message: '管理员数量已达到上限' });
    }

    // 检查用户名是否存在
    const existingAdmin = await Admin.findOne({ where: { username } });
    if (existingAdmin) {
      return res.status(409).json({ message: '用户名已存在' });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建管理员
    const admin = await Admin.create({
      username,
      password: hashedPassword,
      name,
      permissions: permissions || [],
      status: 'active'
    });

    res.status(201).json({
      message: '管理员注册成功',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        permissions: admin.permissions,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('管理员注册错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router; 