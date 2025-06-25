import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  outExtension: ({ format }) => {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    }
  },
  minify: false,
  target: 'es2016',
  sourcemap: true,
});
