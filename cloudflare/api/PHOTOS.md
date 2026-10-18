# Native photos in staging

The integrated native API implements the source `/api/photos` and `/api/v1/photos`
contracts for multipart upload, photo analysis, owner file reads, story/gallery
lists and deletion. This is tested locally with real workerd, D1 and R2. No Worker
or bucket has been deployed and no customer photograph has been copied.

Required bindings are `DB`, `MEDIA` (private R2) and the verified source timestamp
policy. Analysis additionally needs the existing `GROK_API_KEY` secret. Native
Fetch sends the shared source prompt and original image bytes to the same xAI
chat-completions endpoint/model, with a 60-second timeout and bounded response.
An optional `XAI_FETCH` binding is used by the test fixture; production defaults
to the fixed provider endpoint. Requests never follow redirects or automatically
retry paid analysis. See [xAI's primary chat documentation](https://docs.x.ai/developers/model-capabilities/legacy/chat-completions).

R2 keys preserve the source photos-at-bucket-root convention. Imported filenames
must pass the existing safe filename policy. Files are served only after an
authoritative owner lookup, with `private, no-store` and `nosniff`. A conflicting
explicit photo owner/story owner is never accepted; legacy NULL-owner story
photos still work. Analysed, directly owned photos can be read/deleted before a
story is linked, correcting the source's inaccessible gallery photographs.

Uploads enforce a 10 MiB file limit and a bounded multipart envelope, MIME/magic
byte matching, a single photo field and positive int4 story IDs. New captions
are limited to 2,000 characters; original filenames to 255. New records include
the verified owner. Analysis failures return 502 without fabricated descriptions
or retained objects. This deliberately corrects the source's fallback success
and save-before-analysis orphan behavior.

R2 and D1 cannot share a transaction. A failed metadata insert attempts object
compensation. If compensation also fails, the API returns an error and logs only
the cleanup category. A production orphan reconciliation job/alert is still
required. Deletion keeps metadata if R2 fails, allowing an owner retry; it never
falls back to Railway/local disk. No cross-runtime cleanup or object copy is
implied by these tests.

Run `node --test cloudflare/api/photos-native.test.mjs`. The suite exercises the
integrated API entrypoint, actual R2 bytes/metadata, owner isolation, source
legacy rows, failed D1 compensation, failed deletion retention, 10 MiB limits,
multipart ambiguity and actual provider wire shape with a local provider fixture.
