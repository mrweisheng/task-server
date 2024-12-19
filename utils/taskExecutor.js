const axios = require('axios');

const TASK_EXECUTOR_API = process.env.TASK_EXECUTOR_API;

async function notifyTaskExecutor(task) {
  try {
    const payload = {
      ID: task.id.toString(),
      userId: task.user_id.toString(),
      content: task.content,
      numbers: task.numbers,
      mediaUrls: task.media_urls,
      mediaType: task.media_type
    };

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