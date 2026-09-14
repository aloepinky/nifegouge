import { gzipSync } from 'node:zlib';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3, presignPut, CONFIG } from './clients.mjs';
import { listItemMetas, listSyllabi, newestSyllabus } from './store.mjs';

// The read path. Every write mirrors the newest version of what it touched to the public
// bucket as pre-gzipped JSON, and the site reads only from here — no Lambda in the way of a
// page load. `Cache-Control: no-cache` means a browser revalidates with its ETag on every
// load, so an edit is visible on the next navigation while an unchanged page costs a 304.
//
//   items/index.json      { generatedAt, items: [{ slug, title, rev, updatedAt, aircraft, school,
//                           maneuver?, stub?, generated? }] }
//   items/<slug>.json     { slug, rev, updatedAt, author, summary, item }
//   syllabi/index.json    { generatedAt, syllabi: [{ id, name, rev, updatedAt, aircraft, school }] }
//   syllabi/<id>.json     { id, name, rev, updatedAt, aircraft, school, doc }
//   figures/<slug>/<stamp>-<name>.webp

export async function putJson(key, value) {
  await getS3().send(new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
    Body: gzipSync(Buffer.from(JSON.stringify(value))),
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
    CacheControl: 'no-cache',
  }));
}

export async function deleteKey(key) {
  try {
    await getS3().send(new DeleteObjectCommand({ Bucket: CONFIG.bucket, Key: key }));
  } catch (error) {
    if (error.name !== 'NoSuchKey' && error.name !== 'NotFound') throw error;
  }
}

export const itemKey = (slug) => `items/${slug}.json`;
export const syllabusKey = (id) => `syllabi/${id}.json`;

export function itemRecord(meta, row) {
  return {
    slug: meta.slug,
    rev: row.rev,
    updatedAt: row.createdAt,
    author: row.author || '',
    summary: row.summary || '',
    item: JSON.parse(row.docJson),
  };
}

export function syllabusRecord(row) {
  const doc = JSON.parse(row.docJson);
  return {
    id: row.syllabusId,
    name: row.name,
    rev: row.rev,
    updatedAt: row.createdAt,
    aircraft: row.aircraft || doc.aircraft || '',
    school: row.school || doc.school || '',
    doc,
  };
}

// A syllabus as the list and the index show it.
export function syllabusEntry(row) {
  return {
    id: row.syllabusId,
    name: row.name,
    rev: row.rev,
    updatedAt: row.createdAt,
    aircraft: row.aircraft || '',
    school: row.school || '',
  };
}

export function indexEntry(meta) {
  return {
    slug: meta.slug,
    title: meta.title,
    rev: meta.latestRev,
    updatedAt: meta.updatedAt,
    ...(meta.flags || {}),
  };
}

export async function mirrorItem(meta, row) {
  await putJson(itemKey(meta.slug), itemRecord(meta, row));
}

export async function mirrorSyllabus(row) {
  await putJson(syllabusKey(row.syllabusId), syllabusRecord(row));
}

export async function rebuildItemsIndex() {
  const metas = (await listItemMetas()).filter((m) => !m.hidden);
  await putJson('items/index.json', {
    generatedAt: new Date().toISOString(),
    items: metas.map(indexEntry),
  });
  return metas.length;
}

export async function rebuildSyllabiIndex() {
  const rows = (await listSyllabi()).filter((r) => !r.hidden);
  await putJson('syllabi/index.json', {
    generatedAt: new Date().toISOString(),
    syllabi: rows.map(syllabusEntry),
  });
  return rows.length;
}

// Re-mirror every visible syllabus document. This is how syllabi published before the mirror
// existed first reach it.
export async function remirrorSyllabi() {
  const rows = (await listSyllabi()).filter((r) => !r.hidden);
  for (const r of rows) {
    const newest = await newestSyllabus(r.syllabusId);
    if (newest && !newest.hidden) await mirrorSyllabus(newest);
  }
  return rows.length;
}

// A presigned PUT for one figure. The key carries a timestamp so a replaced image never
// collides with a cached one. Only the content type is part of the signature, so the browser
// sends exactly `Content-Type: image/webp` and nothing else special.
export async function presignFigure(slug, name) {
  const key = `figures/${slug}/${Date.now().toString(36)}-${name}.webp`;
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
    ContentType: 'image/webp',
  });
  const uploadUrl = await presignPut(command, 300);
  return { key, uploadUrl, publicUrl: `${CONFIG.mirrorUrl}/${key}` };
}
