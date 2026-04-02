import { chapters } from '../../data/chapters'

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

/**
 * Build page content definitions from user story data.
 * Returns { title, author, pages } where pages is an array of
 * content descriptors ({ type, ... }) consumed by createPageTexture.
 */
export function buildPageContents(stories, cover, userName) {
  const title = cover?.title || `${userName?.split(' ')[0] || 'My'}'s Life Story`
  const author = cover?.author || userName || ''
  const pages = []

  pages.push({ type: 'title', title, author })
  pages.push({ type: 'dedication' })
  addTocPage(pages, stories)

  const counter = { pNum: 1 }
  addStoryPages(pages, stories, counter)
  addPlaceholderPages(pages, counter)

  return { title, author, pages }
}

function addTocPage(pages, stories) {
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
}

function addStoryPages(pages, stories, counter) {
  let lastCh = null
  const lim = 600

  stories.forEach(s => {
    const ch = chapters.find(c => c.id === s.chapter_id)
    const q = ch?.questions?.find(x => x.id === s.question_id) || ch?.questions?.[s.question_id]

    if (s.chapter_id !== lastCh) {
      lastCh = s.chapter_id
      pages.push({
        type: 'chapter',
        icon: ch?.icon,
        title: ch?.title,
        subtitle: ch?.subtitle
      })
    }

    const txt = s.answer || ''
    const qT = q?.question || ''
    const dt = fmtDate(s.updated_at || s.created_at)

    if (txt.length <= lim) {
      pages.push({
        type: 'story',
        question: qT,
        text: txt,
        date: dt,
        pageNum: counter.pNum++,
        isFirst: true
      })
    } else {
      const chunks = splitTextIntoChunks(txt, lim)
      chunks.forEach((t, pi) => {
        if (pi === 0) {
          pages.push({
            type: 'story',
            question: qT,
            text: t,
            date: dt,
            pageNum: counter.pNum++,
            isFirst: true
          })
        } else {
          pages.push({ type: 'continuation', question: qT, text: t, pageNum: counter.pNum++ })
        }
      })
    }
  })
}

function addPlaceholderPages(pages, counter) {
  if (pages.length >= 4) return
  pages.push({
    type: 'story',
    question: 'Where did your story begin?',
    text: 'Every great memoir starts with a first memory...',
    pageNum: counter.pNum++,
    isFirst: true
  })
  pages.push({
    type: 'story',
    question: 'What shaped who you are?',
    text: 'The moments, people, and places that made you who you are today...',
    pageNum: counter.pNum++,
    isFirst: true
  })
}

function splitTextIntoChunks(text, limit) {
  const words = text.split(/\s+/)
  const chunks = []
  let cur = ''

  for (const w of words) {
    if ((cur + ' ' + w).length > limit && cur) {
      chunks.push(cur.trim())
      cur = w
    } else {
      cur = cur ? cur + ' ' + w : w
    }
  }
  if (cur.trim()) {
    chunks.push(cur.trim())
  }
  return chunks
}
