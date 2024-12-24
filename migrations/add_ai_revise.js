require('dotenv').config();
const sequelize = require('../config/database');

async function addAiReviseColumn() {
  try {
    console.log('开始添加 ai_revise 列...');
    console.log('数据库连接信息:', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      port: process.env.DB_PORT
    });
    
    // 检查列是否已存在
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'ai_revise';
    `);

    if (results.length === 0) {
      // 列不存在，添加新列
      await sequelize.query(`
        ALTER TABLE tasks 
        ADD COLUMN ai_revise BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('成功添加 ai_revise 列');
    } else {
      console.log('ai_revise 列已存在，跳过添加');
    }
  } catch (error) {
    console.error('添加列失败:', error);
    throw error;
  }
}

// 执行迁移
addAiReviseColumn()
  .then(() => {
    console.log('迁移完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  }); 