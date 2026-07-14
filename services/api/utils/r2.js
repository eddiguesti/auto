/**
 * Durable object storage facade.
 *
 * Cloudflare Workers use the native R2 binding. Long-running Node.js processes
 * use R2's S3-compatible API. Local disk is permitted only in development.
 */

import { createLogger } from './logger.js'

const logger = createLogger('r2')
const bucket = process.env.R2_BUCKET || 'easymemoir-uploads'
let s3Promise

function nativeBinding() {
  return globalThis.__CLOUDFLARE_BINDINGS__?.UPLOADS || null
}

function durableStorageRequired() {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_OBJECT_STORAGE === 'true'
}

async function getS3() {
  if (s3Promise) return s3Promise
  if (
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_ENDPOINT
  ) {
    return null
  }

  s3Promise = import('@aws-sdk/client-s3').then(
    ({ S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand }) => ({
      client: new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        },
        requestHandler: { requestTimeout: 30000 }
      }),
      PutObjectCommand,
      GetObjectCommand,
      DeleteObjectCommand
    })
  )
  return s3Promise
}

function unavailable() {
  if (durableStorageRequired()) {
    throw new Error('R2 object storage is required but not configured')
  }
  return false
}

export async function r2Upload(key, body, contentType) {
  const binding = nativeBinding()
  if (binding) {
    await binding.put(key, body, { httpMetadata: { contentType } })
    return true
  }

  const s3 = await getS3()
  if (!s3) return unavailable()

  try {
    await s3.client.send(
      new s3.PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
    )
    return true
  } catch (error) {
    logger.error('R2 upload failed', { key, error: error.message })
    if (durableStorageRequired()) throw error
    return false
  }
}

/** @returns {Promise<{body: unknown, contentType: string}|null>} */
export async function r2Get(key) {
  const binding = nativeBinding()
  if (binding) {
    const object = await binding.get(key)
    if (!object) return null
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || 'application/octet-stream'
    }
  }

  const s3 = await getS3()
  if (!s3) {
    unavailable()
    return null
  }

  try {
    const response = await s3.client.send(new s3.GetObjectCommand({ Bucket: bucket, Key: key }))
    return {
      body: response.Body,
      contentType: response.ContentType || 'application/octet-stream'
    }
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null
    logger.error('R2 get failed', { key, error: error.message })
    if (durableStorageRequired()) throw error
    return null
  }
}

export async function r2GetBuffer(key) {
  const object = await r2Get(key)
  if (!object) return null

  const { body } = object
  if (typeof body?.transformToByteArray === 'function') {
    return { ...object, body: Buffer.from(await body.transformToByteArray()) }
  }
  if (body && Symbol.asyncIterator in Object(body)) {
    const chunks = []
    for await (const chunk of body) chunks.push(Buffer.from(chunk))
    return { ...object, body: Buffer.concat(chunks) }
  }
  return { ...object, body: Buffer.from(await new Response(body).arrayBuffer()) }
}

export async function r2Delete(key) {
  const binding = nativeBinding()
  if (binding) {
    await binding.delete(key)
    return true
  }

  const s3 = await getS3()
  if (!s3) return unavailable()

  try {
    await s3.client.send(new s3.DeleteObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    logger.error('R2 delete failed', { key, error: error.message })
    if (durableStorageRequired()) throw error
    return false
  }
}

export function isR2Available() {
  return Boolean(
    nativeBinding() ||
    (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT)
  )
}
