#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动 Web Word PDF 开发环境...\n');

// 检查Node.js版本
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 16) {
  console.error('❌ 需要 Node.js 16.0 或更高版本');
  console.error(`   当前版本: ${nodeVersion}`);
  process.exit(1);
}

// 检查服务器目录
const serverDir = path.join(__dirname, 'server');
if (!fs.existsSync(serverDir)) {
  console.error('❌ 服务器目录不存在:', serverDir);
  process.exit(1);
}

// 检查前端依赖
const frontendPackageJson = path.join(__dirname, 'package.json');
if (!fs.existsSync(frontendPackageJson)) {
  console.error('❌ 前端 package.json 不存在');
  process.exit(1);
}

// 检查服务器依赖
const serverPackageJson = path.join(serverDir, 'package.json');
if (!fs.existsSync(serverPackageJson)) {
  console.error('❌ 服务器 package.json 不存在');
  process.exit(1);
}

// 启动服务器
console.log('📡 启动后端服务器...');
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: serverDir,
  stdio: 'pipe',
  shell: true
});

// 启动前端
console.log('🌐 启动前端开发服务器...');
const frontendProcess = spawn('npm', ['run', 'serve'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

// 处理服务器输出
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[服务器] ${output.trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('ExperimentalWarning')) {
    console.error(`[服务器错误] ${output.trim()}`);
  }
});

// 处理前端输出
frontendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[前端] ${output.trim()}`);
});

frontendProcess.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('warning') && !output.includes('Warning')) {
    console.error(`[前端错误] ${output.trim()}`);
  }
});

// 处理进程退出
serverProcess.on('close', (code) => {
  console.log(`\n❌ 服务器进程退出，代码: ${code}`);
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill();
  }
  process.exit(code);
});

frontendProcess.on('close', (code) => {
  console.log(`\n❌ 前端进程退出，代码: ${code}`);
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  process.exit(code);
});

// 处理Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭开发服务器...');
  
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGINT');
  }
  
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGINT');
  }
  
  setTimeout(() => {
    console.log('✅ 开发服务器已关闭');
    process.exit(0);
  }, 1000);
});

// 显示启动信息
setTimeout(() => {
  console.log('\n🎉 开发环境启动完成！');
  console.log('📍 前端地址: http://localhost:8080');
  console.log('📍 后端地址: http://localhost:3001');
  console.log('📊 健康检查: http://localhost:3001/api/health');
  console.log('\n按 Ctrl+C 停止服务器');
}, 3000);
