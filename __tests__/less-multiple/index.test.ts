import path from 'path';
import { runTest } from '../runTest';
import fse from 'fs-extra';

describe('less-multiple', function () {
  it(path.basename(__filename), async function () {
    const output = path.resolve(__dirname, 'output');
    fse.removeSync(output);
    const result = await runTest([path.resolve(__dirname, './index.js')], output);
    const allFile = result.outputFiles.map((item) => item.path);
    allFile.forEach((file) => {
      fse.ensureFileSync(file);
      const content = result.outputFiles.find((item) => item.path === file)?.text;
      fse.writeFileSync(file, content);
      expect(content).toMatchSnapshot(path.relative(process.cwd(), file));
    });
  });

  it(path.basename(__filename), async function () {
    const output = path.resolve(__dirname, 'output-2');
    fse.removeSync(output);
    const result = await runTest([path.resolve(__dirname, './index.js')], output, {
      bundle: false,
    });
    const allFile = result.outputFiles.map((item) => item.path);
    allFile.forEach((file) => {
      fse.ensureFileSync(file);
      const content = result.outputFiles.find((item) => item.path === file)?.text;
      fse.writeFileSync(file, content);
      expect(content).toMatchSnapshot(path.relative(process.cwd(), file));
    });
  });
});
