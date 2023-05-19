import * as esbuild from 'esbuild';
import path from 'path';
import { styleLoader } from '../src';
import { BuildOptions } from 'esbuild';

export const runTest = async (files: string[], outdir: string, options?: BuildOptions) => {
  const result = await esbuild.build(
    Object.assign(
      {
        entryPoints: files,
        outdir: outdir,
        bundle: true,
        write: false,
        sourcemap: true,
        plugins: [
          styleLoader({
            cssModules: {
              pattern: '[name]__[local]',
            },
          }),
        ],
      },
      options,
    ),
  );

  return result;
};
