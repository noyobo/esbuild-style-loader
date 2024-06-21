import type { PartialMessage } from 'esbuild';
/** Convert less error into esbuild error */
export const convertLessError = (error: Less.RenderError): PartialMessage => {
  const sourceLine = error.extract.filter(Boolean);
  const lineText = sourceLine.length === 3 ? sourceLine[1] : sourceLine[0];

  return {
    text: error.message || 'less compile error',
    location: {
      namespace: 'file',
      file: error.filename,
      line: error.line,
      column: error.column,
      lineText,
    },
  };
};
