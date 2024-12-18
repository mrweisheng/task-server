const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// 测试调用 pending 接口
async function testPendingAPI() {
  try {
    // 准备请求头信息
    const timestamp = Date.now();
    const signature = crypto
      .createHash('sha256')
      .update(`${timestamp}:${process.env.ADMIN_API_KEY}`)
      .digest('hex');

    // 发送请求
    const response = await axios.get('http://localhost:3000/api/tasks/pending', {
      headers: {
        'X-API-KEY': process.env.ADMIN_API_KEY,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature
      }
    });

    console.log('请求成功！');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('请求失败！');
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
  }
}

// 运行测试
console.log('开始测试...');
console.log('使用的 API Key:', process.env.ADMIN_API_KEY);
testPendingAPI(); 