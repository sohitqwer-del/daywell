# Forma 1.0 validation (historical)

For the current Daywell update, see [VALIDATION-1.1.md](VALIDATION-1.1.md).

Validated on 28 October 2026.

## Passed

- TypeScript compilation and production Vite build.
- Android Java and Kotlin compilation and debug APK packaging.
- Eight unit tests: nutrition portions, dates, backup schema rejection, exercise references, set independence, volume totals, AI health-context opt-in, and explicit sample-data state.
- Five Playwright flows: food editing/deletion/undo, water undo, persistence after reload, completed-set workout saving, memory, offline replies, export, custom foods, backup restore, invalid-backup protection, and phone/desktop layout checks.
- npm dependency audit: zero reported vulnerabilities after a compatible uuid override in development tooling.
- Physical OnePlus 7 Pro GM1911 running Android 11: APK install and launch, all five screens, local food logging, local save after WebView reload, and records surviving a full app process restart.
- Native credential store: saving and removing a dummy test key. No real API key was used and no provider request was made.
- Manifest inspection: requested health permissions restricted to read steps, read sleep, and read weight. No health writes.
- Native bridge logging disabled. Fonts and exercise descriptions are packaged offline.

## Limitations

- Health Connect is unavailable on the connected phone. The native availability check returns a clear install/update message. Successful permission granting and populated health imports remain unverified.
- ChatGPT OAuth and billable AI responses were not exercised with a real account. Their native implementation is experimental pending account-specific mobile testing.
- Android Lint completed successfully after correcting local SDK-path escaping. Its engine emits Kotlin metadata compatibility diagnostics for the newer Health dependency; this limits lint analysis of that dependency. Java/Kotlin compilation and physical-device startup succeed.
- This is a development-signed personal-testing APK. Release signing, store review, independent security review, wider accessibility checks, and broader device coverage remain before a public production release.
- Apple Health, camera/barcode camera scanning, meal-photo analysis, voice, automatic background sync, and cloud accounts are outside this build.

See README.md for setup, data handling, provider boundaries, and remaining release work. Exported backups are plaintext; the local health database is not separately encrypted beyond Android device protection.
