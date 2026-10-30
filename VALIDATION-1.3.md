# Daywell 1.3 recognition verification

## What changed

Food identity is now separate from nutrition estimation. A vision provider proposes dish names, qualitative uncertainty and alternatives. Daywell suggests matches from its library; the user confirms each food and pictured serving count. Nutrition is calculated from the selected library values. Unknown dishes remain explicitly unestimated.

The API-key route requests a strict JSON response format. The ChatGPT-plan route uses client-validated JSON to respect that route's preview limitations. Both paths reject malformed output. No nutrition numbers from the recognition model are applied to the log.

Opted-in label choices are stored locally and can be removed from Memory. Recognition requests may include those label hints. This is not visual-model training, an offline classifier, or a measured confidence probability.

## Test boundaries

Pure tests use controlled model-response fixtures and a provider-adapter spy. UI tests cover confirmation, unknown nutrition and camera cancellation. Browser flows cover photo selection, low-light warnings, rotation, draft recovery, per-food portions, backup and existing logging/planning flows.

These tests verify protocol, calculations and interactions. They do **not** measure recognition accuracy on real food photos. Live recognition requires an eligible connected account/model; no live account or paid API request was used for verification.

No USB device was connected during this update. In-app camera hardware, a real capture and actual ChatGPT authorization still need a device/account test. Existing data fields keep backward-compatible defaults and the Android application ID remains unchanged.

## Privacy

New meal-photo drafts are stored privately on the device and can be resumed or discarded. Unsaved drafts are not part of the logged-meal backup. Processed photos are re-encoded without original EXIF metadata. Photos and drafts are not separately encrypted beyond device protection; AI credentials remain in Android Keystore-backed encryption. No photo is sent merely by opening the camera or saving a manual meal.
