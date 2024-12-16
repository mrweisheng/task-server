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
    allowNull: false
  },
  numbers: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      return JSON.parse(this.getDataValue('numbers'));
    },
    set(value) {
      this.setDataValue('numbers', JSON.stringify(value));
    }
  },
  media_urls: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('media_urls');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('media_urls', value ? JSON.stringify(value) : null);
    }
  },
  media_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['image', 'video', 'mixed']]
    }
  },
  status: {
    type: DataTypes.ENUM('待处理', '处理中', '已完成'),
    defaultValue: '待处理'
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Task; 