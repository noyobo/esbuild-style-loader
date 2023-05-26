import path from 'path';
import { runTest } from '../runTest';
import fse from 'fs-extra';
import { formatMessages } from 'esbuild';

const OUTPUT_HTML = !!process.env.OUTPUT_HTML;

describe(path.basename(path.dirname(__filename)), function () {
  it('style-loader', async function () {
    const output = path.resolve(__dirname, 'output');
    fse.removeSync(output);
    await runTest([path.resolve(__dirname, './index.jsx')], output).catch((error) => {
      formatMessages(error.errors, { kind: 'error', color: false }).then((res) => {
        expect(res.length).toBe(1);
        expect(res[0]).toContain('[ERROR] Unrecognised input [plugin style-loader]');
      });
    });
  });
});
