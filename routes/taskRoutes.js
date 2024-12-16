const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const { uploadToOSS } = require('../utils/upload');

// 配置 multer 用于处理文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 默认限制为5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('收到文件:', file.originalname, 'mimetype:', file.mimetype);
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime'];
    
    if (allowedImageTypes.includes(file.mimetype)) {
      if (parseInt(req.headers['content-length']) > 1 * 1024 * 1024) {
        cb(new Error('图片大小不能超过1MB'));
        return;
      }
    } else if (allowedVideoTypes.includes(file.mimetype)) {
      if (parseInt(req.headers['content-length']) > 5 * 1024 * 1024) {
        cb(new Error('视频大小不能超过5MB'));
        return;
      }
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  }
});

// 创建任务（支持可选的单个文件上传）
router.post('/', auth, (req, res) => {
  console.log('开始处理任务创建请求');
  console.log('请求体:', req.body);

  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传中间件错误:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: '文件大小超出限制',
          error: err.message
        });
      }
      return res.status(400).json({
        message: '文件上传失败',
        error: err.message
      });
    }
    
    try {
      const { content, numbers } = req.body;
      if (!content || !numbers) {
        console.error('缺少必要字段:', { content, numbers });
        return res.status(400).json({
          message: '缺少必要字段',
          error: '内容和电话号码列表不能为空'
        });
      }

      const file = req.file;
      console.log('文件信息:', file);

      // 初始化媒体相关字段
      let mediaUrl = null;
      let mediaType = null;

      // 只有当有文件上传时处理文件
      if (file) {
        console.log('开始上传文件到OSS');
        try {
          mediaUrl = await uploadToOSS(file);
          console.log('文件上传成功，URL:', mediaUrl);
          mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        } catch (ossError) {
          console.error('OSS上传错误:', ossError);
          return res.status(500).json({
            message: '文件上传失败',
            error: ossError.message
          });
        }
      }

      console.log('开始创建任务记录');
      // 创建任务
      const task = await Task.create({
        user_id: req.user.id,
        content,
        numbers: Array.isArray(numbers) ? numbers : JSON.parse(numbers),
        media_urls: mediaUrl ? [mediaUrl] : [],
        media_type: mediaType,
        status: '待处理'
      });

      console.log('任务创建成功:', task.id);
      res.status(201).json({
        message: '任务创建成功',
        task
      });
    } catch (error) {
      console.error('创建任务失败，详细错误:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ 
        message: '服务器错误', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
});

// 获取任务列表
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取最新任务
router.get('/latest', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'content',
        'numbers',
        'status',
        'created_at',
        'media_type',
        'media_urls'
      ]
    });

    if (!task) {
      return res.status(404).json({ message: '未找到任务' });
    }

    // 格式化响应数据
    const formattedTask = {
      id: task.id,
      content: task.content,
      numbers: task.numbers,
      status: task.status,
      created_at: task.created_at.toISOString(),
      media_type: task.media_type || null,
      media_urls: task.media_urls || []
    };

    res.json(formattedTask);
  } catch (error) {
    console.error('获取最新任务失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router; 