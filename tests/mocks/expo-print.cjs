let lastPrintedHtml = '';
let lastPrintToFileOptions = null;

module.exports = {
  printToFileAsync: async (options) => {
    lastPrintToFileOptions = options;
    lastPrintedHtml = options?.html || '';
    return {
      uri: 'file:///mock/path/relatorio-clinico.pdf',
      numberOfPages: 2,
      base64: options?.base64 ? 'mock-base64-content' : undefined,
    };
  },
  printAsync: async (options) => {
    lastPrintedHtml = options?.html || '';
  },
  getLastPrintedHtml: () => lastPrintedHtml,
  getLastPrintOptions: () => lastPrintToFileOptions,
  reset: () => {
    lastPrintedHtml = '';
    lastPrintToFileOptions = null;
  },
};
