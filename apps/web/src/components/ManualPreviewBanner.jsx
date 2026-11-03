import { MANUAL_PREVIEW } from '../config'

export default function ManualPreviewBanner() {
  if (!MANUAL_PREVIEW) return null

  return (
    <aside
      role="note"
      aria-label="Preview availability"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950"
    >
      <p className="mx-auto max-w-5xl">
        <strong>Manual writing preview.</strong> Write and save memories and add photos to saved
        memories. AI, voice, email delivery, phone calls and purchases are unavailable.
      </p>
    </aside>
  )
}
