const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  numbers: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  media_urls: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  media_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: '待处理'
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Task; 