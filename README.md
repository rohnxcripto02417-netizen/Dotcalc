# Dotcalc 2.0.0: build a free APK (no watermark)

Nothing here costs money, adds ads, or adds a watermark. The APK bundles your app files inside it,
so it works offline and needs no website.

## Option A: build in the cloud (no Android Studio needed)
1. Make a free account at https://github.com and create a new repository.
2. Upload everything in this folder (keep the `.github` folder). Easiest: install GitHub Desktop, or use "Add file > Upload files".
3. Open the repository's **Actions** tab > **Build APK** > **Run workflow**.
4. After a few minutes, open the finished run and download the **Dotcalc-apk** artifact. Unzip it to get `Dotcalc-2.0.0.apk`.
5. Copy the APK to your phone and open it. Allow "Install unknown apps" when asked.

## Option B: build on your computer
Install Node.js 20, JDK 17 and Android Studio, then in this folder:
```
npm install
mkdir www && cp -r app/. www/        (Windows: xcopy app www /E /I)
npx cap add android
npx @capacitor/assets generate --android
npx cap sync android
cd android && ./gradlew assembleRelease   (then sign it with apksigner)
```
The APK is at `android/app/build/outputs/apk/release/`.

## Notes
- This is a release-signed, non-debuggable APK (the debug kind is what triggers virus warnings). Uninstall any older version first, because it was signed with a different key.
  Google Play needs a release-signed `.aab` instead: use the PWABuilder or Bubblewrap route in the earlier play-ready package.
- App name: change `appName` in `capacitor.config.json`. Package ID: change `appId` (cannot change after publishing).
- Updating: change files in `app/`, push to GitHub, run the workflow again. Raise `version` numbers when publishing.
