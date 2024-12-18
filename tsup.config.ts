import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.mts'],
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  outExtension: ({ format }) => {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    }
  },
});
