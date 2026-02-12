import { useState, useEffect, useRef, useCallback, memo } from 'react'
import * as THREE from 'three'
import { useAuth } from '../context/AuthContext'
import { chapters } from '../data/chapters'

/* ─── helpers ─── */
function esc(s) {
  return String(s || '')
}
function dropCap(t) {
  if (!t) return { l: '', r: '' }
  const c = t.replace(/^["'\s]+/, '')
  return { l: c.charAt(0).toUpperCase(), r: c.slice(1) }
}
function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}
function wrap(ctx, text, x, y, maxW, lineH) {
  const words = text.split(/\s+/)
  let line = '',
    curY = y
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY)
      curY += lineH
      line = w
    } else line = test
  }
  if (line) {
    ctx.fillText(line, x, curY)
    curY += lineH
  }
  return curY
}

/* ─── Constants ─── */
const PAGE_W = 1.28
const PAGE_H = 1.71
const SEGMENTS = 30
const STACK_GAP = 0.001
const FLIP_DURATION = 700
const COVER_FLIP_DURATION = 900
const TEX_W = 1536
const TEX_H = 2048

/* ─── GLSL Shaders ─── */
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`
const fragmentShader = `
  uniform sampler2D uFrontTex;
  uniform sampler2D uBackTex;
  uniform float uIsCover;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 N = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 albedo = gl_FrontFacing
      ? texture2D(uFrontTex, vUv).rgb
      : texture2D(uBackTex, uv).rgb;
    albedo = pow(albedo, vec3(2.2));
    vec3 L1 = normalize(vec3(0.5, 0.8, 0.6));
    float diff1 = max(dot(N, L1), 0.0) * 0.65;
    vec3 L2 = normalize(vec3(-0.5, 0.5, 0.4));
    float diff2 = max(dot(N, L2), 0.0) * 0.3;
    vec3 L3 = normalize(vec3(0.0, 0.3, -1.0));
    float diff3 = max(dot(N, L3), 0.0) * 0.15;
    vec3 ambient = vec3(0.28);
    vec3 H = normalize(L1 + V);
    float shininess = uIsCover > 0.5 ? 80.0 : 8.0;
    float specStrength = uIsCover > 0.5 ? 0.25 : 0.04;
    float spec = pow(max(dot(N, H), 0.0), shininess) * specStrength;
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 color = albedo * (ambient + vec3(1.0, 0.97, 0.92) * diff1 + vec3(0.85, 0.9, 1.0) * diff2 + vec3(1.0) * diff3);
    color += vec3(1.0, 0.98, 0.95) * spec;
    color += vec3(0.04) * fresnel;
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`

/* ─── Texture generators ─── */
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

function createCoverTexture(text, subtitle, opts = {}) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d')

  // Dark leather background
  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  g.addColorStop(0, '#1a1510')
  g.addColorStop(0.5, '#231f2c')
  g.addColorStop(1, '#1a1510')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, 14)

  // Cover image if provided
  if (opts.coverImage) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.drawImage(opts.coverImage, 0, 0, TEX_W, TEX_H)
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, TEX_W, TEX_H)
  }

  // Subtle radial highlight
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

  // Emboss edge
  const eg = ctx.createLinearGradient(0, 0, TEX_W * 0.05, 0)
  eg.addColorStop(0, 'rgba(0,0,0,0.3)')
  eg.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  eg.addColorStop(0.6, 'rgba(255,255,255,0.15)')
  eg.addColorStop(1, 'transparent')
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, TEX_W * 0.06, TEX_H)

  // Gold border
  ctx.strokeStyle = 'rgba(212,165,116,0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(36, 36, TEX_W - 72, TEX_H - 72)
  ctx.strokeStyle = 'rgba(212,165,116,0.08)'
  ctx.lineWidth = 1
  ctx.strokeRect(44, 44, TEX_W - 88, TEX_H - 88)

  // Ornament circle
  ctx.beginPath()
  ctx.arc(TEX_W / 2, TEX_H * 0.32, 40, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,165,116,0.2)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(TEX_W / 2, TEX_H * 0.32, 22, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,165,116,0.12)'
  ctx.stroke()

  // Rule line
  ctx.fillStyle = 'rgba(212,165,116,0.25)'
  ctx.fillRect(TEX_W * 0.3, TEX_H * 0.39, TEX_W * 0.4, 1)

  // Title (gold gradient text)
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

  // Word wrap title
  const titleWords = text.split(' ')
  let lines = [],
    line = ''
  for (const w of titleWords) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > TEX_W * 0.7 && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  const startY = TEX_H * 0.46 - (lines.length - 1) * 40
  lines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, startY + i * 80))

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Rule after title
  ctx.fillStyle = 'rgba(212,165,116,0.25)'
  ctx.fillRect(TEX_W * 0.3, startY + lines.length * 80 - 25, TEX_W * 0.4, 1)

  // Subtitle
  if (subtitle) {
    ctx.font = 'italic 28px Lora, Georgia, serif'
    ctx.fillStyle = 'rgba(212,165,116,0.6)'
    ctx.fillText(subtitle, TEX_W / 2, startY + lines.length * 80 + 15)
  }

  // Author
  ctx.font = '500 30px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 6
  ctx.fillText(opts.author || '', TEX_W / 2, startY + lines.length * 80 + 60)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Year at bottom
  ctx.font = '11px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(212,165,116,0.2)'
  ctx.letterSpacing = '0.1em'
  ctx.fillText(String(new Date().getFullYear()), TEX_W / 2, TEX_H - 50)

  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

function createBackCoverTexture(storyCount, chapterCount) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  g.addColorStop(0, '#1a1510')
  g.addColorStop(0.5, '#231f2c')
  g.addColorStop(1, '#1a1510')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, 14)

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

  // Emboss right edge
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

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Ornament
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
  ctx.fillText(
    `${chapterCount} chapter${chapterCount !== 1 ? 's' : ''} \u00b7 ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`,
    TEX_W / 2,
    TEX_H * 0.52
  )

  ctx.font = 'italic 22px Lora, Georgia, serif'
  ctx.fillStyle = 'rgba(212,165,116,0.45)'
  ctx.fillText('A life beautifully told', TEX_W / 2, TEX_H * 0.56)

  // Logo at bottom
  ctx.beginPath()
  ctx.arc(TEX_W / 2 - 40, TEX_H * 0.66, 4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(212,165,116,0.4)'
  ctx.fill()
  ctx.font = '14px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('Easy Memoir', TEX_W / 2 + 5, TEX_H * 0.66)

  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

function createPageTexture(content) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d')

  // Paper background
  ctx.fillStyle = '#f7f3ec'
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  drawPaperNoise(ctx, TEX_W, TEX_H, 4)

  // Subtle line texture
  ctx.fillStyle = 'rgba(0,0,0,0.008)'
  for (let y = 0; y < TEX_H; y += 4) ctx.fillRect(0, y, TEX_W, 1)

  // Gutter shadow on left
  const gs = ctx.createLinearGradient(0, 0, TEX_W * 0.06, 0)
  gs.addColorStop(0, 'rgba(0,0,0,0.06)')
  gs.addColorStop(1, 'transparent')
  ctx.fillStyle = gs
  ctx.fillRect(0, 0, TEX_W * 0.06, TEX_H)

  const pad = TEX_W * 0.08
  const maxW = TEX_W - pad * 2
  let curY = pad * 1.2

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  if (content.type === 'title') {
    ctx.textAlign = 'center'
    // Ornament
    ctx.beginPath()
    ctx.moveTo(TEX_W / 2, curY)
    curY += 10
    ctx.quadraticCurveTo(TEX_W / 2 + 18, curY + 14, TEX_W / 2, curY + 28)
    ctx.quadraticCurveTo(TEX_W / 2 - 18, curY + 14, TEX_W / 2, curY)
    ctx.strokeStyle = 'rgba(139,115,85,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
    curY += 55

    ctx.font = `500 ${TEX_W * 0.055}px Boska, "Playfair Display", Georgia, serif`
    ctx.fillStyle = '#2d2418'
    wrap(ctx, content.title, TEX_W / 2, curY, maxW, TEX_W * 0.065)
    curY += content.title.length > 30 ? 130 : 75

    ctx.fillStyle = 'rgba(139,115,85,0.35)'
    ctx.fillRect(TEX_W * 0.4, curY, TEX_W * 0.2, 1)
    curY += 20

    ctx.font = 'italic 26px Lora, Georgia, serif'
    ctx.fillStyle = '#8B7355'
    ctx.fillText('A Memoir', TEX_W / 2, curY)
    curY += 40

    ctx.font = 'italic 20px Lora, Georgia, serif'
    ctx.fillStyle = 'rgba(139,115,85,0.45)'
    ctx.fillText('A collection of memories, moments,', TEX_W / 2, curY)
    curY += 28
    ctx.fillText('and the stories that shaped a life', TEX_W / 2, curY)
    curY += 80

    ctx.font = '500 24px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = '#4a3f35'
    ctx.fillText('by ' + (content.author || ''), TEX_W / 2, curY)
    curY += 35
    ctx.font = '16px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(139,115,85,0.35)'
    ctx.fillText('Written with love for future generations', TEX_W / 2, curY)
  } else if (content.type === 'dedication') {
    ctx.textAlign = 'center'
    ctx.font = '500 14px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(139,115,85,0.5)'
    ctx.letterSpacing = '3px'
    ctx.fillText('DEDICATION', TEX_W / 2, TEX_H * 0.35)
    curY = TEX_H * 0.42

    ctx.font = 'italic 30px Boska, "Playfair Display", Georgia, serif'
    ctx.fillStyle = '#2d2418'
    const dedLines = [
      '\u201CFor my children and grandchildren,',
      'so they may know who I was,',
      'where I came from,',
      'and how much I loved them.\u201D'
    ]
    dedLines.forEach(l => {
      ctx.fillText(l, TEX_W / 2, curY)
      curY += 48
    })
  } else if (content.type === 'toc') {
    ctx.font = '500 40px Boska, "Playfair Display", Georgia, serif'
    ctx.fillStyle = '#2d2418'
    ctx.textAlign = 'center'
    ctx.fillText('Contents', TEX_W / 2, curY + 10)
    curY += 55
    ctx.fillStyle = 'rgba(139,115,85,0.35)'
    ctx.fillRect(TEX_W * 0.42, curY, TEX_W * 0.16, 1)
    curY += 30

    ctx.textAlign = 'left'
    ;(content.chapters || []).forEach(ch => {
      ctx.font = '600 14px "General Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(139,115,85,0.5)'
      ctx.fillText(ch.icon, pad, curY)

      ctx.font = '500 20px Lora, Georgia, serif'
      ctx.fillStyle = '#2d2418'
      ctx.fillText(ch.title, pad + 45, curY)

      // Dotted leader
      ctx.fillStyle = 'rgba(139,115,85,0.18)'
      const titleW = ctx.measureText(ch.title).width
      for (let dx = pad + 50 + titleW; dx < TEX_W - pad - 40; dx += 8) {
        ctx.fillRect(dx, curY + 6, 2, 2)
      }

      ctx.font = '14px "General Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(139,115,85,0.4)'
      ctx.textAlign = 'right'
      ctx.fillText(String(ch.count), TEX_W - pad, curY)
      ctx.textAlign = 'left'

      curY += 38
    })
  } else if (content.type === 'chapter') {
    ctx.textAlign = 'center'
    // Ornament circles
    ctx.beginPath()
    ctx.arc(TEX_W / 2, TEX_H * 0.32, 55, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(139,115,85,0.15)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(TEX_W / 2, TEX_H * 0.32, 30, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(139,115,85,0.1)'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(TEX_W / 2, TEX_H * 0.32, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(139,115,85,0.2)'
    ctx.fill()

    ctx.font = '500 14px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(139,115,85,0.5)'
    ctx.fillText('CHAPTER ' + (content.icon || ''), TEX_W / 2, TEX_H * 0.42)

    ctx.font = `500 ${TEX_W * 0.05}px Boska, "Playfair Display", Georgia, serif`
    ctx.fillStyle = '#2d2418'
    ctx.fillText(content.title || '', TEX_W / 2, TEX_H * 0.48)

    if (content.subtitle) {
      ctx.font = 'italic 22px Lora, Georgia, serif'
      ctx.fillStyle = 'rgba(139,115,85,0.5)'
      ctx.fillText(content.subtitle, TEX_W / 2, TEX_H * 0.53)
    }

    ctx.fillStyle = 'rgba(139,115,85,0.3)'
    ctx.fillRect(TEX_W * 0.35, TEX_H * 0.57, TEX_W * 0.3, 1)
  } else if (content.type === 'story') {
    // Question title
    ctx.font = `500 ${TEX_W * 0.032}px Boska, "Playfair Display", Georgia, serif`
    ctx.fillStyle = '#2d2418'
    curY = wrap(ctx, content.question || '', pad, curY, maxW, TEX_W * 0.038)

    // Date
    if (content.date) {
      ctx.font = '14px "General Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(139,115,85,0.4)'
      ctx.fillText(content.date, pad, curY + 2)
      curY += 22
    }

    // Rule
    ctx.fillStyle = 'rgba(139,115,85,0.12)'
    ctx.fillRect(pad, curY + 3, maxW, 1)
    curY += 18

    // Story body with drop cap
    const { l, r } =
      content.isFirst !== false ? dropCap(content.text || '') : { l: '', r: content.text || '' }
    ctx.font = '18px Lora, Georgia, serif'
    ctx.fillStyle = '#3d352c'

    if (l && content.isFirst !== false) {
      // Drop cap
      ctx.font = `500 78px Boska, "Playfair Display", Georgia, serif`
      ctx.fillStyle = '#8B7355'
      ctx.fillText(l, pad, curY + 60)
      const dcW = ctx.measureText(l).width + 12

      // First few lines wrap around drop cap
      ctx.font = '18px Lora, Georgia, serif'
      ctx.fillStyle = '#3d352c'
      const restWords = r.split(/\s+/)
      let dcLine = '',
        dcY = curY
      const dcMaxLines = 4
      let dcLines = 0
      for (let wi = 0; wi < restWords.length; wi++) {
        const w = restWords[wi]
        const test = dcLine ? dcLine + ' ' + w : w
        const lineMaxW = dcLines < dcMaxLines ? maxW - dcW : maxW
        const lineX = dcLines < dcMaxLines ? pad + dcW : pad
        if (ctx.measureText(test).width > lineMaxW && dcLine) {
          ctx.fillText(dcLine, lineX, dcY)
          dcY += 30
          dcLines++
          dcLine = w
        } else dcLine = test
      }
      if (dcLine) {
        const lineX = dcLines < dcMaxLines ? pad + dcW : pad
        ctx.fillText(dcLine, lineX, dcY)
        dcY += 30
      }
      curY = Math.max(dcY, curY + 75)
    } else {
      curY = wrap(ctx, content.text || '', pad, curY, maxW, 30)
    }

    // Page number
    if (content.pageNum) {
      ctx.font = '13px "General Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(139,115,85,0.25)'
      ctx.textAlign = 'center'
      ctx.fillText(String(content.pageNum), TEX_W / 2, TEX_H - 40)
    }
  } else if (content.type === 'continuation') {
    ctx.font = '13px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(139,115,85,0.5)'
    ctx.fillText(`${content.question} (continued)`, pad, curY)
    curY += 25

    ctx.font = '18px Lora, Georgia, serif'
    ctx.fillStyle = '#3d352c'
    curY = wrap(ctx, content.text || '', pad, curY, maxW, 30)

    if (content.pageNum) {
      ctx.font = '13px "General Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(139,115,85,0.25)'
      ctx.textAlign = 'center'
      ctx.fillText(String(content.pageNum), TEX_W / 2, TEX_H - 40)
    }
  } else if (content.type === 'blank') {
    ctx.textAlign = 'center'
    ctx.font = 'italic 18px Lora, Georgia, serif'
    ctx.fillStyle = 'rgba(139,115,85,0.3)'
    ctx.fillText('This page intentionally left blank', TEX_W / 2, TEX_H / 2)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

function createEmptyTexture(bg) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg || '#f7f3ec'
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  if (bg) drawPaperNoise(ctx, TEX_W, TEX_H, 14)
  else drawPaperNoise(ctx, TEX_W, TEX_H, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

/* ═══════════════════════════════════════
   Build page content definitions from user data
   ═══════════════════════════════════════ */
function buildPageContents(stories, cover, userName) {
  const title = cover?.title || `${userName?.split(' ')[0] || 'My'}'s Life Story`
  const author = cover?.author || userName || ''
  const pages = []

  // Title page
  pages.push({ type: 'title', title, author })
  // Dedication
  pages.push({ type: 'dedication' })

  // TOC
  const usedChapters = chapters.filter(ch => stories.some(s => s.chapter_id === ch.id))
  if (usedChapters.length) {
    pages.push({
      type: 'toc',
      chapters: usedChapters.map(ch => ({
        icon: ch.icon,
        title: ch.title,
        count: stories.filter(s => s.chapter_id === ch.id).length
      }))
    })
  }

  // Chapters + stories
  let lastCh = null,
    pNum = 1
  stories.forEach(s => {
    const ch = chapters.find(c => c.id === s.chapter_id)
    const q = ch?.questions?.find(x => x.id === s.question_id) || ch?.questions?.[s.question_id]

    if (s.chapter_id !== lastCh) {
      lastCh = s.chapter_id
      pages.push({ type: 'chapter', icon: ch?.icon, title: ch?.title, subtitle: ch?.subtitle })
    }

    const txt = s.answer || ''
    const qT = q?.question || ''
    const dt = fmtDate(s.updated_at || s.created_at)
    const lim = 600

    if (txt.length <= lim) {
      pages.push({
        type: 'story',
        question: qT,
        text: txt,
        date: dt,
        pageNum: pNum++,
        isFirst: true
      })
    } else {
      const words = txt.split(/\s+/),
        chunks = []
      let cur = ''
      for (const w of words) {
        if ((cur + ' ' + w).length > lim && cur) {
          chunks.push(cur.trim())
          cur = w
        } else cur = cur ? cur + ' ' + w : w
      }
      if (cur.trim()) chunks.push(cur.trim())
      chunks.forEach((t, pi) => {
        if (pi === 0)
          pages.push({
            type: 'story',
            question: qT,
            text: t,
            date: dt,
            pageNum: pNum++,
            isFirst: true
          })
        else pages.push({ type: 'continuation', question: qT, text: t, pageNum: pNum++ })
      })
    }
  })

  // Ensure enough pages for decent book feel
  if (pages.length < 4) {
    pages.push({
      type: 'story',
      question: 'Where did your story begin?',
      text: 'Every great memoir starts with a first memory...',
      pageNum: pNum++,
      isFirst: true
    })
    pages.push({
      type: 'story',
      question: 'What shaped who you are?',
      text: 'The moments, people, and places that made you who you are today...',
      pageNum: pNum++,
      isFirst: true
    })
  }

  return { title, author, pages }
}

/* ═══════════════════════════════════════
   Three.js book engine
   ═══════════════════════════════════════ */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function buildBook(
  container,
  pageContents,
  title,
  author,
  coverImageUrl,
  storyCount,
  chapterCount
) {
  const w = container.clientWidth
  const h = container.clientHeight
  if (!w || !h) return null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 0.35, 2.55)
  camera.lookAt(0, 0, 0)

  // Lighting
  scene.add(new THREE.AmbientLight(0x404050, 0.5))
  const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.5)
  keyLight.position.set(3, 5, 4)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.radius = 4
  keyLight.shadow.bias = -0.0005
  keyLight.shadow.normalBias = 0.02
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xd0e0ff, 1.0)
  fillLight.position.set(-3, 3, 2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.5)
  rimLight.position.set(0, 4, -4)
  scene.add(rimLight)

  const book = new THREE.Group()
  book.rotation.x = -0.08
  scene.add(book)

  // Build sheet definitions from page content
  // Each sheet has front + back. First sheet is front cover, last is back cover.
  const sheetDefs = []
  const allPages = pageContents

  // Handle cover image loading
  let coverImage = null
  const coverPromise = coverImageUrl
    ? new Promise(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          coverImage = img
          resolve()
        }
        img.onerror = () => resolve()
        img.src = coverImageUrl
      })
    : Promise.resolve()

  // We need pairs of pages for sheets:
  // Sheet 0: Front Cover (front) / first page content (back)
  // Sheet 1..N: page pairs
  // Sheet last: last page content (front) / Back Cover (back)

  function buildSheetDefs() {
    sheetDefs.length = 0

    // Ensure even number of interior pages
    const interiorPages = [...allPages]
    if (interiorPages.length % 2 !== 0) {
      interiorPages.push({ type: 'blank' })
    }

    // Front cover + first page back (endpaper)
    sheetDefs.push({
      frontTex: createCoverTexture(title, 'The Autobiography of', { author, coverImage }),
      backTex:
        interiorPages.length > 0 ? createPageTexture(interiorPages[0]) : createEmptyTexture(),
      hard: true
    })

    // Interior sheets (pairs of pages)
    for (let i = 1; i < interiorPages.length; i += 2) {
      const frontContent = interiorPages[i]
      const backContent = i + 1 < interiorPages.length ? interiorPages[i + 1] : { type: 'blank' }
      sheetDefs.push({
        frontTex: createPageTexture(frontContent),
        backTex: createPageTexture(backContent),
        hard: false
      })
    }

    // Back cover
    const lastInterior = interiorPages.length > 1 ? interiorPages[interiorPages.length - 1] : null
    // If we had an odd arrangement, add endpaper
    sheetDefs.push({
      frontTex: createEmptyTexture(),
      backTex: createBackCoverTexture(storyCount, chapterCount),
      hard: true
    })
  }

  const sheetMeshes = []
  const sheetState = []
  const currentView = 0
  let animating = false

  function buildMeshes() {
    // Clear old meshes
    sheetMeshes.forEach(m => book.remove(m))
    sheetMeshes.length = 0
    sheetState.length = 0

    sheetDefs.forEach((def, index) => {
      const geometry = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS, 1)
      const positions = geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        positions.array[i * 3] += PAGE_W / 2
      }
      positions.needsUpdate = true
      geometry.computeVertexNormals()

      const basePositions = new Float32Array(positions.array)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uFrontTex: { value: def.frontTex },
          uBackTex: { value: def.backTex },
          uIsCover: { value: def.hard ? 1.0 : 0.0 }
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      book.add(mesh)

      sheetMeshes.push(mesh)
      sheetState.push({ basePositions, hard: def.hard, turnProgress: 0 })
    })

    // Spine
    const spineDepth = sheetDefs.length * STACK_GAP + 0.03
    const spineGeometry = new THREE.BoxGeometry(0.04, PAGE_H, spineDepth)
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a2d0c,
      roughness: 0.5,
      metalness: 0.1
    })
    const spineMesh = new THREE.Mesh(spineGeometry, spineMaterial)
    spineMesh.position.set(-0.02, 0, spineDepth / 2 - 0.005)
    spineMesh.castShadow = true
    book.add(spineMesh)
    sheetMeshes.push(spineMesh) // track for cleanup

    // Ground shadow
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -PAGE_H / 2 - 0.1
    ground.receiveShadow = true
    scene.add(ground)

    sheetDefs.forEach((_, i) => deformSheet(i))
  }

  function deformSheet(index) {
    if (index >= sheetMeshes.length || !sheetState[index]) return
    const mesh = sheetMeshes[index]
    if (!mesh.geometry?.attributes?.position) return
    const state = sheetState[index]
    const positions = mesh.geometry.attributes.position
    const base = state.basePositions
    const progress = state.turnProgress

    for (let i = 0; i < positions.count; i++) {
      const bx = base[i * 3],
        by = base[i * 3 + 1]
      const t = bx / PAGE_W
      let nx, ny, nz

      if (state.hard) {
        const angle = progress * Math.PI
        nx = bx * Math.cos(angle)
        ny = by
        nz = bx * Math.sin(angle)
      } else {
        const stiffness = 0.4
        const localProgress = Math.max(
          0,
          Math.min(1, progress * (1 + stiffness) - (1 - t) * stiffness)
        )
        const angle = localProgress * Math.PI
        nx = bx * Math.cos(angle)
        ny = by
        nz = bx * Math.sin(angle)
        const curlIntensity = Math.sin(progress * Math.PI) * 0.08
        const edgeFactor = t * t
        nz += curlIntensity * edgeFactor
        ny += Math.sin(progress * Math.PI) * 0.015 * edgeFactor
      }

      const zOffset =
        progress < 0.5 ? (sheetDefs.length - 1 - index) * STACK_GAP : index * STACK_GAP
      nz += zOffset

      positions.array[i * 3] = nx
      positions.array[i * 3 + 1] = ny
      positions.array[i * 3 + 2] = nz
    }

    positions.needsUpdate = true
    mesh.geometry.computeVertexNormals()
  }

  function flipSheet(sheetIndex, forward, onDone) {
    if (animating) return
    if (!sheetState[sheetIndex]) return
    animating = true
    const isHard = sheetState[sheetIndex].hard
    const duration = isHard ? COVER_FLIP_DURATION : FLIP_DURATION
    // Use actual turnProgress instead of hardcoded values for robustness
    const startVal = sheetState[sheetIndex].turnProgress
    const endVal = forward ? 1 : 0
    const startTime = performance.now()

    function tick() {
      const elapsed = performance.now() - startTime
      let t = Math.min(elapsed / duration, 1)
      t = easeInOutCubic(t)
      sheetState[sheetIndex].turnProgress = startVal + (endVal - startVal) * t
      deformSheet(sheetIndex)
      if (elapsed < duration) {
        requestAnimationFrame(tick)
      } else {
        sheetState[sheetIndex].turnProgress = endVal
        deformSheet(sheetIndex)
        animating = false
        if (onDone) onDone()
      }
    }
    requestAnimationFrame(tick)
  }

  // Mouse parallax
  let targetRotY = 0,
    targetRotX = -0.08
  const onMouseMove = e => {
    targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.06
    targetRotX = -0.08 + (e.clientY / window.innerHeight - 0.5) * 0.04
  }

  // Touch parallax for mobile
  const onTouchMove = e => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      targetRotY = (touch.clientX / window.innerWidth - 0.5) * 0.04
      targetRotX = -0.08 + (touch.clientY / window.innerHeight - 0.5) * 0.03
    }
  }

  // Device orientation parallax for mobile
  const onDeviceOrientation = e => {
    if (e.gamma != null && e.beta != null) {
      targetRotY = (e.gamma / 90) * 0.06
      targetRotX = -0.08 + ((e.beta - 45) / 90) * 0.04
    }
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('deviceorientation', onDeviceOrientation)

  // Click to navigate — simple left/right half of canvas
  // Using only 'click' (works for mouse + touch on modern browsers)
  // Avoids touchend+click double-fire issues
  const onClick = e => {
    if (animating) return
    const rect = renderer.domElement.getBoundingClientRect()
    const x = (e.clientX || 0) - rect.left
    if (x > rect.width / 2) api.goNext()
    else api.goPrev()
  }
  renderer.domElement.addEventListener('click', onClick)

  // Resize
  const onResize = () => {
    const nw = container.clientWidth,
      nh = container.clientHeight
    if (!nw || !nh) return
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  }
  window.addEventListener('resize', onResize)

  // Render loop
  let running = true
  ;(function renderLoop() {
    if (!running) return
    book.rotation.y += (targetRotY - book.rotation.y) * 0.06
    book.rotation.x += (targetRotX - book.rotation.x) * 0.06
    renderer.render(scene, camera)
    requestAnimationFrame(renderLoop)
  })()

  const api = {
    currentView: 0,
    sheetCount: 0,
    onViewChange: null,
    goNext() {
      if (api.currentView < api.sheetCount && !animating) {
        const idx = api.currentView
        flipSheet(idx, true, () => {
          api.currentView = idx + 1
          api.onViewChange?.(api.currentView)
        })
      }
    },
    goPrev() {
      if (api.currentView > 0 && !animating) {
        const idx = api.currentView - 1
        flipSheet(idx, false, () => {
          api.currentView = idx
          api.onViewChange?.(api.currentView)
        })
      }
    },
    isAnimating() {
      return animating
    },
    async init() {
      await coverPromise
      buildSheetDefs()
      buildMeshes()
      api.sheetCount = sheetDefs.length
    },
    destroy() {
      running = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('deviceorientation', onDeviceOrientation)
      renderer.domElement.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  return api
}

/* ═══════════════════════════════════════
   React Component
   ═══════════════════════════════════════ */
export default memo(function BookPreview({ userName, totalProgress, onClose }) {
  const { authFetch } = useAuth()
  const containerRef = useRef(null)
  const bookApiRef = useRef(null)
  const [stories, setStories] = useState([])
  const [cover, setCover] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(0)
  const [sheetCount, setSheetCount] = useState(0)

  // Fetch data
  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const [sR, cR] = await Promise.all([
          authFetch('/api/stories/all'),
          authFetch('/api/covers/saved')
        ])
        if (off) return
        if (sR.ok) {
          const d = await sR.json()
          setStories(
            d
              .filter(s => s.answer?.trim())
              .sort((a, b) => {
                if (a.chapter_id !== b.chapter_id)
                  return (
                    chapters.findIndex(c => c.id === a.chapter_id) -
                    chapters.findIndex(c => c.id === b.chapter_id)
                  )
                return a.question_id - b.question_id
              })
          )
        }
        if (cR.ok) {
          const d = await cR.json()
          if (d.cover) setCover(d.cover)
        }
      } catch (e) {
        console.error('BookPreview:', e)
      } finally {
        if (!off) setLoading(false)
      }
    })()
    return () => {
      off = true
    }
  }, [])

  // Build book
  useEffect(() => {
    if (loading || !containerRef.current) return
    const el = containerRef.current
    const { title, author, pages } = buildPageContents(stories, cover, userName)
    const storyCount = stories.length
    const chapterCount = new Set(stories.map(s => s.chapter_id)).size

    const api = buildBook(
      el,
      pages,
      title,
      author,
      cover?.front_cover_url,
      storyCount,
      chapterCount
    )
    if (!api) return
    bookApiRef.current = api
    api.onViewChange = v => setView(v)
    api.init().then(() => {
      setSheetCount(api.sheetCount)
    })

    return () => {
      api.destroy()
      bookApiRef.current = null
    }
  }, [loading, stories, cover, userName])

  // Keyboard
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        bookApiRef.current?.goNext()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        bookApiRef.current?.goPrev()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const title = cover?.title || `${userName?.split(' ')[0] || 'My'}'s Life Story`
  const sc = stories.length
  const cc = new Set(stories.map(s => s.chapter_id)).size

  const handlePrev = () => bookApiRef.current?.goPrev()
  const handleNext = () => bookApiRef.current?.goNext()

  const viewLabels =
    sheetCount > 0
      ? (() => {
          const labels = ['Cover']
          for (let i = 1; i < sheetCount - 1; i++) labels.push(`Pages ${i * 2 - 1}\u2013${i * 2}`)
          labels.push('Back Cover')
          return labels
        })()
      : []

  return (
    <div className="bp3-overlay" onClick={onClose}>
      <div className="bp3-modal" onClick={e => e.stopPropagation()}>
        <div className="bp3-head">
          <div className="bp3-brand">
            <span className="bp3-dot" />
            <div>
              <div className="bp3-bname">{title}</div>
              <div className="bp3-bmeta">
                {loading ? 'Loading...' : `${sc} stories \u00b7 ${cc} chapters`}
              </div>
            </div>
          </div>
          <div className="bp3-nav">
            <button className="bp3-btn" onClick={handlePrev} disabled={view === 0}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Prev
            </button>
            <span className="bp3-cnt">{viewLabels[view] || ''}</span>
            <button className="bp3-btn" onClick={handleNext} disabled={view >= sheetCount}>
              Next
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button className="bp3-x" onClick={onClose} aria-label="Close">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bp3-shell">
          {loading && (
            <div className="bp3-loader">
              <div className="bp3-spin" />
              <p>Preparing your memoir...</p>
            </div>
          )}
          <div ref={containerRef} className="bp3-canvas" />
        </div>

        <p className="bp3-hint">
          Click book halves or use arrow keys to navigate \u00b7 Move mouse for 3D parallax
        </p>
        {totalProgress > 0 && (
          <div className="bp3-prog">
            <div className="bp3-prog-fill" style={{ width: `${totalProgress}%` }} />
            <span className="bp3-prog-t">{totalProgress}%</span>
          </div>
        )}
      </div>

      <style>{`
/* ═══════════════════════════════════════
   OVERLAY + MODAL
   ═══════════════════════════════════════ */
.bp3-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
  background: rgba(0,0,0,.92);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  animation: bp3In .3s;
}
@keyframes bp3In { from { opacity: 0 } to { opacity: 1 } }

.bp3-modal {
  width: min(1200px, 96vw);
  max-height: 96vh;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px;
  animation: bp3Up .45s ease-out;
}
@keyframes bp3Up { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }

/* ═══════════════════════════════════════
   HEADER
   ═══════════════════════════════════════ */
.bp3-head {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.bp3-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.bp3-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #d4a574, rgba(180,140,90,.4));
  box-shadow: 0 0 0 2.5px rgba(212,165,116,.1);
}
.bp3-bname { font-weight: 700; color: rgba(255,255,255,.9); font-size: 13px; letter-spacing: -.01em }
.bp3-bmeta { color: rgba(255,255,255,.4); font-size: 10px; margin-top: 1px }
.bp3-nav { display: flex; align-items: center; gap: 6px }
.bp3-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 14px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  color: rgba(255,255,255,.75);
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: .15s; font-family: inherit;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  backdrop-filter: blur(8px);
}
.bp3-btn:hover:not(:disabled) { background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.08)); color: #fff }
.bp3-btn:active:not(:disabled) { transform: translateY(1px) }
.bp3-btn:disabled { opacity: .25; cursor: default }
.bp3-cnt {
  color: rgba(255,255,255,.4); font-size: 11px;
  min-width: 80px; text-align: center;
  font-variant-numeric: tabular-nums;
}
.bp3-x {
  width: 34px; height: 34px;
  display: grid; place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  color: rgba(255,255,255,.55);
  cursor: pointer; transition: .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  backdrop-filter: blur(8px);
  margin-left: 2px;
}
.bp3-x:hover { background: rgba(255,70,70,.2); border-color: rgba(255,70,70,.25); color: #fff }

/* ═══════════════════════════════════════
   3D CANVAS AREA
   ═══════════════════════════════════════ */
.bp3-shell {
  width: min(1200px, 98vw);
  height: min(780px, 78vh);
  position: relative;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.bp3-canvas {
  width: 100%; height: 100%;
}
.bp3-canvas canvas {
  display: block;
  touch-action: none;
  cursor: pointer;
}

/* ═══════════════════════════════════════
   LOADER
   ═══════════════════════════════════════ */
.bp3-loader {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; z-index: 50;
}
.bp3-loader p { color: rgba(255,255,255,.45); font-size: 12px }
.bp3-spin {
  width: 28px; height: 28px;
  border: 2px solid rgba(212,165,116,.12);
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: bp3Spin .7s linear infinite;
}
@keyframes bp3Spin { to { transform: rotate(360deg) } }

/* ═══════════════════════════════════════
   HINT + PROGRESS
   ═══════════════════════════════════════ */
.bp3-hint { color: rgba(255,255,255,.2); font-size: 10px; text-align: center; margin: 0 }
.bp3-prog {
  width: min(340px, 72%); height: 3px;
  background: rgba(255,255,255,.05);
  border-radius: 99px;
  position: relative; overflow: hidden;
}
.bp3-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B7355, #d4a574);
  border-radius: 99px;
  transition: width .5s;
}
.bp3-prog-t {
  position: absolute; top: -14px; right: 0;
  font-size: 9px; color: rgba(255,255,255,.3);
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (max-width: 768px) {
  .bp3-shell { height: min(560px, 65vh) }
  .bp3-head { flex-direction: column; align-items: stretch }
  .bp3-nav { justify-content: center }
  .bp3-brand { justify-content: center }
  .bp3-hint { font-size: 9px }
}
@media (max-width: 480px) {
  .bp3-overlay { padding: 6px }
  .bp3-shell { height: min(450px, 60vh); width: 100vw }
  .bp3-btn { padding: 6px 10px; font-size: 11px }
  .bp3-cnt { min-width: 60px; font-size: 10px }
  .bp3-bname { font-size: 12px }
}
@media (max-height: 600px) {
  .bp3-shell { height: 55vh }
}
      `}</style>
    </div>
  )
})
