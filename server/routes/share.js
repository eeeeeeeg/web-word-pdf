const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

// 分享数据存储目录
const SHARE_DATA_DIR = path.join(__dirname, '../temp/shares');

// 确保分享数据目录存在
fs.ensureDirSync(SHARE_DATA_DIR);

/**
 * 生成分享ID
 */
function generateShareId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 获取分享文件路径
 */
function getShareFilePath(shareId) {
  return path.join(SHARE_DATA_DIR, `${shareId}.json`);
}

/**
 * 清理过期的分享文件
 */
function cleanupExpiredShares() {
  try {
    const files = fs.readdirSync(SHARE_DATA_DIR);
    const now = Date.now();
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(SHARE_DATA_DIR, file);
        try {
          const data = fs.readJsonSync(filePath);
          if (data.expiresAt && now > data.expiresAt) {
            fs.removeSync(filePath);
            console.log(`清理过期分享文件: ${file}`);
          }
        } catch (error) {
          console.error(`清理分享文件失败: ${file}`, error);
          // 如果文件损坏，也删除它
          fs.removeSync(filePath);
        }
      }
    });
  } catch (error) {
    console.error('清理过期分享文件失败:', error);
  }
}

/**
 * 创建分享
 * POST /api/share/create
 */
router.post('/create', async (req, res) => {
  try {
    const { schema, options = {} } = req.body;

    // 验证数据
    if (!schema || !schema.pages || !Array.isArray(schema.pages)) {
      return res.status(400).json({
        error: 'INVALID_DATA',
        message: '页面设计数据无效'
      });
    }

    // 生成分享ID
    const shareId = generateShareId();
    
    // 计算过期时间
    const expiresIn = options.expiresIn || 7 * 24 * 60 * 60 * 1000; // 默认7天
    const expiresAt = Date.now() + expiresIn;

    // 准备分享数据
    const shareData = {
      id: shareId,
      schema: schema,
      options: {
        title: options.title || '页面设计分享',
        description: options.description || '',
        expiresIn: expiresIn
      },
      createdAt: Date.now(),
      expiresAt: expiresAt,
      version: '1.0'
    };

    // 保存到文件
    const filePath = getShareFilePath(shareId);
    await fs.writeJson(filePath, shareData, { spaces: 2 });

    // 生成分享链接
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/api/share/${shareId}`;

    res.json({
      success: true,
      shareId: shareId,
      shareUrl: shareUrl,
      expiresAt: expiresAt,
      expirationDate: new Date(expiresAt).toISOString()
    });

  } catch (error) {
    console.error('创建分享失败:', error);
    res.status(500).json({
      error: 'CREATE_FAILED',
      message: '创建分享失败'
    });
  }
});

/**
 * 获取分享数据
 * GET /api/share/:shareId
 */
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    // 验证分享ID格式
    if (!/^[a-f0-9]{32}$/.test(shareId)) {
      return res.status(400).json({
        error: 'INVALID_SHARE_ID',
        message: '分享ID格式无效'
      });
    }

    const filePath = getShareFilePath(shareId);

    // 检查文件是否存在
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        error: 'SHARE_NOT_FOUND',
        message: '分享不存在或已被删除'
      });
    }

    // 读取分享数据
    const shareData = await fs.readJson(filePath);

    // 检查是否过期
    if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
      // 删除过期文件
      await fs.remove(filePath);
      return res.status(410).json({
        error: 'SHARE_EXPIRED',
        message: '分享已过期'
      });
    }

    // 返回分享数据
    res.json({
      success: true,
      data: shareData
    });

  } catch (error) {
    console.error('获取分享数据失败:', error);
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: '获取分享数据失败'
    });
  }
});

/**
 * 获取分享统计信息
 * GET /api/share/:shareId/stats
 */
router.get('/:shareId/stats', async (req, res) => {
  try {
    const { shareId } = req.params;
    const filePath = getShareFilePath(shareId);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        error: 'SHARE_NOT_FOUND',
        message: '分享不存在'
      });
    }

    const shareData = await fs.readJson(filePath);

    if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
      return res.status(410).json({
        error: 'SHARE_EXPIRED',
        message: '分享已过期'
      });
    }

    // 计算统计信息
    const stats = {
      pageCount: shareData.schema.pages.length,
      componentCount: 0,
      hasHeader: shareData.schema.pageConfig.header.enabled,
      hasFooter: shareData.schema.pageConfig.footer.enabled,
      pageSize: `${shareData.schema.pageConfig.pageSize.width}×${shareData.schema.pageConfig.pageSize.height}${shareData.schema.pageConfig.pageSize.unit}`,
      createdAt: shareData.createdAt,
      expiresAt: shareData.expiresAt
    };

    // 统计组件数量
    shareData.schema.pages.forEach(page => {
      stats.componentCount += page.components.length;
    });

    if (stats.hasHeader) {
      stats.componentCount += shareData.schema.pageConfig.header.components.length;
    }

    if (stats.hasFooter) {
      stats.componentCount += shareData.schema.pageConfig.footer.components.length;
    }

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('获取分享统计失败:', error);
    res.status(500).json({
      error: 'STATS_FAILED',
      message: '获取分享统计失败'
    });
  }
});

/**
 * 删除分享
 * DELETE /api/share/:shareId
 */
router.delete('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const filePath = getShareFilePath(shareId);

    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }

    res.json({
      success: true,
      message: '分享已删除'
    });

  } catch (error) {
    console.error('删除分享失败:', error);
    res.status(500).json({
      error: 'DELETE_FAILED',
      message: '删除分享失败'
    });
  }
});

/**
 * 清理过期分享
 * POST /api/share/cleanup
 */
router.post('/cleanup', (req, res) => {
  try {
    cleanupExpiredShares();
    res.json({
      success: true,
      message: '清理完成'
    });
  } catch (error) {
    console.error('清理失败:', error);
    res.status(500).json({
      error: 'CLEANUP_FAILED',
      message: '清理失败'
    });
  }
});

// 定期清理过期文件（每小时执行一次）
setInterval(cleanupExpiredShares, 60 * 60 * 1000);

module.exports = router;
