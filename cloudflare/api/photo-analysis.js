import { PHOTO_ANALYSIS_PROMPT } from '../../packages/shared/photo-analysis-prompt.js'
import { ApiError } from './errors.js'

const SENSITIVE = [
  /(?:sk-|xai-|key-)[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/g,
  /SECURITY:.*?(?:system prompt|instructions)/gi,
  /process\.env\.[A-Z_]+/g,
  /-----BEGIN.*?KEY-----/g
]

export async function analyzePhoto(env, bytes, type) {
  if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Photo analysis not configured' })
  let binary = ''
  // Avoid spreading a large upload onto the JavaScript call stack.
  for (let offset = 0; offset < bytes.length; offset += 16384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384))
  let response
  try {
    const provider = env.XAI_FETCH || { fetch }
    response = await provider.fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROK_API_KEY}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        temperature: 0.6,
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PHOTO_ANALYSIS_PROMPT },
              { type: 'image_url', image_url: { url: `data:${type};base64,${btoa(binary)}` } }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(60000),
      redirect: 'manual'
    })
    if (!response.ok) throw new Error('Provider failure')
    // Bound the provider response too; never expose provider errors or secrets.
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 256 * 1024) {
        await reader.cancel()
        throw new Error('Provider response too large')
      }
      chunks.push(value)
    }
    const content = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      content.set(chunk, offset)
      offset += chunk.length
    }
    const envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content))
    let text = envelope.choices?.[0]?.message?.content
    if (typeof text !== 'string') throw new Error('Missing provider content')
    for (const pattern of SENSITIVE) text = text.replace(pattern, '[redacted]')
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match && JSON.parse(match[0])
    // Never claim that a failed/malformed analysis described a personal photo.
    if (
      !parsed ||
      typeof parsed.description !== 'string' ||
      !parsed.description.trim() ||
      !Array.isArray(parsed.questions) ||
      !parsed.questions.length ||
      parsed.questions.some(value => typeof value !== 'string' || !value.trim())
    )
      throw new Error('Invalid provider analysis')
    return {
      description: parsed.description,
      era: typeof parsed.era === 'string' && parsed.era ? parsed.era : 'unknown',
      people_count:
        Number.isInteger(parsed.people_count) && parsed.people_count >= 0 ? parsed.people_count : 0,
      setting: typeof parsed.setting === 'string' && parsed.setting ? parsed.setting : 'unknown',
      questions: parsed.questions.slice(0, 5)
    }
  } catch {
    throw new ApiError(502, { error: 'Photo analysis temporarily unavailable' })
  }
}
