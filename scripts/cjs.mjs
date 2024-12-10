import fsExtra from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 获取目录下的所有文件
function getAllFiles(dir) {
  const files = fsExtra.readdirSync(dir);
  return files.reduce((acc, file) => {
    const filePath = path.join(dir, file);
    const stat = fsExtra.statSync(filePath);
    if (stat.isDirectory()) {
      return acc.concat(getAllFiles(filePath));
    }
    return acc.concat(filePath);
  }, []);
}

function replaceDirExt(dir, oldExt, newExt) {
  const allFiles = getAllFiles(dir).filter((file) => file.endsWith(oldExt));

  for (const file of allFiles) {
    const context = fsExtra.readFileSync(file, 'utf-8');
    const newContext = context.replace(oldExt, newExt);
    // replace file name with new extension
    const newFileName = file.replace(oldExt, newExt);
    fsExtra.writeFileSync(newFileName, newContext);
    fsExtra.unlinkSync(file);
  }
}

const libDir = path.join(__dirname, '../lib');
replaceDirExt(libDir, '.js', '.cjs');
// const esmDir = path.join(__dirname, '../esm');
// replaceDirExt(esmDir, '.js', '.mjs');
