# Music Player (Windows 11 desktop app)

Same UI as the original web app, wrapped in Electron so it builds to a real Windows `.exe`.

## Build the .exe (on Windows 10/11)
1. Install Node.js 20+ from https://nodejs.org
2. Double-click `build-windows.bat` (or run `npm install` then `npm run dist:win`)
3. Find the results in `release/`:
   - `MusicPlayer-1.0.0-x64.exe` (installer, with Start Menu / desktop shortcut and "Open with" file associations)
   - a portable `.exe` (no install needed)

No Windows PC? Push this folder to GitHub and run the "Build Windows exe" workflow (Actions tab); download the .exe from the run's artifacts.
Build on Windows (or the CI above): building on Linux/macOS would bundle the wrong ffmpeg binary.

Run without packaging: `npm install` then `npm start`.

## What was added (UI untouched)
- **All audio formats**: MP3, FLAC, WAV, OGG/Opus, M4A/AAC play directly. WMA, APE, ALAC, AIFF, WavPack, AC3, DTS, DSD, MKA, MPC, TTA, AMR, CAF etc. are converted on first play with a bundled ffmpeg (cached, seekable), so EQ, speed and the spectrum still work.
- **Thumbnails / tags**: embedded cover art, title, artist, album, genre, year, track number, bitrate, sample rate and channels are read from every file. Songs are grouped into real albums/artists with their cover.
- Windows media overlay + keyboard media keys show title, artist and cover art.
- Double-click / "Open with" an audio file, drag & drop files, or use the existing file/folder pickers.
- Fonts are bundled, so the app works fully offline.

## v1.1
- Clean install: no bundled songs, albums, artists or playlists.
- Your library, playlists, favorites, queue and every setting are saved automatically and restored on the next launch (stored in your Windows user profile, not inside the app).
- Songs and Artists views have Large / Medium / Small grid sizes as well as the list.
- Audio output device picker (speaker button in the player bar) and "Pause when other apps play media".
- New visualizers on the Now Playing page: Mirror, Circle, Scope, Dots, Aurora (plus Bars and Wave).
- New music-note app icon.
