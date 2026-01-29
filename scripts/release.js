#!/usr/bin/env node

/**
 * 版本发布脚本
 * 
 * 用法：
 *   node scripts/release.js <module> <version> [--type <type>] [--message <message>]
 * 
 * 示例：
 *   node scripts/release.js hunter 1.0.1 --type patch --message "修复存储兼容性问题"
 *   node scripts/release.js hunter-ui 1.1.0 --type minor --message "新增 Loading 组件"
 *   node scripts/release.js main 1.0.1 --type patch --message "更新依赖版本"
 * 
 * 参数：
 *   module   - 模块名称：hunter, hunter-ui, dialogue-system, main
 *   version  - 新版本号，如 1.0.1
 *   --type   - 变更类型：major, minor, patch (用于 CHANGELOG 分类)
 *   --message - 变更说明
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');

const MODULES = {
  'hunter': {
    dir: path.join(ASSETS_DIR, 'hunter'),
    name: 'Hunter - 核心工具库',
    remoteName: 'cc-hunter',
  },
  'hunter-ui': {
    dir: path.join(ASSETS_DIR, 'hunter-ui'),
    name: 'Hunter-UI - UI 组件库',
    remoteName: 'cc-hunter-ui',
  },
  'dialogue-system': {
    dir: path.join(ASSETS_DIR, 'dialogue-system'),
    name: 'Dialogue-System - 对话系统',
    remoteName: 'cc-dialogue-system',
  },
  'main': {
    dir: PROJECT_ROOT,
    name: '2D Game Template',
    remoteName: 'real-2d-game-template',
    isMain: true,
  },
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('用法: node scripts/release.js <module> <version> [--type <type>] [--message <message>]');
    console.error('模块: hunter, hunter-ui, dialogue-system, main');
    process.exit(1);
  }

  const module = args[0];
  const version = args[1];
  let type = 'patch';
  let message = '';

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1];
      i++;
    } else if (args[i] === '--message' && args[i + 1]) {
      message = args[i + 1];
      i++;
    }
  }

  if (!MODULES[module]) {
    console.error(`未知模块: ${module}`);
    console.error('可用模块: ' + Object.keys(MODULES).join(', '));
    process.exit(1);
  }

  return { module, version, type, message };
}

// 获取当前日期
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 更新模块 README 中的版本号
function updateReadmeVersion(moduleDir, version) {
  const readmePath = path.join(moduleDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.warn(`README 不存在: ${readmePath}`);
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');
  
  // 更新版本号
  content = content.replace(
    /当前版本：`[\d.]+`/,
    `当前版本：\`${version}\``
  );

  fs.writeFileSync(readmePath, content);
  console.log(`✓ 已更新 ${readmePath} 版本号为 ${version}`);
  return true;
}

// 更新模块 README 中的更新日志
function updateReadmeChangelog(moduleDir, version, type, message) {
  const readmePath = path.join(moduleDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');
  const today = getToday();
  
  const typeLabel = {
    'major': 'Changed',
    'minor': 'Added',
    'patch': 'Fixed',
  }[type] || 'Changed';

  const newEntry = `### [${version}] - ${today}

#### ${typeLabel}
- ${message || '版本更新'}

`;

  // 在 "## 📝 更新日志" 后插入新条目
  content = content.replace(
    /(## 📝 更新日志\n\n)/,
    `$1${newEntry}`
  );

  fs.writeFileSync(readmePath, content);
  console.log(`✓ 已更新 ${readmePath} 更新日志`);
  return true;
}

// 更新主项目 CHANGELOG.md
function updateMainChangelog(version, type, message, module) {
  const changelogPath = path.join(PROJECT_ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    console.warn('CHANGELOG.md 不存在');
    return false;
  }

  let content = fs.readFileSync(changelogPath, 'utf-8');
  const today = getToday();

  const typeLabel = {
    'major': 'Changed',
    'minor': 'Added',
    'patch': 'Fixed',
  }[type] || 'Changed';

  const moduleName = MODULES[module]?.name || module;
  const newEntry = `## [${version}] - ${today}

### ${typeLabel}
- **${moduleName}**: ${message || '版本更新'}

---

`;

  // 在 [Unreleased] 部分后插入
  content = content.replace(
    /(## \[Unreleased\][\s\S]*?\n---\n\n)/,
    `$1${newEntry}`
  );

  fs.writeFileSync(changelogPath, content);
  console.log(`✓ 已更新 CHANGELOG.md`);
  return true;
}

// 更新主项目 README 中的依赖版本
function updateMainReadmeDependency(module, version) {
  if (module === 'main') return true;
  
  const readmePath = path.join(PROJECT_ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');
  
  // 更新依赖表中的版本号
  const regex = new RegExp(`(\\| \\[${module}\\][^|]*\\| )\`[\\d.]+\``);
  content = content.replace(regex, `$1\`${version}\``);

  fs.writeFileSync(readmePath, content);
  console.log(`✓ 已更新主项目 README.md 中 ${module} 的依赖版本`);
  return true;
}

// 执行 Git 命令
function execGit(cwd, ...args) {
  const cmd = `git ${args.join(' ')}`;
  console.log(`执行: ${cmd} (在 ${cwd})`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`Git 命令失败: ${cmd}`);
    return false;
  }
}

// 主函数
async function main() {
  const { module, version, type, message } = parseArgs();
  const moduleConfig = MODULES[module];

  console.log('\n========================================');
  console.log(`发布 ${moduleConfig.name} v${version}`);
  console.log('========================================\n');

  // 1. 更新版本号和日志
  if (moduleConfig.isMain) {
    // 主项目：只更新 CHANGELOG
    updateMainChangelog(version, type, message, 'main');
  } else {
    // 模块：更新模块 README
    updateReadmeVersion(moduleConfig.dir, version);
    updateReadmeChangelog(moduleConfig.dir, version, type, message);
    // 同时更新主项目的依赖表
    updateMainReadmeDependency(module, version);
    // 更新主项目 CHANGELOG
    updateMainChangelog(version, type, message, module);
  }

  console.log('\n✅ 文档更新完成！\n');
  console.log('接下来请手动执行以下 Git 操作：\n');
  
  if (moduleConfig.isMain) {
    console.log('# 提交并打标签');
    console.log(`git add .`);
    console.log(`git commit -m "chore: release v${version}"`);
    console.log(`git tag -a v${version} -m "Release v${version}"`);
    console.log(`git push origin main --tags`);
  } else {
    console.log('# 如果模块是独立仓库（submodule），先在模块目录提交：');
    console.log(`cd assets/${module}`);
    console.log(`git add .`);
    console.log(`git commit -m "chore: release v${version} - ${message || '版本更新'}"`);
    console.log(`git tag -a v${version} -m "Release v${version}"`);
    console.log(`git push origin main --tags`);
    console.log('');
    console.log('# 然后回到主项目提交 submodule 引用更新：');
    console.log(`cd ../..`);
    console.log(`git add .`);
    console.log(`git commit -m "chore: update ${module} to v${version}"`);
    console.log(`git push origin main`);
  }
}

main().catch(console.error);
