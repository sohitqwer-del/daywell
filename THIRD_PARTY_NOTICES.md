# Third-party notices

Daywell 1.2 also uses `@capacitor-community/camera-preview` (MIT) for the in-app preview, `react-markdown` (MIT) and `remark-gfm` (MIT) for readable coach tables. Runtime package names, versions, license identifiers, and bundled license-file references are listed in `public/licenses/index.json`.

`src/data/indianFoods.ts` contains original, rounded preparation estimates authored for Daywell. It is not a reproduction of IFCT laboratory tables. These values require portion and recipe review and are released with the application source under MIT.

Daywell's own application code is MIT licensed. This does not replace licenses for dependencies or imported data.

| Component | License | Source / use |
| --- | --- | --- |
| React and React DOM | MIT | https://github.com/facebook/react — UI |
| Capacitor and official plugins | MIT | https://github.com/ionic-team/capacitor — native runtime and plugins |
| Capgo capacitor-health | MPL-2.0 | https://github.com/Cap-go/capacitor-health — Health Connect; unmodified dependency source |
| Lucide | ISC | https://github.com/lucide-icons/lucide — icons |
| Zod | MIT | https://github.com/colinhacks/zod — backup validation |
| DM Sans | SIL Open Font License 1.1 | https://github.com/googlefonts/dm-fonts — packaged offline font |
| free-exercise-db | Unlicense | https://github.com/yuhonas/free-exercise-db — 876 exercise descriptions |
| Open Food Facts | ODbL for database; other content licenses vary | https://world.openfoodfacts.org/terms-of-use — live barcode lookup; source retained in each entry |
| AndroidX libraries | Apache-2.0 | https://android.googlesource.com/platform/frameworks/support/ — native supporting libraries |
| Kotlin and kotlinx.coroutines | Apache-2.0 | https://github.com/JetBrains/kotlin and https://github.com/Kotlin/kotlinx.coroutines |

License texts for bundled frontend dependencies, Health plugin, font, and exercise data are copied into `public/licenses/` and included in the APK assets. The Health plugin is linked as a dependency; its source remains available at the linked upstream repository. No changes are made to its source files. The app manifest removes health permissions that Daywell does not use.

Open Food Facts records fetched by the user remain credited in the diary and exports. No complete Open Food Facts database or product images are shipped. Review the provider's ODbL terms before redistributing a combined database.

Version resolution is recorded in `package-lock.json` and Android Gradle files. Development tooling has additional licenses distributed with the corresponding packages.
