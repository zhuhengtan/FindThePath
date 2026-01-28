const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// 配置路径
const inputDir = path.resolve(__dirname, '../assets/main-game/configs'); // CSV 目录
const outputDir = path.resolve(__dirname, '../assets/main-game/configs_json'); // 输出 JSON 的目录

if (inputDir === outputDir) {
  throw new Error("❌ Output path 不能和输入路径一样！");
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, {
    recursive: true
  });
}

// 过滤 .csv 文件
const csvFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.csv'));

csvFiles.forEach(file => {
  const inputPath = path.join(inputDir, file);
  const csvText = fs.readFileSync(inputPath, 'utf8');

const parsed = Papa.parse(csvText.replace(/^\uFEFF/, ''), {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
  delimiter: ';',
});

// 进一步类型处理：将看起来像 JSON 的字符串转换为对象/数组；空字符串转为 null
const processed = parsed.data.map(row => {
  const out = {};
  Object.keys(row).forEach(key => {
    let val = row[key];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') {
        val = null;
      } else if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          val = JSON.parse(trimmed);
        } catch (e) {
          // 保留原值
        }
      }
    }
    out[key] = val;
  });
  return out;
});

const jsonFileName = file.replace(/\.csv$/i, '.json');
const outputPath = path.join(outputDir, jsonFileName);

fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2), 'utf8');

  console.log(`✔ Converted: ${file} -> ${jsonFileName}`);
});
