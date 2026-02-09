/**
 * Cloudflare R2 storage client (S3-compatible).
 * If R2 credentials aren't set, falls back to local file storage.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { createLogger } from './logger.js'

const logger = createLogger('r2')

let s3 = null
const bucket = process.env.R2_BUCKET || 'easymemoir-uploads'

if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    requestHandler: {
      requestTimeout: 30000
    }
  })
  logger.info('R2 storage configured', { bucket })
} else {
  logger.warn('R2 not configured — file uploads will use local storage')
}

/**
 * Upload a file to R2
 * @param {string} key - The filename/key in the bucket
 * @param {Buffer} body - The file content
 * @param {string} contentType - MIME type
 * @returns {boolean} true if uploaded to R2, false if R2 unavailable
 */
export async function r2Upload(key, body, contentType) {
  if (!s3) return false
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    )
    return true
  } catch (err) {
    logger.error('R2 upload failed', { key, error: err.message })
    return false
  }
}

/**
 * Get a file from R2 as a readable stream
 * @param {string} key - The filename/key in the bucket
 * @returns {object|null} { body: ReadableStream, contentType: string } or null
 */
export async function r2Get(key) {
  if (!s3) return null
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    )
    return {
      body: response.Body,
      contentType: response.ContentType
    }
  } catch (err) {
    if (err.name === 'NoSuchKey') return null
    logger.error('R2 get failed', { key, error: err.message })
    return null
  }
}

/**
 * Delete a file from R2
 * @param {string} key - The filename/key in the bucket
 * @returns {boolean}
 */
export async function r2Delete(key) {
  if (!s3) return false
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    )
    return true
  } catch (err) {
    logger.error('R2 delete failed', { key, error: err.message })
    return false
  }
}

export function isR2Available() {
  return s3 !== null
}
