# Easy Memoir mobile

Install dependencies in this directory and run `npx expo start`.

Set `EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:3001/api` in `apps/mobile/.env` for a physical device. Use `http://10.0.2.2:3001/api` for the standard Android emulator, or `http://localhost:3001/api` for the iOS simulator. The phone and Mac must be on the same network. Restart Expo after changing the URL. Production defaults to `https://easymemoir.co.uk/api`.

Recordings upload using multipart `audio` to `/api/voice/upload`; the service returns the uploaded file URL and transcript once, without another `data` wrapper.

## Dependency overrides and validation

The mobile app has its own lockfile. Run `npm ci` in this directory. The security overrides retain PostCSS 8 and restrict the `ws` patch to 7.x consumers; dependencies requiring `ws` 8 keep their own supported version. Metro's `image-size` consumer must be validated through an actual Android export; a typecheck does not exercise image asset processing. The checked-in `scripts/patch-metro-image-size.cjs` postinstall adapter makes Metro 0.83.3 pass image bytes to image-size 2.0.4. It checks the dependency versions and exact upstream source, applies only once, and fails installation if those assumptions change. Review the adapter and overrides when upgrading Expo or Metro. Do not skip lifecycle scripts for mobile builds.

Before merging mobile changes, run `npm test`, `npx tsc --noEmit`, and `CI=1 npx expo export --platform android --output-dir /tmp/easy-memoir-mobile-check`. The export verifies JavaScript/Hermes bundling and assets; microphone, call-provider, and device behavior still require device/provider testing.
