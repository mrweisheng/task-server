const axios = require('axios');

// 直接使用明文 URL
const TASK_EXECUTOR_API = 'http://192.168.31.138:3000/api/task/create';

async function notifyTaskExecutor(task) {
  try {
    console.log('开始通知任务执行平台, API地址:', TASK_EXECUTOR_API);
    
    const payload = {
      ID: task.id.toString(),
      userId: task.user_id.toString(),
      content: task.content,
      numbers: task.numbers,
      mediaUrls: task.media_urls,
      mediaType: task.media_type
    };

    console.log('发送的数据:', payload);

    const response = await axios.post(TASK_EXECUTOR_API, payload);
    console.log('任务执行平台响应:', response.data);
    
    // 如果响应成功，更新数据库中的 taskId
    if (response.data.success && response.data.taskId) {
      await task.update({ taskId: response.data.taskId });
      console.log('已更新任务ID:', response.data.taskId);
    }
    
    return response.data;
  } catch (error) {
    console.error('通知任务执行平台失败:', error);
    throw error;
  }
}

module.exports = { notifyTaskExecutor }; 