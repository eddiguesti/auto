# Private authentication identity foundation

Native public authentication retains the source IP rate window using an atomic
D1 counter. A public caller cannot select that IP from a forwarded header. The
native API instead requires the private `AUTH_CLIENT_ID` service binding, which
verifies a short-lived HMAC assertion from the frontend ingress. Assertion
verification receives no password, token, cookie, email or memoir body.

`auth-client-identity.js` is a private Worker configured by
`wrangler.auth-identity.jsonc`: no public route, workers.dev or preview URL.
The frontend and this provider require the same independent
`AUTH_INGRESS_SECRET` (at least 32 bytes). This is separate from JWT signing.
Signed assertions bind the API audience, original authentication path, source
address, issuance second and random nonce. The verifier checks canonical
base64url/HMAC bytes, a 30-second validity window and at most five seconds of
clock skew, then emits only a canonical IPv4 or IPv6 /56 rate subject. Assertions
are internal only and must not be logged, returned to browsers or cached.

The frontend's signer is **disabled in every checked-in configuration**. Enabling
it requires all of:

- `AUTH_INGRESS_MODE=direct-custom-domain` and exact `AUTH_INGRESS_HOST`.
- A real custom domain with Cloudflare proxying; HTTPS and platform `request.cf`.
- A verified WAF rule blocking **all** Worker subrequests using
  `cf.worker.upstream_zone ne ""`, including same-zone requests. Test that rule
  against an actual same-zone Worker before recording deployment evidence.
- Only after those remote checks, `AUTH_INGRESS_RULES_VERIFIED=true`.
- The matching private identity binding and secret, and no other unreviewed
  Worker allowed to call the ingress or sign assertions.

The configuration flag is an operator declaration; it does not prove a WAF rule
exists. Preflight/remote checks and live abuse tests remain required. The signer
also rejects CF-Worker and x-real-ip markers and missing/malformed addresses, but
these checks alone do not replace the WAF rule. Cloudflare documents same-zone
Worker spoofing of CF-Connecting-IP and recommends the immutable upstream-zone
field for WAF rules: [HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/),
[Worker subrequest rules](https://developers.cloudflare.com/waf/custom-rules/use-cases/block-worker-subrequests/).

An unconfigured or rejected identity fails with 503 rather than silently using
a caller-provided address or disabling authentication limits. Offline tests
prove the HMAC and routing implementation; they cannot attest to live edge/WAF
configuration. No provider or ingress has been deployed.
