import { PDFDocument, PDFArray, PDFRawStream, ParseSpeeds, decodePDFRawStream } from 'pdf-lib';

// Each page's decoded content stream, as a byte string (one char per byte, 0-255).
//
// pdf-lib does the object table, the compressed object streams and FlateDecode — the part of
// tools/extract-jppt-flow.py lifted from pdftext.py — so the flow tracer only ever sees the
// same bytes the Python reads. Built with String.fromCharCode rather than TextDecoder: the
// browser's 'latin1' decoder is really windows-1252 and rewrites bytes 0x80-0x9F.

export function bytesToBinary(bytes) {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

function decodeStream(stream) {
  if (!stream) return '';
  try {
    if (stream instanceof PDFRawStream) return bytesToBinary(decodePDFRawStream(stream).decode());
    if (typeof stream.getContents === 'function') return bytesToBinary(stream.getContents());
  } catch (err) {
    // A stream pdf-lib cannot decode contributes nothing, as in the Python.
  }
  return '';
}

export async function loadPageContents(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // Fastest: parse in one pass. The default yields to the event loop every hundred objects
  // through a timer, and a background tab throttles timers to about once a second, which turned
  // a one-second parse into minutes.
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
    parseSpeed: ParseSpeeds.Fastest,
  });
  const { context } = doc;
  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    if (!contents) return '';
    if (contents instanceof PDFArray) {
      let out = '';
      for (let i = 0; i < contents.size(); i += 1) out += decodeStream(context.lookup(contents.get(i)));
      return out;
    }
    return decodeStream(contents);
  });
}
