import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Provider calls are replaced at the HTTP boundary. Database/authorization contracts
// are exercised separately by the PostgreSQL integration suite.
async function account(page) {
  const state = {
    answer: 'An original memory.',
    review: 'A polished chapter.',
    stories: [],
    polls: 0,
    saves: []
  }
  await page.addInitScript(() => sessionStorage.setItem('token', 'browser-test-token'))
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    let body = {}
    if (path === '/api/auth/me')
      body = {
        user: {
          id: 1,
          name: 'Memoir Reader',
          email: 'reader@example.test',
          isPremium: true,
          email_verified: true
        }
      }
    else if (path === '/api/onboarding/status') body = { completed: true }
    else if (path === '/api/stories' && method === 'POST') {
      const saved = request.postDataJSON()
      state.saves.push(saved)
      state.answer = saved.answer
      body = { id: 1, success: true }
    } else if (path === '/api/stories/progress') body = { 'earliest-memories': 1 }
    else if (path.startsWith('/api/stories/'))
      body = [
        {
          id: 1,
          chapter_id: path.split('/').at(-1),
          question_id: 'birth-details',
          answer: state.answer,
          photos: []
        }
      ]
    else if (path.endsWith('/save') && path.startsWith('/api/chapter-review/')) {
      state.review = request.postDataJSON().polishedText
      body = { success: true }
    } else if (path.startsWith('/api/chapter-review/'))
      body = { review: { polishedText: state.review, clioHistory: [] }, answeredCount: 3 }
    else if (path.startsWith('/api/free-stories')) {
      if (method === 'POST') state.stories.push({ id: 1, ...request.postDataJSON() })
      if (method === 'PUT') state.stories[0] = { id: 1, ...request.postDataJSON() }
      body = { success: true, data: state.stories }
    } else if (path === '/api/export/manuscript')
      body = [
        { id: 1, chapter_id: 'earliest-memories', question_id: 'reviewed', answer: state.review }
      ]
    else if (path === '/api/export/status') body = { canExport: true, storyCount: 1 }
    else if (path === '/api/audiobook/status') body = { canGenerate: true, previousAudiobooks: [] }
    else if (path === '/api/audiobook/generate') body = { jobId: 'test-job' }
    else if (path === '/api/audiobook/jobs/test-job')
      body =
        ++state.polls === 1 ? { status: 'active' } : { status: 'completed', filename: 'memoir.mp3' }
    else if (path === '/api/audiobook/download/memoir.mp3')
      return route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('completed audio fixture')
      })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    })
  })
  return state
}

test('an immediate return to contents saves the last typed memory and reopening shows it', async ({
  page
}) => {
  const state = await account(page)
  await page.goto('/chapter/earliest-memories')
  const editor = page.getByPlaceholder(
    'Begin your recollection here... Take your time, every memory matters.'
  )
  await editor.fill('The corrected memory, typed just before leaving.')
  await page.getByRole('link', { name: /Return to Contents/ }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(state.saves.at(-1).answer).toBe('The corrected memory, typed just before leaving.')
  await page.goBack()
  await expect(editor).toHaveValue('The corrected memory, typed just before leaving.')
})

test('a polished chapter saves before navigation and the mobile editing assistant can be opened', async ({
  page
}) => {
  const state = await account(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chapter/earliest-memories/review')
  const assistant = page.getByRole('region', { name: 'Clio editing assistant' })
  await expect(assistant).toBeVisible()
  await page.getByRole('button', { name: 'Close Clio' }).click()
  await expect(assistant).toBeHidden()
  await page.getByRole('button', { name: 'Ask Clio', exact: true }).click()
  await expect(assistant).toBeVisible()
  await page.getByRole('button', { name: 'Close Clio' }).click()
  await page
    .getByPlaceholder('Your polished chapter will appear here...')
    .fill('My final manuscript correction.')
  await page.getByRole('link', { name: 'Back to Questions' }).click()
  await expect(page).toHaveURL(/\/chapter\/earliest-memories$/)
  expect(state.review).toBe('My final manuscript correction.')
})

test('standalone memories remain available to reopen and edit after saving', async ({ page }) => {
  const state = await account(page)
  await page.goto('/quick-story')
  await page.getByLabel('Title (optional)').fill('The summer garden')
  await page.getByLabel('Your story').fill('A standalone memory to preserve.')
  await page.getByRole('button', { name: 'Save Story', exact: true }).click()
  await page.getByRole('button', { name: 'Edit The summer garden' }).click()
  await expect(page.getByLabel('Your story')).toHaveValue('A standalone memory to preserve.')
  await page.getByLabel('Your story').fill('An edited standalone memory.')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('An edited standalone memory.', { exact: true })).toBeVisible()
  expect(state.stories[0].content).toBe('An edited standalone memory.')
})

test('a queued audiobook downloads the completed MP3 rather than the job JSON', async ({
  page
}) => {
  const state = await account(page)
  await page.goto('/export')
  const downloadReady = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Generate Audiobook', exact: true }).click()
  const download = await downloadReady
  expect(download.suggestedFilename()).toMatch(/\.mp3$/)
  expect(await readFile(await download.path(), 'utf8')).toBe('completed audio fixture')
  expect(state.polls).toBe(2)
})
