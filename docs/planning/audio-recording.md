# Voice Recording Preservation Feature

## Overview

Record and store the actual voice of the person being interviewed so family members can listen to them telling their stories - not just read the text.

## User Experience

1. User does voice interview as normal
2. Their actual voice is recorded and stored alongside the transcript
3. In the final book/ebook, each story has a QR code
4. Family scans QR code → hears grandma actually telling the story

---

## Technical Architecture

### Storage: Cloudflare R2

- **Why R2**: Free egress (bandwidth), cheap storage ($0.015/GB/month)
- **Format**: WebM or MP3 (compressed audio)
- **Naming**: `{user_id}/{chapter_id}/{question_id}.webm`

### Cost Estimate

| Users  | Storage | Monthly Cost |
| ------ | ------- | ------------ |
| 100    | ~30 GB  | ~$0.45       |
| 1,000  | ~300 GB | ~$4.50       |
| 10,000 | ~3 TB   | ~$45         |

---

## Implementation Plan

### Phase 1: Database & Storage Setup

#### 1.1 Database Schema

```sql
-- Add to db/index.js
CREATE TABLE IF NOT EXISTS story_audio (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  -- Storage info
  audio_url TEXT,              -- R2 public URL
  audio_key TEXT,              -- R2 object key for deletion

  -- Metadata
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  format TEXT DEFAULT 'webm',  -- 'webm' or 'mp3'

  -- QR code for book
  qr_code_url TEXT,
  short_link TEXT,             -- e.g., /listen/abc123

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chapter_id, question_id)
);

CREATE INDEX idx_story_audio_user ON story_audio(user_id);
CREATE INDEX idx_story_audio_story ON story_audio(story_id);
CREATE INDEX idx_story_audio_short_link ON story_audio(short_link);
```

#### 1.2 Environment Variables

```env
# Cloudflare R2 credentials
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=lifestory-audio
R2_PUBLIC_URL=https://audio.yourdomain.com
```

#### 1.3 R2 Client Setup

Create `/services/api/utils/r2Client.js`:

- Initialize S3-compatible client for R2
- Upload function with automatic compression
- Delete function for cleanup
- Generate signed URLs if needed

---

### Phase 2: Recording During Interview

#### 2.1 Frontend: Capture Audio

Modify `VoiceChat.jsx`:

- Use MediaRecorder API alongside existing WebSocket stream
- Record in chunks (every 10 seconds) for reliability
- Store chunks in memory during interview
- On question transition or end: combine chunks and upload

```javascript
// Key additions to VoiceChat.jsx
const mediaRecorderRef = useRef(null)
const audioChunksRef = useRef([])

// Start recording when interview starts
const startRecording = () => {
  const mediaRecorder = new MediaRecorder(streamRef.current, {
    mimeType: 'audio/webm;codecs=opus'
  })
  mediaRecorder.ondataavailable = e => {
    audioChunksRef.current.push(e.data)
  }
  mediaRecorder.start(10000) // Chunk every 10s
  mediaRecorderRef.current = mediaRecorder
}

// On question transition: upload current recording
const uploadQuestionAudio = async () => {
  const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
  const formData = new FormData()
  formData.append('audio', blob)
  formData.append('chapter_id', chapter.id)
  formData.append('question_id', question.id)

  await authFetch('/api/voice/upload-audio', {
    method: 'POST',
    body: formData
  })

  audioChunksRef.current = [] // Reset for next question
}
```

#### 2.2 Backend: Upload Endpoint

Create `POST /api/voice/upload-audio`:

- Receive audio blob from frontend
- Upload to R2
- Save metadata to `story_audio` table
- Generate short link for QR code

---

### Phase 3: Playback & QR Codes

#### 3.1 Public Playback Page

Create `/listen/:shortCode` route:

- Fetch audio URL from database
- Beautiful player page with story context
- No login required (public link)
- Mobile-friendly design

#### 3.2 QR Code Generation

- Generate QR code pointing to `/listen/:shortCode`
- Store QR code image (or generate on-demand)
- Include in EPUB export

#### 3.3 EPUB Integration

Modify export to include:

- QR code image for each story that has audio
- Caption: "Scan to hear [Name] tell this story"

---

### Phase 4: Audio Player in App

#### 4.1 Chapter View Enhancement

Add audio player to story cards:

- Play button if audio exists
- Waveform visualization
- Duration display

#### 4.2 Full Audio Experience Page

New page to listen to entire chapter/book:

- Playlist of all recordings
- Auto-advance through stories
- Background playback support

---

## File Changes Summary

| File                                      | Changes                              |
| ----------------------------------------- | ------------------------------------ |
| `services/api/db/index.js`                | Add `story_audio` table              |
| `services/api/utils/r2Client.js`          | **New** - R2 upload/delete utilities |
| `services/api/routes/voice.js`            | Add `/upload-audio` endpoint         |
| `services/api/routes/audio.js`            | **New** - Public playback routes     |
| `apps/web/src/pages/VoiceChat.jsx`        | Add MediaRecorder capture            |
| `apps/web/src/pages/Listen.jsx`           | **New** - Public playback page       |
| `apps/web/src/components/AudioPlayer.jsx` | **New** - Reusable player component  |
| `services/api/routes/export.js`           | Add QR codes to EPUB                 |

---

## Security Considerations

1. **Audio URLs**: Use short codes, not predictable paths
2. **Rate limiting**: Prevent audio scraping
3. **Optional privacy**: Let users choose public vs private audio
4. **Deletion**: When user deletes account, delete all R2 objects

---

## Future Enhancements

- [ ] Audio quality options (high/low for bandwidth)
- [ ] Transcription timestamps (highlight text as audio plays)
- [ ] Family comments on recordings
- [ ] Download all audio as ZIP
- [ ] AI-generated chapter summaries from audio

---

## Implementation Order

1. **Setup** - R2 bucket, credentials, client utility
2. **Database** - Add story_audio table
3. **Recording** - Capture audio in VoiceChat.jsx
4. **Upload** - Backend endpoint to receive and store
5. **Playback** - Public listen page with player
6. **QR Codes** - Generate and embed in exports
7. **Polish** - Audio player in chapter view, full experience page
