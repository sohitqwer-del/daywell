# Changes

## 1.3.0 beta

- Catalog-grounded food recognition: dish suggestions, qualitative uncertainty, alternatives and a clarification step.
- Separate recognition from nutrition. Users confirm library foods and pictured servings; unrecognized foods remain unestimated.
- Optional label-choice feedback, removable in Memory. This is not visual-model training.
- Resumable new-meal photo drafts, private on-device storage, rotation and low-light/small-image checks.
- Camera close/cancel no longer waits for a pending native start/stop call. Restart is offered after failure, and unsupported flash modes do not imply camera failure.
- Validation and regression coverage for recognition protocol, data migration, confirmation, draft recovery and camera lifecycle.

Real-photo accuracy, live account authorization and hardware capture were not verified during this update. Recognition requires an eligible connected account and an image-capable model. No offline visual classifier is included.

## 1.2.0 beta

- In-app camera preview, shutter, pinch zoom, camera switch and supported torch. System camera/gallery fallback retained.
- Per-food photo portions, including different eaten percentages for each dish.
- More than 80 additional Indian preparations, household portions, categories and aliases. All are labelled indicative estimates.
- Diet planning with an editable table. GPT uses known food IDs; nutrition totals are calculated by Daywell.
- Daily GPT workout drafts based on time, energy, equipment and constraints.
- Manual shortening of an active session, explicit rest-day preference, and preservation of completed sets.
- Coach Markdown tables, photo-preserving AI setup, and better browser sign-in return handling.
- Public source, CI, security notes, runtime license metadata, and compatibility tests.

Provider authentication, eligible plan/model availability, and live inference require the user's account authorization. A model-generated recommendation is not medical advice. This beta APK is development-signed for personal testing.

## 1.1.0

Renamed Forma to Daywell without changing its Android identity. Added photo logging, portion percentages, recipes, favourites, repeat meals, weekly routines and strength records.
