const OSS = require('ali-oss');
const ossClient = require('../config/oss');
const path = require('path');

const uploadToOSS = async (file, directory = 'uploads') => {
  try {
    const ext = path.extname(file.originalname);
    const filename = `${directory}/${Date.now()}${ext}`;

    // 上传文件到 OSS，不设置 ACL
    const result = await ossClient.put(filename, file.buffer);

    // 生成带签名的 URL，有效期设为 1 年
    const url = await ossClient.signatureUrl(result.name, {
      expires: 60 * 60 * 24 * 365
    });

    if (!url) {
      throw new Error('获取文件 URL 失败');
    }

    return url;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};

module.exports = { uploadToOSS }; 