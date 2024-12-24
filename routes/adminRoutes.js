const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { adminAuth } = require('../middleware/adminAuth');
const Task = require('../models/Task');
const { Op } = require('sequelize');
const User = require('../models/User');
const sequelize = require('../config/database');

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

// 获取任务统计
router.get('/tasks/stats', adminAuth, async (req, res) => {
  try {
    // 获取今天0点的时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 统计各种状态的任务数量
    const [
      total,
      pending,
      processing,
      completed,
      failed,
      todayTotal,
      todayCompleted
    ] = await Promise.all([
      Task.count(),  // 总任务数
      Task.count({ where: { status: '待处理' } }),  // 待处理数
      Task.count({ where: { status: '处理中' } }),  // 处理中数
      Task.count({ where: { status: '已完成' } }),  // 已完成数
      Task.count({ where: { status: '失败' } }),    // 失败数
      Task.count({  // 今日总任务
        where: {
          created_at: {
            [Op.gte]: today
          }
        }
      }),
      Task.count({  // 今日完成
        where: {
          status: '已完成',
          updated_at: {
            [Op.gte]: today
          }
        }
      })
    ]);

    res.json({
      total,
      pending,
      processing,
      completed,
      failed,
      today_total: todayTotal,
      today_completed: todayCompleted
    });
  } catch (error) {
    console.error('获取任务统计错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取用户列表
router.get('/users', adminAuth, async (req, res) => {
  try {
    console.log('获取用户列表请求参数:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { nickname: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) {
      where.status = status;
    }

    console.log('查询条件:', where);

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 
        'username', 
        'nickname', 
        'status', 
        ['createdAt', 'created_at'],
        'disabled_at',
        'disabled_reason'
      ]
    });

    console.log(`查询到 ${count} 条记录`);

    res.json({
      total: count,
      page,
      limit,
      users: rows
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({ 
      message: '服务器错误', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 禁用用户
router.put('/users/:id/disable', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await user.update({
      status: 'disabled',
      disabled_at: new Date(),
      disabled_by: req.admin.id,
      disabled_reason: req.body.reason
    });

    res.json({
      message: '用户已禁用',
      user: {
        id: user.id,
        username: user.username,
        status: user.status,
        disabled_at: user.disabled_at,
        disabled_by: user.disabled_by,
        disabled_reason: user.disabled_reason
      }
    });
  } catch (error) {
    console.error('禁用用户错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 启用用户
router.put('/users/:id/enable', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await user.update({
      status: 'active',
      disabled_at: null,
      disabled_by: null,
      disabled_reason: null
    });

    res.json({
      message: '用户已启用',
      user: {
        id: user.id,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    console.error('启用用户错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取所有任务
router.get('/tasks', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.user_id) where.user_id = req.query.user_id;
    if (req.query.start_date) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(req.query.start_date)
      };
    }
    if (req.query.end_date) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(req.query.end_date)
      };
    }

    const { count, rows } = await Task.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'nickname'],
        required: false
      }],
      attributes: [
        'id',
        'user_id',
        'content',
        'numbers',
        'media_urls',
        'media_type',
        'status',
        'created_at',
        'updated_at',
        [sequelize.col('user.nickname'), 'creator_nickname']
      ]
    });

    res.json({
      total: count,
      page,
      limit,
      tasks: rows.map(task => ({
        ...task.toJSON(),
        creator_nickname: task.user ? task.user.nickname : '未知用户'
      }))
    });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 删除用户
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 删除用户相关的任务
    await Task.destroy({
      where: { user_id: user.id }
    });

    // 删除用户
    await user.destroy();

    res.json({
      message: '用户已删除',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 重置用户密码
router.put('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 生成新密码或使用提供的密码
    const newPassword = req.body.newPassword || Math.random().toString(36).slice(-8);

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新密码
    await user.update({
      password: hashedPassword
    });

    const response = {
      message: '密码已重置',
      user: {
        id: user.id,
        username: user.username
      }
    };

    // 如果是随机生成的密码，则在响应中返回
    if (!req.body.newPassword) {
      response.newPassword = newPassword;
    }

    res.json(response);
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router; 