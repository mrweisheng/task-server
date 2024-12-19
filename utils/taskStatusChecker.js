const axios = require('axios');
const Task = require('../models/Task');
const { Op } = require('sequelize');

const BASE_API = 'http://192.168.31.138:3000';

// 状态映射
const STATUS_MAP = {
  'pending': '待处理',
  'processing': '处理中',
  'completed': '已完成',
  'failed': '失败'
};

async function checkTaskStatus() {
  try {
    console.log('开始检查任务状态...');
    
    const tasks = await Task.findAll({
      where: {
        taskId: {
          [Op.not]: null
        }
      }
    });

    console.log(`找到 ${tasks.length} 个需要更新状态的任务`);

    for (const task of tasks) {
      try {
        const statusUrl = `${BASE_API}/api/task/${task.taskId}/status`;
        console.log(`检查任务状态, URL: ${statusUrl}`);
        
        const response = await axios.get(statusUrl);
        
        if (response.data.success && response.data.task) {
          const executorTask = response.data.task;
          await task.update({
            status: STATUS_MAP[executorTask.status] || task.status
          });
          console.log(`任务 ${task.id} (taskId: ${task.taskId}) 状态更新为: ${STATUS_MAP[executorTask.status]}`);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`任务 ${task.id} (taskId: ${task.taskId}) 在执行平台中不存在`);
          // 可以选择更新本地任务状态为"失败"
          await task.update({ status: '失败' });
        } else {
          console.error(`检查任务 ${task.id} (taskId: ${task.taskId}) 状态失败:`, 
            error.response?.data?.message || error.message);
        }
      }
    }

    console.log('任务状态检查完成');
  } catch (error) {
    console.error('任务状态检查过程出错:', error);
  }
}

// 启动定时检查
function startStatusChecker(interval = 10 * 60 * 1000) { // 默认10分钟
  console.log(`启动任务状态检查器，间隔: ${interval/1000} 秒`);
  
  // 立即执行一次
  checkTaskStatus();
  
  // 设置定时执行
  return setInterval(checkTaskStatus, interval);
}

module.exports = { startStatusChecker }; 