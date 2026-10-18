# Ten hardback memoirs for £250

The current Node API sells `premium_bundle` and `onboarding_bundle` as the complete £250 package: 12 months of memoir access, audiobook and phone interviews, and ten identical A5 hardbacks delivered to one UK or French address. The legacy `printed_book` purchase ID now sells this same complete package. A completed bundle payment also unlocks the ebook and audiobook without requiring another payment. The fixed customer total includes delivery; there are no split deliveries or extra checkout shipping charges.

Books are 148 × 210 mm, printed casebound (`CasePPC`), matte, with 115gsm coated paper. The package allows 32–200 interior pages and up to eight colour photograph pages. Interiors are padded to a multiple of four pages, with a minimum of 32. The customer selects photographs; colour pages are counted separately from black-and-white text. Unsupported images, missing photographs, unsupported font characters and overlong manuscripts are rejected before approval, rather than omitted.

## Activation

Printing is disabled by default and print-package checkout returns 503 until all prerequisites are available. Configure these on both the Node API and worker:

- `BOOKVAULT_API_KEY`: an account key enabled for personalised transient orders and the v4 API.
- `BOOKVAULT_TEXT_STOCK_ID` and `BOOKVAULT_COVER_STOCK_ID`: account codelist IDs matching 115gsm coated text and a printed casebound cover. Confirm these with Bookvault; identifiers are not guessed.
- `PRINT_FILE_SIGNING_SECRET`: a dedicated random secret, at least 32 characters.
- `PRINT_PUBLIC_API_URL`: public HTTPS Node API origin. `/api/print-files/:id/:type` must be reachable by Bookvault without a login or staging identity gate.
- Working R2 configuration for private durable PDF storage. A local upload fallback does not enable printing.
- `BOOKVAULT_FR_DECLARED_VALUE_GBP`: truthful physical shipment value agreed by the merchant, for the French customs declaration. Confirm `BOOKVAULT_HS_CODE` and DDP support for the selected carrier with Bookvault. Do not substitute the cost of digital memoir access for the physical shipment's declared value. Import and carrier costs are absorbed by the merchant.
- Existing Stripe secret and webhook secret; subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Apply SQL migrations through the existing Node startup runner and run the separate `npm run worker` process.

Validate one real interior/cover pair against Bookvault's file requirements. A physical proof is recommended before taking customer orders. Bookvault's calculate endpoint supplies the cover size; a generated PDF and mocked API test are not a supplier acceptance test. Verify French DDP shipping is charged to your account, then set `PRINT_FULFILMENT_ENABLED=true` on both processes.

The Cloudflare-native staging API does not implement payment or print mutations. Continue to use the Node API for this flow; do not enable purchases against staging or point printer file links at an inaccessible identity-gated host.

## Customer flow and recovery

1. Stripe charges £250 in GBP using server-defined pricing. Paid, signed webhook events create one print entitlement per Checkout session. A checkout completion awaiting delayed payment does not grant it. Historical four-book payments are not reinterpreted as ten-book purchases.
2. The customer finishes writing, selects up to eight photographs and prepares a proof. Server-side generation uses only that customer's stories and photos. The two exact PDFs are saved as an immutable snapshot in R2.
3. They download and review the interior and cover, approve the files, and give one GB/FR address. Approval atomically consumes one paid entitlement, so repeat submissions cannot order another ten copies.
4. The worker polls the durable `print_orders` outbox every 30 seconds, requests the cheapest tracked standard service from Bookvault UK, and submits a transient order. The provider retrieves only the two approved PDFs through expiring HMAC links.
5. The account's print screen refreshes progress and shows the carrier tracking link after dispatch.

Every printer order uses the stable DocRef `EM-<print-order UUID>`. After a failed or uncertain submission, the system never blindly creates another order. It looks up that reference; unconfirmed or rejected orders enter `review`. Monitor `print_orders WHERE status='review'` and the `print-worker` logs. Reconcile the DocRef in Bookvault before manually requeuing; a timeout can mean the order was accepted. Never requeue a dispatched order. A failed status lookup also requires review rather than concealing the problem.

Refunded payments cannot claim an unused package or send a queued order. A refund after provider acceptance needs the existing refund/support process and supplier coordination; it cannot recall a printed parcel automatically.

Unapproved proof rows and their private files are retained for now. Apply the service's retention policy before introducing automatic deletion; approved files must remain available through printer retrieval.

## Cost basis

The researched example was 200 pages (192 mono + 8 colour) on 115gsm coated paper: ten-copy print cost £59.50; UK tracked delivery £8.38, or French delivery £30.71. These are calculator examples, not account-specific binding quotes, and exclude applicable taxes/surcharges. Supplier costs are borne by the merchant within the £250 selling price; confirm the live account's costs before activation.

Sources: [Bookvault personalised orders](https://help.bookvault.app/fulfilling-personalized-books), [current API reference](https://api.bookvault.app/documentation), [quote calculator](https://quote.bookvault.app).

Bundled Noto Serif font: [Noto fonts](https://github.com/notofonts/noto-fonts), distributed under the SIL Open Font License in `services/api/assets/fonts/OFL.txt`.
