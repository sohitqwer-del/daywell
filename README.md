# Daywell

An open-source Android companion for Indian food, flexible training, and optional ChatGPT coaching.

Source: https://github.com/sohitqwer-del/daywell

[Download Android beta](https://github.com/sohitqwer-del/daywell/releases)

## Version 1.2 beta

- In-app camera preview with zoom, shutter, camera switching and supported torch. System camera and gallery remain available.
- Meal photos can use different portions for each dish: all the dal, half the rice, none of another item.
- More than 80 additional Indian food preparations with familiar portions, aliases, and category search. Values are clearly labelled indicative estimates.
- A Plan tab with an editable diet table. GPT chooses saved food IDs; Daywell calculates calories and macros. Saving a plan does not log it as eaten.
- Daily workout proposals based on time, energy, equipment and constraints. Shorten an active session manually without losing completed sets; apply a GPT draft only after review.
- Explicit rest-day preference, readable coaching tables, and an AI setup dialog that preserves an unsaved meal photo.

See [verification notes](VALIDATION-1.2.md). Live ChatGPT/model access requires your authorization and account eligibility; do not assume that opening the login browser proves connection.

An open-source Android wellness app for food, strength training, and personal context. Built with React, TypeScript, and Capacitor, with native SQLite persistence and Android Keystore credential encryption.

## Previous release: 1.1

Renamed from Forma. The Android application ID, database, browser storage key and Keystore alias remain unchanged so installing this update preserves existing records and connections.

New in this release: a compact home screen, food and workout timeline, camera/gallery meal photos, editable eaten percentage, optional reviewed AI photo estimates, recipes with batch yield, favourites, recent foods, repeat previous meals, weekly workout planning, and strength records.

## Use it

Install `artifacts/Daywell-1.2.0-debug.apk` on Android 8 or later. This is a development-signed build for personal testing, not a Play Store release. Keep Android System WebView updated. The OnePlus 7 Pro on Android 11 is supported by the chosen runtime.

Start a clean space or explicitly choose sample data. Offline features need no account, subscription, or server.

### Included

- Food diary by date and meal, editable portions, custom foods, deletion with undo.
- Photo meals: take a camera photo or choose one, select 1-100% eaten, log without nutrition or enter/review whole-plate nutrition. Quarter, half, three-quarter and whole-plate presets scale the totals. Percentages assume an even share of the plate; mixed dishes may require manual correction.
- Private photo files with small diary previews. Images are resized and re-encoded without original EXIF metadata. No image is sent to a provider unless you press Estimate. Photo attachments are included in JSON backups (64 MB import/export limit).
- Photo entries can be reopened to edit portions or add nutrition later. Unknown nutrition is excluded, not treated as a measured zero.
- Recipes calculated from ingredient servings and batch yield, favourites/recent filters, repeat previous meals, a seven-day routine plan and best logged loads.
- Starter food estimates and Open Food Facts barcode-number lookup (internet required).
- Calories and macronutrients, water logging, weight entries, and daily sleep/energy check-ins.
- 876 bundled exercise descriptions from free-exercise-db, searchable offline.
- Editable routines, exercise ordering, resumable workout sessions, set logging, rest timer, completed-session history, and reuse of previous set values.
- Progress charts based on actual logged data; missing entries remain unknown.
- Rule-based offline summaries, explicit editable memory, and opt-in OpenAI connections.
- Dark/light/system themes, reduced motion, optional haptics, keyboard-accessible dialogs.
- Export and validated restore of JSON backups. Local credentials are never included.
- Read-only, manual Health Connect imports of the last seven days of steps, sleep, and weight, subject to available records and permissions.

### AI setup

Open Settings → AI connections. Offline summaries are the default and are clearly identified as rule-based.

**Personal API key:** enter a dedicated OpenAI API key in the Android app. The native plugin encrypts it with Android Keystore and makes HTTPS requests directly to the public Responses API. No shared developer key is embedded. This is personal-device BYOK, not a hosted multitenant gateway. Set provider-side spending controls. Local request limits are a convenience guardrail, not billing enforcement.

**ChatGPT:** the native plugin implements the documented open-source OAuth flow: system-browser authorization, loopback callback, PKCE, state/nonce checks, RSA ID-token verification against published JWKS, granted-scope checking, encrypted credential storage, refresh, model discovery, and completed SSE responses. It requires provider availability and an eligible account. The Android-specific browser/loopback route is experimental and must be tested with a real account. It does not import ChatGPT history or memory. No live account or billable inference is used during automated tests.

The coach includes profile, preferences, recent food/training summaries, check-ins, and recent conversation when you send a message. Imported health records and weight measurements are included only if their separate switch is enabled. AI cannot directly modify records. Missing logs are not treated as fasting. Outputs require review.

Provider documentation:
- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations

### Health setup

On Android 11 install or update Health Connect from Google Play if available for the device. Other health apps must write their records into Health Connect. In Daywell choose Settings → Health Connect → Connect & sync. Grant only the read permissions you want. No health writes, background sync, or history permission are requested.

Step totals use the platform aggregation API. Sleep intervals are unioned to avoid overlapping double counting within one source; a single source is chosen per day. This simple source selection is not a clinical sleep analysis. Re-sync replaces the imported window, including removed records. You can remove imported records separately from system permissions.

Apple Health requires an iOS companion, which is not included in this Android release.

## Development

Requirements: Node 22+, npm, JDK 21, Android SDK 36, accepted SDK licenses, and an Android device or emulator. Dependencies are pinned through `package-lock.json`.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
npm run android:sync
```

Set `ANDROID_HOME` to your SDK, or create an untracked `android/local.properties` with `sdk.dir` set to your local SDK path. Then:

```sh
cd android
# Windows:
gradlew.bat assembleDebug
# macOS / Linux:
./gradlew assembleDebug
```

Photo analysis requires a connected provider and an image-capable model. Low-effort requests can still incur image-token and output charges. AI estimates are explicitly reviewed before saving, and are not a measurement of the food.

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

Playwright needs its browser once: `npx playwright install chromium`. Tests start the local web development server automatically and cover logging, reloads, undo, workouts, memory, export, and responsive layouts. Native device integration tests are separate.

## Data and security

Android stores one versioned JSON snapshot in a private SQLite row. Writes are serialized on a separate storage executor so network requests cannot block local saves. This is suitable for a personal prototype; a production-scale release should migrate to normalized record tables and incremental writes.

Health records are not separately encrypted at rest. Device encryption, the app sandbox, and lock-screen protection apply. Android cloud backup is disabled. AI secrets use AES-GCM with a non-exportable Android Keystore key. No analytics or advertising SDK is included. The web development fallback uses browser local storage and never accepts provider credentials.

Exported backups are plaintext and may include sensitive records. Keep them private. External copies and provider-side data are not deleted by clearing Daywell. Provider disconnection removes local secrets; revoke authorization in your provider account separately. This app has not undergone an independent security audit.

## Scope still requiring work before public production release

- Real-account testing and provider approval/availability checks for ChatGPT sign-in.
- Health Connect permission review and testing with populated records from multiple devices.
- Camera barcode scanning, voice transcription, iOS companion, watches, notifications, and cloud sync. Meal-photo analysis is implemented but needs live-account validation.
- Release signing, store declarations, public support/privacy contacts, broader accessibility testing, native integration tests, and independent security review.

No placeholders are presented as connected services. Unsupported capabilities have explicit descriptions. General wellness tracking only; no diagnosis or medical treatment.

Current verification boundaries: [VALIDATION-1.2.md](VALIDATION-1.2.md). Previous device checks: [VALIDATION-1.1.md](VALIDATION-1.1.md).

## Open source

Daywell application code is MIT licensed. Dependencies and bundled data keep their own licenses. See `THIRD_PARTY_NOTICES.md` and `public/licenses/`. Source and beta APKs are published on GitHub. The app is not published to an app store.
