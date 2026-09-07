# VoxGuard Mobile

React Native / Expo mobile app for VoxGuard — live call deepfake detection.

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- For iOS: Xcode + iOS Simulator
- For Android: Android Studio + emulator, or a physical device with Expo Go

### Install

```bash
cd mobile
npm install
# or
yarn install
```

### Run

```bash
# Start the dev server
npm start
# or
npx expo start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Backend

The mobile app posts 5-second audio chunks to your FastAPI backend at:
`POST /api/analyze-chunk`

Go to **Settings** in the app and set your backend URL (e.g. `http://192.168.1.20:8000` on LAN).

## Project Structure

```
mobile/
├── app/
│   ├── _layout.tsx       — Root layout (fonts, status bar, navigation)
│   ├── index.tsx         — Main call screen (risk dial + rolling windows)
│   ├── forensics.tsx     — Per-window forensic details
│   └── settings.tsx      — Backend URL configuration
├── components/
│   ├── RiskDial.tsx      — SVG arc dial with animated pulse ring
│   └── Panel.tsx         — Shared card panel component
├── lib/
│   ├── voxguard.ts       — Domain types, risk model, API calls
│   ├── useLiveAnalysis.ts — Audio recording + analysis hook (expo-av)
│   └── theme.ts          — Design tokens matching the web frontend
├── assets/               — App icons and splash screen
├── app.json              — Expo configuration
└── package.json
```

## Color Scheme

The app mirrors the web frontend's oklch color palette, converted to sRGB:

| Token        | Value     | Usage                    |
|--------------|-----------|--------------------------|
| background   | `#dfe8d3` | Screen background        |
| primary      | `#3a6645` | Buttons, ring            |
| foreground   | `#2e4a35` | Primary text             |
| card         | `#d8e1cc` | Panel backgrounds        |
| riskLow      | `#4a7c5a` | ≤30% AI probability      |
| riskMedium   | `#b5830a` | 30–60%                   |
| riskHigh     | `#c7581a` | 60–85%                   |
| riskCritical | `#c23020` | >85% — AI suspected      |
