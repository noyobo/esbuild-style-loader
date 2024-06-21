import type { PartialMessage } from 'esbuild';

export type StyleTransformResult = {
  css: string;
  map?: string;
  imports?: string[];
  warnings?: PartialMessage[];
};
