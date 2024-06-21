import type { PartialMessage } from 'esbuild';

export type TransformResult = {
  css: string;
  map?: string;
  imports?: string[];
  warnings?: PartialMessage[];
};
