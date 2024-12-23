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
      mediaType: task.media_type,
      ai_revise: task.ai_revise
    };

    // 添加更详细的请求参数日志
    console.log('\n=== 任务执行平台请求参数 ===');
    console.log('URL:', TASK_EXECUTOR_API);
    console.log('Method: POST');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('=== 请求参数结束 ===\n');

    const response = await axios.post(TASK_EXECUTOR_API, payload);
    
    // 添加更详细的响应日志
    console.log('\n=== 任务执行平台响应 ===');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== 响应结束 ===\n');
    
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