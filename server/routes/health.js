const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();

/**
 * 健康检查接口
 */
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      services: {
        playwright: 'unknown',
        filesystem: 'unknown'
      }
    };

    // 检查Playwright
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      healthStatus.services.playwright = 'healthy';
    } catch (error) {
      healthStatus.services.playwright = 'error';
      healthStatus.errors = healthStatus.errors || [];
      healthStatus.errors.push(`Playwright: ${error.message}`);
    }

    // 检查文件系统
    try {
      const tempDir = path.join(__dirname, '../temp');
      await fs.ensureDir(tempDir);
      const testFile = path.join(tempDir, 'health-check.txt');
      await fs.writeFile(testFile, 'health check');
      await fs.remove(testFile);
      healthStatus.services.filesystem = 'healthy';
    } catch (error) {
      healthStatus.services.filesystem = 'error';
      healthStatus.errors = healthStatus.errors || [];
      healthStatus.errors.push(`Filesystem: ${error.message}`);
    }

    // 判断整体状态
    const hasErrors = healthStatus.errors && healthStatus.errors.length > 0;
    if (hasErrors) {
      healthStatus.status = 'degraded';
      res.status(503);
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * 详细系统信息
 */
router.get('/detailed', async (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3001,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
      },
      dependencies: {
        playwright: require('playwright/package.json').version,
        express: require('express/package.json').version
      },
      directories: {
        temp: path.join(__dirname, '../temp'),
        public: path.join(__dirname, '../public')
      }
    };

    // 检查目录状态
    for (const [name, dir] of Object.entries(systemInfo.directories)) {
      try {
        const stats = await fs.stat(dir);
        systemInfo.directories[name] = {
          path: dir,
          exists: true,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        systemInfo.directories[name] = {
          path: dir,
          exists: false,
          error: error.message
        };
      }
    }

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get system info',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
