import { mkdtemp, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { runInNewContext } from 'vm';
import { build, BuildResult, context } from 'esbuild';
import { transform } from 'lightningcss';
import { vi } from 'vitest';
import { styleLoader } from '../../src';
import { cssExportsToJs } from '../../src/utils';
import { runTest } from '../runTest';

vi.mock('lightningcss', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lightningcss')>();
  return { ...actual, transform: vi.fn(actual.transform) };
});

const mockTransform = vi.mocked(transform);
const originalError = new Error('Lightning CSS failed without source or location');

describe('style conversion failure', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await realpath(await mkdtemp(path.join(tmpdir(), 'style-loader-')));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const actual = await vi.importActual<typeof import('lightningcss')>('lightningcss');
    mockTransform.mockReset().mockImplementation(actual.transform);
    await rm(directory, { recursive: true, force: true });
  });

  async function bundle(name: string, contents: string, absolute = false) {
    const file = path.join(directory, name.split('?')[0]);
    await writeFile(file, contents);
    const entry = path.join(directory, 'entry.js');
    const request = absolute ? path.join(directory, name) : `./${name}`;
    await writeFile(entry, `import styles from ${JSON.stringify(request)}; console.log(styles);`);
    return await build({
      absWorkingDir: directory,
      entryPoints: [entry],
      outdir: path.join(directory, 'out'),
      bundle: true,
      write: false,
      logLevel: 'error',
      loader: { '.png': 'dataurl' },
      plugins: [styleLoader()],
    });
  }

  it.each(["C:\\Ray Projects\\样式's demo\\themes\\new.css", '\\\\fileserver\\share\\styles\\new.css'])(
    'preserves the generated require request for %s',
    (request) => {
      const requireStyle = vi.fn();
      runInNewContext(cssExportsToJs({}, request), { require: requireStyle, module: {} });
      expect(requireStyle).toHaveBeenCalledWith(request);
    },
  );

  it('bundles the existing fixture after Lightning CSS reports an unexpected token', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await runTest([path.join(__dirname, 'index.jsx')], directory, { logLevel: 'error' });

    expect(result.outputFiles.find((file) => file.path.endsWith('.css'))?.text).toContain('padding: 20px');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(path.join(__dirname, 'index.css')),
      expect.objectContaining({ message: expect.stringContaining('Unexpected token Dimension') }),
    );
  });

  it.each([false, true])('bundles CSS and assets with fallback when absolute import is %s', async (absolute) => {
    await writeFile(path.join(directory, 'image.png'), Buffer.from([1, 2, 3]));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockTransform.mockImplementationOnce(() => {
      throw originalError;
    });

    const name = "样式's theme.css";
    const result = await bundle(name, '.example { background-image: url(./image.png); }', absolute);

    expect(result.outputFiles.find((file) => file.path.endsWith('.css'))?.text).toContain('data:image/png');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(path.join(directory, name)), originalError);
  });

  it('keeps CSS Modules class exports in sync with the stylesheet for an absolute import', async () => {
    const result = await bundle("样式's theme.module.css", '.example { color: red; }', true);
    const js = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
    const css = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text;
    const log = vi.fn();
    runInNewContext(js, { console: { log } });
    const [{ example: className }] = log.mock.calls[0];

    expect(className).toEqual(expect.any(String));
    expect(className).not.toBe('example');
    expect(css).toContain(`.${className} {`);
  });

  it('reports an unresolved asset after falling back to the original CSS', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockTransform.mockImplementationOnce(() => {
      throw originalError;
    });

    await expect(bundle('index.css', '.example { background-image: url(./missing.png); }')).rejects.toMatchObject({
      errors: [expect.objectContaining({ text: expect.stringContaining('Could not resolve "./missing.png"') })],
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('index.css'), originalError);
  });

  it.each([
    ['less', '@primary: red; .example { color: @primary; }'],
    ['scss', '$primary: red; .example { color: $primary; }'],
  ])('continues bundling preprocessed %s', async (extension, contents) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockTransform.mockImplementationOnce(() => {
      throw originalError;
    });

    const result = await bundle(`index.${extension}`, contents);

    expect(result.outputFiles.find((file) => file.path.endsWith('.css'))?.text).toContain('color: red');
  });

  it.each(['less', 'scss'])(
    'returns to normal conversion when an imported %s file changes after fallback',
    async (extension) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockTransform.mockImplementationOnce(() => {
        throw originalError;
      });
      const sigil = extension === 'less' ? '@' : '$';
      const importedFile = path.join(directory, `variables.${extension}`);
      const entry = path.join(directory, 'entry.js');
      await writeFile(entry, `import './index.${extension}';`);
      await writeFile(importedFile, `${sigil}size: 12px;`);
      await writeFile(
        path.join(directory, `index.${extension}`),
        `@import "./variables.${extension}"; .example { width: ${sigil}size; }`,
      );
      let onBuild: (result: BuildResult) => void;
      const nextBuild = () =>
        new Promise<BuildResult>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timed out waiting for an esbuild watch result')), 4000);
          onBuild = (result) => {
            clearTimeout(timer);
            resolve(result);
          };
        });
      const watcher = await context({
        absWorkingDir: directory,
        entryPoints: [entry],
        outdir: path.join(directory, 'out'),
        bundle: true,
        write: false,
        logLevel: 'error',
        plugins: [styleLoader(), { name: 'watch-test', setup: (build) => build.onEnd((result) => onBuild(result)) }],
      });
      try {
        const initial = nextBuild();
        await watcher.watch();
        expect((await initial).outputFiles?.find((file) => file.path.endsWith('.css'))?.text).toContain('width: 12px');
        const rebuilt = nextBuild();
        await writeFile(importedFile, `${sigil}size: 24px;`);
        expect((await rebuilt).outputFiles?.find((file) => file.path.endsWith('.css'))?.text).toContain('width: 24px');
        expect(warn.mock.calls.filter(([message]) => message.includes('[esbuild-style-loader]'))).toHaveLength(1);
      } finally {
        await watcher.dispose();
      }
    },
    10000,
  );

  it.each(['index.module.css', 'index.css?modules', 'index.css?%6dodules', 'index.css?modules=false'])(
    'preserves the original CSS Modules error for %s',
    async (name) => {
      mockTransform.mockImplementationOnce(() => {
        throw originalError;
      });

      await expect(bundle(name, '.example { color: red; }')).rejects.toMatchObject({
        errors: [
          expect.objectContaining({
            text: originalError.message,
            detail: originalError,
            location: expect.objectContaining({ file: name.split('?')[0] }),
          }),
        ],
      });
    },
  );

  it('preserves the original CRLF source line and location for a CSS Modules failure', async () => {
    const contents = '.example {\r\n  color: red;\r\n}';
    const error = Object.assign(new Error('Invalid declaration'), {
      loc: { line: 2, column: 2 },
      source: contents,
    });
    mockTransform.mockImplementationOnce(() => {
      throw error;
    });

    await expect(bundle('index.module.css', contents)).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          text: error.message,
          location: expect.objectContaining({
            file: 'index.module.css',
            line: 2,
            column: 2,
            lineText: '  color: red;',
          }),
        }),
      ],
    });
  });

  it.each([
    ['less', '.example { color: @undefined; }', 'variable @undefined is undefined'],
    ['scss', '.example { color: $undefined; }', 'Undefined variable'],
  ])('keeps %s preprocessor errors fatal', async (extension, contents, diagnostic) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(bundle(`index.${extension}`, contents)).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          text: expect.stringContaining(diagnostic),
          location: expect.objectContaining({ file: `index.${extension}`, line: 1 }),
        }),
      ],
    });
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('[esbuild-style-loader]'), expect.anything());
  });
});
