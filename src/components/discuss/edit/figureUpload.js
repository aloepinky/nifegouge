import { figureUploadUrl } from '../discussApi';

// Puts a figure on the mirror. The browser re-encodes the image to WebP, as
// tools/convert-images.py does for the images in the repository, and sends it straight to a
// presigned URL; the API only issues the URL. What comes back is the public address to put in
// the figure's `src`.

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;
const QUALITY = 0.85;

export function figureName(file) {
  return (file.name || 'figure')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'figure';
}

async function toWebp(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
  // Safari cannot encode WebP and hands back a PNG under the same call. Refuse it rather than
  // store a PNG under a .webp name.
  if (!blob || blob.type !== 'image/webp') {
    throw new Error('This browser cannot convert images to WebP. Use Chrome, Edge or Firefox to upload.');
  }
  return blob;
}

// -> the public URL of the stored image.
export async function uploadFigure(file, slug, onProgress = () => {}) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_BYTES) throw new Error('That image is over 8 MB. Export it smaller first.');
  onProgress('Converting to WebP');
  const blob = await toWebp(file);
  onProgress('Uploading');
  const { uploadUrl, publicUrl } = await figureUploadUrl(slug, figureName(file));
  let response;
  try {
    response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob });
  } catch (err) {
    throw new Error('The upload did not reach the server. Check your connection and try again.');
  }
  if (!response.ok) throw new Error(`The upload was refused (${response.status}).`);
  return publicUrl;
}
