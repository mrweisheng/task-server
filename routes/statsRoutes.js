const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const { Op } = require('sequelize');

// 获取统计数据
router.get('/', auth, async (req, res) => {
  try {
    // 获取今天0点的时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 构建查询条件
    const baseWhere = { user_id: req.user.id };
    const todayWhere = {
      ...baseWhere,
      created_at: {
        [Op.gte]: today
      }
    };
    const completedWhere = {
      ...baseWhere,
      status: '已完成'
    };

    // 统计数据
    const [totalTasks, todayTasks, completedTasks] = await Promise.all([
      // 总任务数
      Task.count({
        where: baseWhere
      }),
      // 今日任务数
      Task.count({
        where: todayWhere
      }),
      // 已完成任务数
      Task.count({
        where: completedWhere
      })
    ]);

    res.json({
      totalTasks,
      todayTasks,
      completedTasks
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ 
      message: '服务器错误', 
      error: error.message 
    });
  }
});

module.exports = router; 