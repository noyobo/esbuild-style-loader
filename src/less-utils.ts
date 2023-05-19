import { PartialMessage } from 'esbuild';
/** Convert less error into esbuild error */
export const convertLessError = (error: Less.RenderError): PartialMessage => {
  const sourceLine = error.extract.filter((line) => line);
  const lineText = sourceLine.length === 3 ? sourceLine[1] : sourceLine[0];

  return {
    text: error.message,
    location: {
      namespace: 'file',
      file: error.filename,
      line: error.line,
      column: error.column,
      lineText,
    },
  };
};
