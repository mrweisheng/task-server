const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const { Op } = require('sequelize');

// 获取统计数据
router.get('/', auth, async (req, res) => {
  console.log('开始处理统计数据请求');
  console.log('用户信息:', req.user);

  try {
    // 获取今天0点的时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('今日起始时间:', today.toISOString());

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

    console.log('查询条件:', {
      baseWhere,
      todayWhere,
      completedWhere
    });

    // 统计数据
    try {
      const [totalTasks, todayTasks, completedTasks] = await Promise.all([
        // 总任务数
        Task.count({
          where: baseWhere
        }).then(count => {
          console.log('总任务数查询结果:', count);
          return count;
        }),
        // 今日任务数
        Task.count({
          where: todayWhere
        }).then(count => {
          console.log('今日任务数查询结果:', count);
          return count;
        }),
        // 已完成任务数
        Task.count({
          where: completedWhere
        }).then(count => {
          console.log('已完成任务数查询结果:', count);
          return count;
        })
      ]);

      const result = {
        totalTasks,
        todayTasks,
        completedTasks
      };

      console.log('统计结果:', result);
      res.json(result);
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('获取统计数据失败，详细错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      message: '服务器错误', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 