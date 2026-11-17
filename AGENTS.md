# Regole di Progetto / Project Instructions

## Release & Versione
- **Aggiornamento Release Obbligatorio**: Dopo ogni modifica, feature o correzione apportata al progetto, incrementare sempre la versione di release in:
  1. `package.json` (`version`, es. patch increment `2.20.x`)
  2. `android/app/build.gradle` (`versionName` corrispondente e incrementare `versionCode`)
  3. Sincronizzare sempre gli asset Android (`android/app/src/main/assets/public`) eseguendo `npm run build` (che include `npx cap copy android`).
