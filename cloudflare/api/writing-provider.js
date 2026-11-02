import { ApiError } from './errors.js'

const MAX_RESPONSE_BYTES = 1024 * 1024
const MAX_TEXT_INPUT = 300000

// Fixed provider origin and a trusted service binding keep credentials out of
// arbitrary URLs. No automatic retry: an ambiguous provider failure may bill.
export async function grokWriting(env, { messages, maxTokens = 4096, temperature = 0.6, signal }) {
  if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Writing assistant not configured' })
  if (!Array.isArray(messages) || !messages.length || messages.length > 102)
    throw new ApiError(400, { error: 'Invalid writing conversation' })
  let textSize = 0
  const input = messages.map(message => {
    if (!['system', 'user', 'assistant'].includes(message.role))
      throw new ApiError(400, { error: 'Invalid conversation role' })
    if (typeof message.content === 'string') {
      textSize += message.content.length
      return { role: message.role, content: message.content }
    }
    // Multimodal input is constructed by the server's validated photo route.
    if (message.role !== 'user' || !Array.isArray(message.content) || message.content.length > 3)
      throw new ApiError(400, { error: 'Invalid writing input' })
    for (const part of message.content) {
      if (part.type === 'input_text' && typeof part.text === 'string') textSize += part.text.length
      else if (
        part.type !== 'input_image' ||
        typeof part.image_url !== 'string' ||
        !/^data:image\/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(part.image_url) ||
        part.image_url.length > 14 * 1024 * 1024
      )
        throw new ApiError(400, { error: 'Invalid writing image' })
    }
    return { role: message.role, content: message.content }
  })
  if (textSize > MAX_TEXT_INPUT)
    throw new ApiError(413, {
      error: 'This passage is too long for one writing request. Split it into smaller sections.'
    })
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 32000)
    throw new TypeError('Invalid output token budget')
  try {
    const provider = env.XAI_FETCH || { fetch }
    const response = await provider.fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROK_API_KEY}` },
      body: JSON.stringify({
        model: env.GROK_MODEL || 'grok-4.7',
        input,
        max_output_tokens: maxTokens,
        temperature,
        store: false,
        stream: false
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
        : AbortSignal.timeout(60000),
      redirect: 'manual'
    })
    if (!response.ok || !response.body) throw new Error('Provider failure')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new Error('Provider response too large')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (result.status !== 'completed' || result.error || !Array.isArray(result.output))
      throw new Error('Incomplete provider response')
    const parts = result.output
      .filter(item => item.type === 'message' && item.role === 'assistant')
      .flatMap(item => item.content || [])
    if (parts.some(part => part.type !== 'output_text' || typeof part.text !== 'string'))
      throw new Error('Provider refused or returned invalid content')
    let text = parts
      .map(part => part.text)
      .join('\n')
      .trim()
    if (!text || text.length > 100000) throw new Error('Invalid provider text')
    text = text.split(env.GROK_API_KEY).join('[redacted]')
    for (const pattern of [
      /(?:sk-|xai-|key-)[a-zA-Z0-9]{20,}/g,
      /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
      /process\.env\.[A-Z_]+/g,
      /-----BEGIN.*?KEY-----/g
    ])
      text = text.replace(pattern, '[redacted]')
    return text
  } catch {
    throw new ApiError(502, {
      error: 'Writing assistant temporarily unavailable. Your saved text has not changed.',
      code: 'WRITING_PROVIDER_FAILED'
    })
  }
}

export async function reserveWritingRate(db, userId, now) {
  const seconds = Math.floor(now / 1000)
  const row = await db
    .prepare(
      `INSERT INTO auth_rate_limits (subject_hash, window_started_at, attempts)
    VALUES (?, ?, 1) ON CONFLICT (subject_hash) DO UPDATE SET
    window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? - 60 THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END,
    attempts = CASE WHEN auth_rate_limits.window_started_at <= ? - 60 THEN 1 ELSE auth_rate_limits.attempts + 1 END
    RETURNING attempts, window_started_at`
    )
    .bind(`writing:${userId}`, seconds, seconds, seconds)
    .first()
  if (row.attempts > 10)
    throw new ApiError(429, {
      error: 'Too many writing requests. Please try again shortly.',
      retryAfter: Math.max(1, row.window_started_at + 60 - seconds)
    })
}
