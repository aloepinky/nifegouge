import { setWorkerPort } from './pdfText';

// pdf.js's parser in a real Worker, so reading a 200-page JPPT does not freeze the page.
// webpack bundles the worker file from `new URL(..., import.meta.url)`. A fresh Worker per
// upload: pdf.js tears down its side of the port when a document is destroyed.
//
// Where a Worker cannot be made, the worker code is loaded in-process instead, which pdf.js
// picks up from window.pdfjsWorker. Slower, and it holds the main thread, but it works.
//
// -> a function that ends the worker.
export async function preparePdfWorker() {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.js', import.meta.url));
      setWorkerPort(worker);
      return () => {
        setWorkerPort(null);
        worker.terminate();
      };
    } catch (err) {
      // fall through to in-process
    }
  }
  setWorkerPort(null);
  await import('pdfjs-dist/legacy/build/pdf.worker.entry');
  return () => {};
}
