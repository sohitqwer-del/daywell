# Daywell 1.1 validation

Validated on 28 October 2026. Android application ID remains `org.forma.wellness` so the update keeps the previous installation's records and credentials.

## Passed

- TypeScript/Vite production build and native Java/Kotlin debug APK build.
- 14 unit tests: dates, nutrition portions, volume, backup validation, old-backup compatibility, recipe yield, photo portions, unknown nutrition, repeat meals, invalid media rejection, and structured estimate validation.
- Eight browser flows covering food, workouts, memory, offline coaching, custom foods, backups, responsive layouts, recipes, weekly planning, and photos. The photo flow covers half/three-quarter portions, edit after reload, photo export, clearing test data, restoring the backup, and confirming the full-size image decodes after restore.
- npm audit: zero reported vulnerabilities.
- OnePlus 7 Pro GM1911 / Android 11: Daywell installed over Forma. Database contents were byte-identical before interaction with the update. Existing meal, workout, and memory IDs remained present after the device test.
- Native photo write/display after reload; half of an 800 kcal plate logs 400 kcal, and changing the portion to three-quarters logs 600 kcal. A labelled synthetic image was used and removed after testing.
- Take photo opened the OnePlus camera. No picture was taken. The flow was cancelled and Daywell was returned to the foreground.
- Camera plugin registered. Only steps, sleep and weight health-read permissions are declared. No broad gallery-storage permission was added.

## Not live-tested

- Real-account ChatGPT OAuth, paid inference, and AI photo inference require an eligible provider account/model. Returned estimates are validated and require user review; an image cannot establish accurate food quantities.
- Actual camera shutter capture and personal-gallery selection were not performed. Camera launch and selected-image logging/storage were tested separately without photographing surroundings or inspecting the user's gallery.
- Health Connect is unavailable on the connected phone. Populated imports and permissions still need device testing.
- The prior lint task completed with Kotlin metadata diagnostics in dependency analysis. Native compilation passes; public release still needs a toolchain-aligned lint/security/accessibility review.

## Boundaries

This is a development-signed personal-testing APK. Apple Health, camera barcode scanning, voice, automatic background sync and cloud sync are not included.

Photo-only meals have unknown nutrition. Portion percentages assume an even share of the whole plate; mixed dishes may need manual correction. Private, resized photos are included in plaintext JSON backups, with a 64 MB import/export limit. Records use a SQLite JSON snapshot. The database and photos are not separately encrypted beyond Android protection; AI credentials use Android Keystore encryption.
