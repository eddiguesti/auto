#!/usr/bin/env node

import 'dotenv/config'
import { readdir, readFile, stat } from 'fs/promises'
import { extname, join, relative, resolve } from 'path'
import pg from 'pg'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const apply = process.argv.includes('--apply')
const root = resolve(import.meta.dirname, '../..')
const required = ['DATABASE_URL', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
const missing = required.filter(name => !process.env[name])
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)

const bucket = process.env.R2_BUCKET || 'easymemoir-uploads'
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
})
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })

const contentTypes = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.webp': 'image/webp'
}

async function put(key, body, contentType) {
  console.log(`${apply ? 'UPLOAD' : 'DRY-RUN'} ${key}`)
  if (!apply) return
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  )
}

async function filesUnder(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) files.push(...(await filesUnder(path)))
      else if (entry.isFile()) files.push(path)
    }
    return files
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function migrateDirectory(directory, keyForPath) {
  for (const path of await filesUnder(directory)) {
    const info = await stat(path)
    if (info.size === 0) continue
    const key = keyForPath(path)
    await put(
      key,
      await readFile(path),
      contentTypes[extname(path).toLowerCase()] || 'application/octet-stream'
    )
  }
}

async function migrateLegacyChapterImages() {
  const result = await pool.query(
    `SELECT user_id, chapter_id, image_url
     FROM chapter_images
     WHERE generation_status = 'completed' AND image_url LIKE 'http%'`
  )
  for (const row of result.rows) {
    const response = await fetch(row.image_url)
    if (!response.ok) {
      console.warn(`SKIP expired chapter image user=${row.user_id} chapter=${row.chapter_id}`)
      continue
    }
    const key = `chapter-images/${row.user_id}/${row.chapter_id}.webp`
    await put(
      key,
      Buffer.from(await response.arrayBuffer()),
      response.headers.get('content-type') || 'image/webp'
    )
    if (apply) {
      await pool.query(
        `UPDATE chapter_images SET image_url = $1, updated_at = NOW()
         WHERE user_id = $2 AND chapter_id = $3`,
        [
          `/api/v1/chapter-images/file/${encodeURIComponent(row.chapter_id)}`,
          row.user_id,
          row.chapter_id
        ]
      )
    }
  }
}

try {
  const uploads = join(root, 'uploads')
  await migrateDirectory(uploads, path => relative(uploads, path).replaceAll('\\', '/'))

  const blogImages = join(root, 'apps/web/public/blog-images')
  await migrateDirectory(
    blogImages,
    path => `blog-images/${relative(blogImages, path).replaceAll('\\', '/')}`
  )
  await migrateLegacyChapterImages()
  console.log(
    apply ? 'Media migration complete.' : 'Dry run complete. Re-run with --apply to write.'
  )
} finally {
  await pool.end()
}
