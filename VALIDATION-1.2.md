# Daywell 1.2 verification

## Scope

New: in-app camera preview with zoom, shutter, camera switch and supported torch; system-camera fallback; per-food plate portions; Indian food categories and aliases; diet-plan tables; GPT workout proposals; a manual shorter-session option; rest-day preferences; readable Markdown tables in coaching; and improved ChatGPT browser return handling.

The bundled Indian food entries are original indicative preparation estimates, not a copied IFCT laboratory dataset. Bowl size, ingredients and cooking fat vary. Check portions and recipe values.

## Test boundaries

- Unit tests validate food IDs, unique Indian food records, searchable aliases, per-dish arithmetic, diet restrictions, malformed model output and completed-set preservation.
- Browser tests use local fixtures, not actual AI responses. They cover manual diary flows, photo backup/restore, per-food portions, preservation of an unsaved photo while opening AI settings, diet-table calculations, and shortening a session.
- Generated meal/workout plans require a connected provider and explicit review. The app calculates nutrition using its own saved foods instead of trusting model-supplied totals. GPT cannot directly overwrite logs.
- ChatGPT login requires an eligible account and user authorization. A browser opening is not a successful authentication test. Successful login or inference must be reported separately after it is observed.
- Android camera preview requires Camera permission. No microphone, broad gallery-storage access or location permission is requested by Daywell. Capturing a photo is an explicit action.

This remains a development-signed personal-testing beta, not a medical device or a Play Store production release. Health Connect, live model availability, hardware camera performance, account eligibility, and allergies/medical needs require separate review.
