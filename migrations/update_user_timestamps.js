require('dotenv').config();
const sequelize = require('../config/database');

async function updateUserTimestamps() {
  try {
    // 添加列（如果不存在）
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS disabled_by INTEGER REFERENCES admins(id),
      ADD COLUMN IF NOT EXISTS disabled_reason TEXT;
    `);

    // 更新现有记录
    await sequelize.query(`
      UPDATE users 
      SET created_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE created_at IS NULL;
    `);

    console.log('用户表时间戳更新完成');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

// 执行迁移
updateUserTimestamps()
  .then(() => {
    console.log('迁移完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  }); 