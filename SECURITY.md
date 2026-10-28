# Security and privacy

This is a personal-testing Android app, not a medical device. Do not put API keys, OAuth tokens, health records, photos, or backups in public issues.

For sensitive reports, use the repository's private vulnerability-reporting feature if enabled, or contact the maintainer privately through their GitHub profile. Include affected versions and a minimal reproduction without personal data.

Credentials are encrypted using Android Keystore. OAuth uses a browser, PKCE, state, nonce, issuer/audience/expiry checks, and signature verification. A successful identity token alone does not authorize plan usage. The Android loopback flow depends on provider availability and the user's account.

Photo and diary files are app-private but are not separately encrypted beyond device protection. Plaintext exports may include photos. Keep them private. Native bridge logging is disabled, and no analytics or ads are bundled.

AI food estimates and plans can be wrong. Review portions, ingredients, exercise choices, and medical constraints yourself. The app never applies a generated plan without an explicit action.
