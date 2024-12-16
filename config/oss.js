const OSS = require('ali-oss');
require('dotenv').config();

// 验证必要的 OSS 配置
const requiredOssConfig = [
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
  'OSS_BUCKET'
];

for (const config of requiredOssConfig) {
  if (!process.env[config]) {
    throw new Error(`缺少必要的 OSS 配置: ${config}`);
  }
}

const ossClient = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

module.exports = ossClient; 