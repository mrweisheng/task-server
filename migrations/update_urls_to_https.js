require('dotenv').config();
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Task = require('../models/Task');

async function updateUrlsToHttps() {
  try {
    console.log('开始更新 URL 到 HTTPS...');

    // 查找所有包含 http:// 的记录
    const tasks = await Task.findAll({
      where: {
        media_urls: {
          [Op.not]: []
        }
      }
    });

    console.log(`找到 ${tasks.length} 个任务需要更新`);

    for (const task of tasks) {
      // 更新 media_urls 数组中的每个 URL
      const updatedUrls = task.media_urls.map(url => {
        if (url && url.startsWith('http://')) {
          return url.replace('http://', 'https://');
        }
        return url;
      });

      // 如果有变更，更新记录
      if (JSON.stringify(updatedUrls) !== JSON.stringify(task.media_urls)) {
        await task.update({ media_urls: updatedUrls });
        console.log(`已更新任务 ${task.id} 的 URL`);
      }
    }

    console.log('URL 更新完成');
  } catch (error) {
    console.error('更新 URL 失败:', error);
    throw error;
  }
}

// 执行迁移
updateUrlsToHttps()
  .then(() => {
    console.log('迁移完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  }); 