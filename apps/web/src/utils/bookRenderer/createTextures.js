import * as THREE from 'three'
import { TEX_W, TEX_H } from './constants.js'
import { renderPageContent } from './pageRenderers.js'

/* ─── Canvas / texture helpers ─── */

function drawPaperNoise(ctx, w, h, level) {
  const img = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * level
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  return { canvas: c, ctx: c.getContext('2d') }
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

function drawDarkLeatherBg(ctx, noise) {
  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  g.addColorStop(0, '#1a1510')
  g.addColorStop(0.5, '#231f2c')
  g.addColorStop(1, '#1a1510')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, noise)
}

/* ═══════════════════════════════════════
   Front cover
   ═══════════════════════════════════════ */

function drawCoverDecorations(ctx) {
  const rg = ctx.createRadialGradient(
    TEX_W * 0.4,
    TEX_H * 0.35,
    0,
    TEX_W * 0.4,
    TEX_H * 0.35,
    TEX_W * 0.7
  )
  rg.addColorStop(0, 'rgba(255,255,255,0.06)')
  rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  const eg = ctx.createLinearGradient(0, 0, TEX_W * 0.05, 0)
  eg.addColorStop(0, 'rgba(0,0,0,0.3)')
  eg.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  eg.addColorStop(0.6, 'rgba(255,255,255,0.15)')
  eg.addColorStop(1, 'transparent')
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, TEX_W * 0.06, TEX_H)

  ctx.strokeStyle = 'rgba(212,165,116,0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(36, 36, TEX_W - 72, TEX_H - 72)
  ctx.strokeStyle = 'rgba(212,165,116,0.08)'
  ctx.lineWidth = 1
  ctx.strokeRect(44, 44, TEX_W - 88, TEX_H - 88)

  ctx.beginPath()
  ctx.arc(TEX_W / 2, TEX_H * 0.32, 40, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,165,116,0.2)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(TEX_W / 2, TEX_H * 0.32, 22, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,165,116,0.12)'
  ctx.stroke()

  ctx.fillStyle = 'rgba(212,165,116,0.25)'
  ctx.fillRect(TEX_W * 0.3, TEX_H * 0.39, TEX_W * 0.4, 1)
}

function drawCoverTitleText(ctx, text) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `500 ${Math.min(72, TEX_W * 0.07)}px Boska, "Playfair Display", Georgia, serif`

  const tg = ctx.createLinearGradient(0, TEX_H * 0.42, 0, TEX_H * 0.52)
  tg.addColorStop(0, '#cfc09f')
  tg.addColorStop(0.3, '#ffecb3')
  tg.addColorStop(0.6, '#cfc09f')
  tg.addColorStop(1, '#8a6d3b')
  ctx.fillStyle = tg
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3

  const titleWords = text.split(' ')
  const lines = []
  let line = ''
  for (const w of titleWords) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > TEX_W * 0.7 && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)

  const startY = TEX_H * 0.46 - (lines.length - 1) * 40
  lines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, startY + i * 80))

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  return { startY, lineCount: lines.length }
}

function drawCoverMeta(ctx, startY, lineCount, subtitle, author) {
  ctx.fillStyle = 'rgba(212,165,116,0.25)'
  ctx.fillRect(TEX_W * 0.3, startY + lineCount * 80 - 25, TEX_W * 0.4, 1)

  if (subtitle) {
    ctx.font = 'italic 28px Lora, Georgia, serif'
    ctx.fillStyle = 'rgba(212,165,116,0.6)'
    ctx.fillText(subtitle, TEX_W / 2, startY + lineCount * 80 + 15)
  }

  ctx.font = '500 30px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 6
  ctx.fillText(author || '', TEX_W / 2, startY + lineCount * 80 + 60)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  ctx.font = '11px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(212,165,116,0.2)'
  ctx.letterSpacing = '0.1em'
  ctx.fillText(String(new Date().getFullYear()), TEX_W / 2, TEX_H - 50)
}

export function createCoverTexture(text, subtitle, opts = {}) {
  const { canvas, ctx } = makeCanvas()
  drawDarkLeatherBg(ctx, 14)
  drawCoverDecorations(ctx)
  const { startY, lineCount } = drawCoverTitleText(ctx, text)
  drawCoverMeta(ctx, startY, lineCount, subtitle, opts.author)
  return toTexture(canvas)
}

/* ═══════════════════════════════════════
   Back cover
   ═══════════════════════════════════════ */

function drawBackCoverDecorations(ctx) {
  const rg = ctx.createRadialGradient(
    TEX_W * 0.5,
    TEX_H * 0.4,
    0,
    TEX_W * 0.5,
    TEX_H * 0.4,
    TEX_W * 0.6
  )
  rg.addColorStop(0, 'rgba(255,255,255,0.04)')
  rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  const eg = ctx.createLinearGradient(TEX_W * 0.95, 0, TEX_W, 0)
  eg.addColorStop(0, 'transparent')
  eg.addColorStop(0.4, 'rgba(255,255,255,0.15)')
  eg.addColorStop(0.7, 'rgba(255,255,255,0.35)')
  eg.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = eg
  ctx.fillRect(TEX_W * 0.94, 0, TEX_W * 0.06, TEX_H)

  ctx.strokeStyle = 'rgba(212,165,116,0.12)'
  ctx.lineWidth = 1
  ctx.strokeRect(36, 36, TEX_W - 72, TEX_H - 72)
}

function drawBackCoverContent(ctx, storyCount, chapterCount) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.beginPath()
  ctx.moveTo(TEX_W / 2, TEX_H * 0.38 - 20)
  ctx.quadraticCurveTo(TEX_W / 2 + 25, TEX_H * 0.38, TEX_W / 2, TEX_H * 0.38 + 20)
  ctx.quadraticCurveTo(TEX_W / 2 - 25, TEX_H * 0.38, TEX_W / 2, TEX_H * 0.38 - 20)
  ctx.strokeStyle = 'rgba(212,165,116,0.3)'
  ctx.stroke()

  ctx.font = '400 46px Boska, "Playfair Display", Georgia, serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText('The End', TEX_W / 2, TEX_H * 0.44)

  ctx.fillStyle = 'rgba(212,165,116,0.3)'
  ctx.fillRect(TEX_W * 0.35, TEX_H * 0.48, TEX_W * 0.3, 1)

  ctx.font = '18px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  const chLabel = `${chapterCount} chapter${chapterCount !== 1 ? 's' : ''}`
  const stLabel = `${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`
  ctx.fillText(`${chLabel} \u00b7 ${stLabel}`, TEX_W / 2, TEX_H * 0.52)

  ctx.font = 'italic 22px Lora, Georgia, serif'
  ctx.fillStyle = 'rgba(212,165,116,0.45)'
  ctx.fillText('A life beautifully told', TEX_W / 2, TEX_H * 0.56)

  ctx.beginPath()
  ctx.arc(TEX_W / 2 - 40, TEX_H * 0.66, 4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(212,165,116,0.4)'
  ctx.fill()
  ctx.font = '14px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('Easy Memoir', TEX_W / 2 + 5, TEX_H * 0.66)
}

export function createBackCoverTexture(storyCount, chapterCount) {
  const { canvas, ctx } = makeCanvas()
  drawDarkLeatherBg(ctx, 14)
  drawBackCoverDecorations(ctx)
  drawBackCoverContent(ctx, storyCount, chapterCount)
  return toTexture(canvas)
}

/* ═══════════════════════════════════════
   Interior page texture
   ═══════════════════════════════════════ */

function drawPageBackground(ctx) {
  ctx.fillStyle = '#f7f3ec'
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, 4)

  ctx.fillStyle = 'rgba(0,0,0,0.008)'
  for (let y = 0; y < TEX_H; y += 4) {
    ctx.fillRect(0, y, TEX_W, 1)
  }

  const gs = ctx.createLinearGradient(0, 0, TEX_W * 0.06, 0)
  gs.addColorStop(0, 'rgba(0,0,0,0.06)')
  gs.addColorStop(1, 'transparent')
  ctx.fillStyle = gs
  ctx.fillRect(0, 0, TEX_W * 0.06, TEX_H)
}

export function createPageTexture(content) {
  const { canvas, ctx } = makeCanvas()
  drawPageBackground(ctx)

  const pad = TEX_W * 0.08
  const maxW = TEX_W - pad * 2
  const curY = pad * 1.2

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  renderPageContent(ctx, content, pad, maxW, curY)

  return toTexture(canvas)
}

export function createEmptyTexture(bg) {
  const { canvas, ctx } = makeCanvas()
  ctx.fillStyle = bg || '#f7f3ec'
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, bg ? 14 : 4)
  return toTexture(canvas)
}
