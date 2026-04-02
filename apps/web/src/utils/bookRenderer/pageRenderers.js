import { TEX_W, TEX_H } from './constants.js'

/* ─── helpers ─── */

function wrap(ctx, text, x, y, maxW, lineH) {
  const words = text.split(/\s+/)
  let line = ''
  let curY = y
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY)
      curY += lineH
      line = w
    } else {
      line = test
    }
  }
  if (line) {
    ctx.fillText(line, x, curY)
    curY += lineH
  }
  return curY
}

function dropCap(t) {
  if (!t) return { l: '', r: '' }
  const c = t.replace(/^["'\s]+/, '')
  return { l: c.charAt(0).toUpperCase(), r: c.slice(1) }
}

function renderPageNumber(ctx, pageNum) {
  if (!pageNum) return
  ctx.font = '13px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(139,115,85,0.25)'
  ctx.textAlign = 'center'
  ctx.fillText(String(pageNum), TEX_W / 2, TEX_H - 40)
}

/* ─── Dispatcher ─── */

export function renderPageContent(ctx, content, pad, maxW, curY) {
  const renderers = {
    title: renderTitlePage,
    dedication: renderDedicationPage,
    toc: renderTocPage,
    chapter: renderChapterPage,
    story: renderStoryPage,
    continuation: renderContinuationPage,
    blank: renderBlankPage
  }
  const render = renderers[content.type]
  if (render) {
    render(ctx, content, pad, maxW, curY)
  }
}

/* ─── Individual page type renderers ─── */

function renderTitlePage(ctx, content, pad, maxW, curY) {
  ctx.textAlign = 'center'

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
}

function renderDedicationPage(ctx) {
  ctx.textAlign = 'center'
  ctx.font = '500 14px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(139,115,85,0.5)'
  ctx.letterSpacing = '3px'
  ctx.fillText('DEDICATION', TEX_W / 2, TEX_H * 0.35)
  let curY = TEX_H * 0.42

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
}

function renderTocPage(ctx, content, pad, _maxW, curY) {
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
}

function renderChapterPage(ctx, content) {
  ctx.textAlign = 'center'

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
}

function renderStoryPage(ctx, content, pad, maxW, curY) {
  ctx.font = `500 ${TEX_W * 0.032}px Boska, "Playfair Display", Georgia, serif`
  ctx.fillStyle = '#2d2418'
  curY = wrap(ctx, content.question || '', pad, curY, maxW, TEX_W * 0.038)

  if (content.date) {
    ctx.font = '14px "General Sans", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(139,115,85,0.4)'
    ctx.fillText(content.date, pad, curY + 2)
    curY += 22
  }

  ctx.fillStyle = 'rgba(139,115,85,0.12)'
  ctx.fillRect(pad, curY + 3, maxW, 1)
  curY += 18

  const { l, r } =
    content.isFirst !== false ? dropCap(content.text || '') : { l: '', r: content.text || '' }
  ctx.font = '18px Lora, Georgia, serif'
  ctx.fillStyle = '#3d352c'

  if (l && content.isFirst !== false) {
    renderDropCapText(ctx, l, r, pad, maxW, curY)
  } else {
    wrap(ctx, content.text || '', pad, curY, maxW, 30)
  }

  renderPageNumber(ctx, content.pageNum)
}

function renderDropCapText(ctx, letter, rest, pad, maxW, curY) {
  ctx.font = `500 78px Boska, "Playfair Display", Georgia, serif`
  ctx.fillStyle = '#8B7355'
  ctx.fillText(letter, pad, curY + 60)
  const dcW = ctx.measureText(letter).width + 12

  ctx.font = '18px Lora, Georgia, serif'
  ctx.fillStyle = '#3d352c'
  const restWords = rest.split(/\s+/)
  let dcLine = ''
  let dcY = curY
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
    } else {
      dcLine = test
    }
  }
  if (dcLine) {
    const lineX = dcLines < dcMaxLines ? pad + dcW : pad
    ctx.fillText(dcLine, lineX, dcY)
  }
}

function renderContinuationPage(ctx, content, pad, maxW, curY) {
  ctx.font = '13px "General Sans", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(139,115,85,0.5)'
  ctx.fillText(`${content.question} (continued)`, pad, curY)
  curY += 25

  ctx.font = '18px Lora, Georgia, serif'
  ctx.fillStyle = '#3d352c'
  wrap(ctx, content.text || '', pad, curY, maxW, 30)

  renderPageNumber(ctx, content.pageNum)
}

function renderBlankPage(ctx) {
  ctx.textAlign = 'center'
  ctx.font = 'italic 18px Lora, Georgia, serif'
  ctx.fillStyle = 'rgba(139,115,85,0.3)'
  ctx.fillText('This page intentionally left blank', TEX_W / 2, TEX_H / 2)
}
