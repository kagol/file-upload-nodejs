// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3016;
console.log('file-upload server start=====');

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于访问上传的文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// 1. 基础配置 - 磁盘存储
// ============================================
const storage = multer.diskStorage({
    // 文件存储位置
    destination: function (req, file, cb) {
        // 可以按日期创建子目录
        const dateDir = path.join(uploadDir, new Date().toISOString().split('T')[0]);
        if (!fs.existsSync(dateDir)) {
            fs.mkdirSync(dateDir, { recursive: true });
        }
        cb(null, dateDir);
    },
    // 文件命名规则
    filename: function (req, file, cb) {
        // 原始文件名编码处理 + 时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        // 清理文件名中的特殊字符
        const safeName = basename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        cb(null, `${safeName}-${uniqueSuffix}${ext}`);
    }
});

// ============================================
// 2. 文件过滤配置
// ============================================
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        'video': ['video/mp4', 'video/webm', 'video/ogg'],
        'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    // 合并所有允许的类型
    const allAllowedTypes = Object.values(allowedTypes).flat();
    
    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
};

// ============================================
// 3. 创建上传中间件实例
// ============================================
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
        files: 5 // 最多同时上传5个文件
    }
});

// ============================================
// 4. 错误处理中间件
// ============================================
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer 特定错误
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: '文件大小超过限制（最大10MB）'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: '上传文件数量超过限制（最多5个）'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: '意外的文件字段名'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `上传错误: ${err.message}`
                });
        }
    } else if (err) {
        // 其他错误（如文件类型过滤）
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// ============================================
// 5. 接口实现
// ============================================

// 健康检查端点
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: '文件上传服务运行中',
        endpoints: [
            '单文件上传 POST /api/upload/single',
            '多文件上传 POST /api/upload/multiple',
            '多字段文件上传 POST /api/upload/fields',
            '图片上传 POST /api/upload/image',
            '文件删除 DELETE /api/upload/delete/:filename',
            '获取文件列表 GET  /api/upload/list',
        ]
    });
});

/**
 * 单文件上传接口
 * POST /api/upload/single
 * field name: 'file'
 */
app.post('/api/upload/single', upload.single('file'), handleMulterError, (req, res) => {
    console.log('单文件上传=============');
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }

        // 构建文件访问URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${path.relative(uploadDir, req.file.path).replace(/\\/g, '/')}`;

        res.json({
            success: true,
            message: '文件上传成功',
            data: {
                originalName: req.file.originalname,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                url: fileUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: error.message
        });
    }
});

/**
 * 多文件上传接口（相同字段）
 * POST /api/upload/multiple
 * field name: 'files' (支持多个)
 */
app.post('/api/upload/multiple', upload.array('files', 5), handleMulterError, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }

        const files = req.files.map(file => {
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${path.relative(uploadDir, file.path).replace(/\\/g, '/')}`;
            return {
                originalName: file.originalname,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                url: fileUrl
            };
        });

        res.json({
            success: true,
            message: `成功上传 ${files.length} 个文件`,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: error.message
        });
    }
});

/**
 * 多字段文件上传接口
 * POST /api/upload/fields
 * 支持同时上传：avatar, gallery, documents
 */
app.post('/api/upload/fields', upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'gallery', maxCount: 3 },
    { name: 'documents', maxCount: 2 }
]), handleMulterError, (req, res) => {
    try {
        const result = {};
        
        // 处理每个字段
        for (const [fieldName, files] of Object.entries(req.files)) {
            result[fieldName] = files.map(file => {
                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${path.relative(uploadDir, file.path).replace(/\\/g, '/')}`;
                return {
                    originalName: file.originalname,
                    filename: file.filename,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: fileUrl
                };
            });
        }

        res.json({
            success: true,
            message: '多字段文件上传成功',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: error.message
        });
    }
});

/**
 * 仅图片上传接口（更严格的限制）
 * POST /api/upload/image
 */
const imageUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 图片限制5MB
    }
});

app.post('/api/upload/image', imageUpload.single('image'), handleMulterError, (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: '请上传图片文件'
        });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${path.relative(uploadDir, req.file.path).replace(/\\/g, '/')}`;
    
    res.json({
        success: true,
        message: '图片上传成功',
        data: {
            filename: req.file.filename,
            url: fileUrl,
            size: req.file.size
        }
    });
});

/**
 * 文件删除接口
 * DELETE /api/upload/delete/:filename
 */
app.delete('/api/upload/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    // 安全处理：防止目录遍历攻击
    const safeFilename = path.basename(filename);
    
    // 递归查找文件（因为可能按日期分目录）
    const findFile = (dir, targetFile) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const found = findFile(fullPath, targetFile);
                if (found) return found;
            } else if (file === targetFile) {
                return fullPath;
            }
        }
        return null;
    };

    const filePath = findFile(uploadDir, safeFilename);

    if (!filePath) {
        return res.status(404).json({
            success: false,
            message: '文件不存在'
        });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '删除文件失败',
                error: err.message
            });
        }
        res.json({
            success: true,
            message: '文件删除成功'
        });
    });
});

/**
 * 获取文件列表接口
 * GET /api/upload/list
 */
app.get('/api/upload/list', (req, res) => {
    const listFiles = (dir, basePath = '') => {
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.join(basePath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...listFiles(fullPath, relativePath));
            } else {
                files.push({
                    filename: item,
                    path: relativePath,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    url: `/uploads/${relativePath.replace(/\\/g, '/')}`
                });
            }
        }
        return files;
    };

    try {
        const files = listFiles(uploadDir);
        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取文件列表失败',
            error: error.message
        });
    }
});

// ============================================
// 6. 全局错误处理
// ============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`文件上传服务器运行在 http://localhost:${PORT}`);
    console.log(`上传目录: ${uploadDir}`);
});

module.exports = app;