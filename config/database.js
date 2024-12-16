const { Sequelize } = require('sequelize');
const { Pool } = require('pg');

// 首先创建一个 pg pool 来设置客户端编码
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  application_name: 'my_app',
  client_encoding: 'UTF8'  // 强制指定编码为 UTF-8
});

// Sequelize 配置
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    useUTC: false,
    timezone: '+08:00'
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 初始化数据库连接
const initializeDatabase = async () => {
  try {
    console.log('\n=== 数据库编码检查 ===');
    
    // 先用 pg 连接设置编码
    const client = await pool.connect();
    
    // 检查各种编码设置
    const encodingChecks = await Promise.all([
      client.query("SHOW client_encoding;"),
      client.query("SHOW server_encoding;"),
      client.query("SELECT current_database();")
    ]);
    
    console.log('1. 客户端编码:', encodingChecks[0].rows[0].client_encoding);
    console.log('2. 服务器编码:', encodingChecks[1].rows[0].server_encoding);
    console.log('3. 当前数据库:', encodingChecks[2].rows[0].current_database);
    
    await client.query("SET client_encoding = 'UTF8'");
    console.log('4. 设置客户端编码为 UTF8');
    
    client.release();
    
    // 初始化 Sequelize
    await sequelize.authenticate();
    console.log('5. Sequelize 连接成功');
    console.log('=== 编码检查结束 ===\n');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

// 执行初始化
initializeDatabase();

module.exports = sequelize; 