import path from 'path';
import { removeComments, runTest } from '../runTest';
import fse from 'fs-extra';

const OUTPUT_HTML = !!process.env.OUTPUT_HTML;

describe(path.basename(path.dirname(__filename)), function () {
  it('style-loader', async function () {
    const output = path.resolve(__dirname, 'output');
    fse.removeSync(output);
    const result = await runTest([path.resolve(__dirname, './index.jsx')], output);
    const allFile = result.outputFiles.map((item) => item.path);
    allFile.forEach((file) => {
      fse.ensureFileSync(file);
      let content = result.outputFiles.find((item) => item.path === file)?.text;
      content = removeComments(content);
      content = content.replace(/((style|css)-loader:\S+)/g, (match, loader, type) => {
        return `${type}-loader:${path.basename(loader)}`;
      });
      fse.writeFileSync(file, content);

      if (OUTPUT_HTML) {
        expect(1).toBe(1);
      } else {
        if (file.endsWith('.js') || file.endsWith('.css')) {
          expect(content).toMatchSnapshot();
        }
      }
    });
  });
});
