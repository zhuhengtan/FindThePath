#!/usr/bin/env node

/**
 * 快速发布脚本 - 交互式版本发布
 * 
 * 用法：
 *   node scripts/release-interactive.js
 * 
 * 功能：
 * 1. 选择要发布的模块
 * 2. 自动计算下一个版本号
 * 3. 输入变更说明
 * 4. 自动更新文档和提交
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 配置
const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');

const MODULES = [
  { key: '1', name: 'cc-hunter', label: 'cc-hunter (核心工具库)', remoteName: 'cc-hunter' },
  { key: '2', name: 'cc-hunter-ui', label: 'cc-hunter-ui (UI组件库)', remoteName: 'cc-hunter-ui' },
  { key: '3', name: 'main', label: '主项目 (real-FindThePath)', remoteName: 'real-FindThePath' },
];

const VERSION_TYPES = [
  { key: '1', type: 'patch', label: 'patch (修复bug, 如 1.0.0 -> 1.0.1)' },
  { key: '2', type: 'minor', label: 'minor (新功能, 如 1.0.0 -> 1.1.0)' },
  { key: '3', type: 'major', label: 'major (破坏性更新, 如 1.0.0 -> 2.0.0)' },
];

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// 从 README 中提取当前版本
function getCurrentVersion(moduleName) {
  let readmePath;
  if (moduleName === 'main') {
    readmePath = path.join(PROJECT_ROOT, 'CHANGELOG.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8');
      const match = content.match(/## \[(\d+\.\d+\.\d+)\]/);
      return match ? match[1] : '1.0.0';
    }
  } else {
    readmePath = path.join(ASSETS_DIR, moduleName, 'README.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8');
      const match = content.match(/当前版本：`(\d+\.\d+\.\d+)`/);
      return match ? match[1] : '1.0.0';
    }
  }
  return '1.0.0';
}

// 计算下一个版本号
function getNextVersion(currentVersion, type) {
  const parts = currentVersion.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

// 执行发布脚本
function runRelease(module, version, type, message) {
  const cmd = `node "${path.join(__dirname, 'release.js')}" ${module} ${version} --type ${type} --message "${message}"`;
  console.log(`\n执行: ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit' });
}

// 执行 Git 命令
function execGit(args, autoRun = false) {
  const cmd = `git ${args}`;
  if (autoRun) {
    console.log(`执行: ${cmd}`);
    try {
      execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
      return true;
    } catch (err) {
      console.error(`Git 命令失败`);
      return false;
    }
  } else {
    console.log(`  ${cmd}`);
    return true;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('        版本发布工具 (交互式)');
  console.log('========================================\n');

  // 1. 选择模块
  console.log('请选择要发布的模块：');
  MODULES.forEach(m => console.log(`  ${m.key}. ${m.label}`));
  const moduleChoice = await ask('\n请输入选项 (1-3): ');
  const selectedModule = MODULES.find(m => m.key === moduleChoice);
  if (!selectedModule) {
    console.error('无效选择');
    rl.close();
    return;
  }

  // 2. 获取当前版本
  const currentVersion = getCurrentVersion(selectedModule.name);
  console.log(`\n当前版本: ${currentVersion}`);

  // 3. 选择版本类型
  console.log('\n请选择版本类型：');
  VERSION_TYPES.forEach(v => console.log(`  ${v.key}. ${v.label}`));
  const typeChoice = await ask('\n请输入选项 (1-3): ');
  const selectedType = VERSION_TYPES.find(v => v.key === typeChoice);
  if (!selectedType) {
    console.error('无效选择');
    rl.close();
    return;
  }

  // 4. 计算新版本
  const newVersion = getNextVersion(currentVersion, selectedType.type);
  const confirmVersion = await ask(`\n新版本号将为: ${newVersion}，确认？(Y/n): `);
  
  let finalVersion = newVersion;
  if (confirmVersion.toLowerCase() === 'n') {
    finalVersion = await ask('请输入自定义版本号: ');
  }

  // 5. 输入变更说明
  const message = await ask('\n请输入变更说明: ');
  if (!message.trim()) {
    console.error('变更说明不能为空');
    rl.close();
    return;
  }

  // 6. 确认执行
  console.log('\n========================================');
  console.log('即将执行以下操作：');
  console.log(`  模块: ${selectedModule.label}`);
  console.log(`  版本: ${currentVersion} -> ${finalVersion}`);
  console.log(`  类型: ${selectedType.type}`);
  console.log(`  说明: ${message}`);
  console.log('========================================\n');

  const confirm = await ask('确认发布？(y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消');
    rl.close();
    return;
  }

  // 7. 执行发布
  runRelease(selectedModule.name, finalVersion, selectedType.type, message);

  // 8. 询问是否自动执行 Git
  console.log('\n是否自动执行 Git 提交和打标签？');
  const autoGit = await ask('(y/N): ');
  
  if (autoGit.toLowerCase() === 'y') {
    console.log('\n执行 Git 操作...\n');
    execGit('add .', true);
    execGit(`commit -m "chore(${selectedModule.name}): release v${finalVersion} - ${message}"`, true);
    execGit(`tag -a ${selectedModule.name}-v${finalVersion} -m "Release ${selectedModule.name} v${finalVersion}"`, true);
    
    const push = await ask('\n是否推送到远程？(y/N): ');
    if (push.toLowerCase() === 'y') {
      execGit('push origin main --tags', true);
    }
  }

  console.log('\n✅ 发布完成！\n');
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
});
