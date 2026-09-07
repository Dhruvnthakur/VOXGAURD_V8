# VoxGuard Shield

You are working on an existing VoxGuard project.

VoxGuard is an AI-powered voice deepfake detection and audio forensics system intended to detect AI-generated or manipulated voices during calls.

IMPORTANT:

This is an EXISTING project. Do NOT rebuild it from scratch.

Do NOT replace the existing architecture unnecessarily.

Do NOT convert the existing web frontend into React Native.

Preserve existing working functionality wherever possible.

==================================================

PROJECT ARCHITECTURE

==================================================

Current project:

VOXGUARD/

├── backend/

│   ├── main.py

│   ├── model.py

│   └── uploads/

│

└── frontend/

    ├── package.json

    ├── bun.lock

    ├── vite.config.ts

    ├── tsconfig.json

    ├── src/

    │   ├── components/

    │   │   ├── Spectrum.tsx

    │   │   └── ui/

    │   ├── hooks/

    │   ├── lib/

    │   │   ├── fft.ts

    │   │   ├── utils.ts

    │   │   └── voxguard.ts

    │   └── routes/

    │       ├── index.tsx

    │       ├── dashboard.tsx

    │       └── __root.tsx

    └── styles.css

The current web frontend is:

- React

- TypeScript

- Vite

- Bun

- Tailwind/shadcn-style UI

- TanStack Router

Do NOT convert this web frontend into React Native.

The existing web application should remain the detailed forensic-analysis dashboard.

A separate mobile application can later be created using React Native + native Android functionality.

==================================================

PRODUCT VISION

==================================================

VoxGuard should eventually support:

1. Incoming/outgoing calls through a VoxGuard-controlled calling system.

2. Automatic voice analysis during an active call.

3. Analysis enabled by default.

4. User can stop analysis at any time.

5. User can restart analysis at any time.

6. Call continues normally when analysis is stopped.

7. Audio is analyzed in short chunks rather than waiting for the entire call.

8. Each chunk is analyzed for:

   - AI/deepfake probability

   - F0 / fundamental frequency

   - Pitch characteristics

   - MFCC

   - Mel spectrogram

   - Frequency spectrum

9. Results are shown in a live risk indicator.

10. Detailed forensic results can be viewed after or during the call.

IMPORTANT PLATFORM CONSTRAINT:

Do not implement the assumption that a normal Android cellular call can simply be recorded by a third-party app through CallScreeningService.

For the live-call prototype, design the system around a VoxGuard-controlled VoIP/audio path where the application has legitimate access to the audio stream.

The architecture should therefore be:

CALL

  ↓

VoxGuard-controlled audio stream

  ↓

5-second audio buffer

  ↓

Analysis backend

  ↓

Deepfake model + F0 + MFCC + Mel

  ↓

Risk engine

  ↓

Mobile/web UI

==================================================

LIVE ANALYSIS MODEL

==================================================

Use a rolling chunk-based analysis architecture.

Initial prototype:

0–5 seconds

    ↓

Analysis 1

5–10 seconds

    ↓

Analysis 2

10–15 seconds

    ↓

Analysis 3

15–20 seconds

    ↓

Analysis 4

The 20 seconds is the initial maximum analysis window, not a requirement to wait 20 seconds before displaying a result.

The first result should appear after the first analyzed chunk.

Eventually the system can use overlapping rolling windows, but the initial UI should support sequential 5-second windows.

Example:

Window 1 → AI probability 72%

Window 2 → AI probability 81%

Window 3 → AI probability 88%

Window 4 → AI probability 92%

Then calculate/display an overall risk score.

Do NOT make one abnormal F0/MFCC/Mel feature automatically mean the voice is fake.

The primary deepfake model prediction should remain the main detection signal.

Acoustic features should be presented as supporting forensic evidence.

==================================================

ANALYSIS ON/OFF BEHAVIOR

==================================================

Analysis MUST be ON by default when a VoxGuard call starts.

State:

analysisEnabled = true

When analysis is active:

- Capture audio

- Buffer 5 seconds

- Send/process the chunk

- Receive analysis result

- Update live risk score

- Continue to next chunk

The active call must have a prominent control:

[ Stop Analysis ]

When pressed:

- Stop collecting new audio for analysis.

- Stop sending new chunks.

- Preserve already collected analysis results.

- DO NOT end the call.

- DO NOT mute the call.

- DO NOT disconnect the user.

UI should change to:

ANALYSIS PAUSED

[ Start Analysis ]

When the user presses Start Analysis:

- Resume collecting new audio chunks.

- Continue analysis.

- Keep previous results.

- Do not restart the entire call analysis history.

==================================================

MOBILE CALL UI

==================================================

The future mobile app should be designed as a professional calling application.

Main screens:

1. Home

2. Contacts

3. Dialer

4. Incoming Call

5. Active Call

6. Analysis

7. Call History

8. Settings

Active call screen:

--------------------------------

← Active Call

          Rahul

       00:12:34

VOICE ANALYSIS

● ANALYSIS ACTIVE

AI VOICE RISK

       18%

████████░░░░░░░░

[ Stop Analysis ]

F0 / PITCH

[live chart]

[ Mute ]       [ End Call ]

--------------------------------

When paused:

--------------------------------

VOICE ANALYSIS

○ ANALYSIS PAUSED

[ Start Analysis ]

Call continues normally.

No new audio is analyzed.

--------------------------------

==================================================

LIVE RISK STATES

==================================================

Create clear risk states:

LOW

MEDIUM

HIGH

CRITICAL

Example:

0–30%:

LOW RISK

30–60%:

MEDIUM RISK

60–85%:

HIGH RISK

85–100%:

CRITICAL / AI VOICE SUSPECTED

These thresholds should be configurable in one place rather than hard-coded throughout the UI.

Do not present the result as absolute certainty.

Use wording such as:

"AI voice probability"

"Detection confidence"

"Potential synthetic speech detected"

rather than claiming absolute proof.

==================================================

WEB FORENSIC DASHBOARD

==================================================

The existing web frontend should become a professional audio-forensics dashboard.

Design style:

- Modern cybersecurity aesthetic

- Dark interface

- Professional

- Minimal

- Technical

- High information density without becoming cluttered

- Subtle borders

- Clear typography

- Strong visual hierarchy

- Responsive

- Suitable for an SIH presentation/demo

- Avoid excessive gradients

- Avoid excessive animations

- Avoid generic SaaS styling

Primary dashboard structure:

-----------------------------------------------

VOXGUARD

AI VOICE FORENSICS

[ Upload Audio ]

-----------------------------------------------

DETECTION OVERVIEW

┌─────────────────┐

│ AI GENERATED    │

│                 │

│ 91.4%           │

│ CONFIDENCE      │

└─────────────────┘

REAL PROBABILITY

████░░░░░░ 8.6%

AI PROBABILITY

█████████░ 91.4%

-----------------------------------------------

AUDIO

Audio player

Waveform

Filename

Duration

Sample rate

-----------------------------------------------

FREQUENCY SPECTRUM

Existing Spectrum.tsx should be preserved and improved where appropriate.

-----------------------------------------------

F0 / PITCH ANALYSIS

Live/recorded pitch contour

Metrics:

Mean F0

Minimum F0

Maximum F0

Pitch range

F0 standard deviation

Voiced percentage

-----------------------------------------------

MFCC ANALYSIS

Display MFCC as a heatmap.

X axis:

Time

Y axis:

MFCC coefficient

Use a canvas or efficient visualization approach.

-----------------------------------------------

MEL SPECTROGRAM

Display Mel spectrogram as a heatmap.

X axis:

Time

Y axis:

Mel frequency bands

Use an efficient canvas-based implementation if appropriate.

-----------------------------------------------

FORENSIC METRICS

Duration

Sample rate

Number of MFCC coefficients

Number of Mel bands

Mean F0

Pitch range

Detection confidence

-----------------------------------------------

ANALYSIS TIMELINE

Show analysis windows:

0–5 sec      72% AI

5–10 sec     81% AI

10–15 sec    88% AI

15–20 sec    92% AI

-----------------------------------------------

FORENSIC SUMMARY

Provide a concise summary of the model and acoustic analysis.

Do not invent analysis data.

If data is unavailable, show an appropriate empty state.

==================================================

UPLOAD EXPERIENCE

==================================================

The upload interface should support:

- Browse button

- Drag and drop

- WAV/MP3/M4A where supported by backend

- Filename

- File size

- Audio duration if available

- Audio preview

- Clear/remove file

- Analyze button

States:

EMPTY

FILE SELECTED

UPLOADING

ANALYZING

COMPLETE

ERROR

The Browse button MUST actually work.

The file should be sent to the backend through the existing API layer.

Do not hard-code results.

==================================================

BACKEND API

==================================================

The existing FastAPI backend exposes:

POST /api/analyze

It accepts an audio file and returns:

success

filename

prediction

confidence

probabilities

The frontend should consume this API.

Do not create fake detection responses.

Create/modify the API abstraction in:

src/lib/voxguard.ts

or create:

src/lib/api.ts

if that makes the architecture cleaner.

Keep all HTTP communication centralized.

The frontend should NOT contain duplicated fetch logic.

==================================================

EXPECTED ANALYSIS RESPONSE

==================================================

Design the frontend API types so they can support:

{

  "success": true,

  "filename": "voice.wav",

  "prediction": "fake",

  "confidence": 0.94,

  "probabilities": {

    "real": 0.06,

    "fake": 0.94

  },

  "audio": {

    "duration": 8.42,

    "sample_rate": 16000

  },

  "f0": {

    "time": [],

    "frequency": [],

    "mean": 187,

    "min": 142,

    "max": 261,

    "std": 31

  },

  "mfcc": {

    "data": [],

    "coefficients": 20

  },

  "mel_spectrogram": {

    "data": [],

    "mel_bands": 64

  }

}

The backend may initially return only:

prediction

confidence

probabilities

The frontend must gracefully handle missing F0/MFCC/Mel data.

Do not display fake placeholder analysis values as if they were real.

==================================================

COMPONENTS TO CREATE

==================================================

Create reusable components where appropriate:

AudioUploader.tsx

DetectionResult.tsx

ConfidenceMeter.tsx

ForensicMetrics.tsx

F0Chart.tsx

MFCCHeatmap.tsx

MelSpectrogram.tsx

AnalysisTimeline.tsx

RiskIndicator.tsx

Keep:

Spectrum.tsx

and preserve the existing FFT functionality.

Components should receive data through props rather than containing hard-coded values.

==================================================

F0 / PITCH

==================================================

F0 and pitch should be treated as the same fundamental-frequency analysis.

Do not create redundant separate systems.

Display:

F0 contour

Mean F0

Minimum F0

Maximum F0

F0 variation

Voiced/unvoiced information when available

Use a line chart.

==================================================

MFCC

==================================================

MFCC should be represented as a time-varying matrix.

Display as a heatmap:

Y axis:

MFCC coefficient

X axis:

Time

Do not attempt to represent thousands of values using thousands of DOM elements.

Prefer Canvas or another efficient rendering approach.

==================================================

MEL SPECTROGRAM

==================================================

Display:

Y axis:

Mel frequency

X axis:

Time

Use a heatmap.

Prefer Canvas or another efficient rendering approach.

==================================================

FREQUENCY SPECTRUM

==================================================

Keep the existing:

src/components/Spectrum.tsx

and:

src/lib/fft.ts

Do not remove them.

The frequency spectrum should visualize the uploaded/current audio.

If possible, make it update smoothly while analyzing live audio.

==================================================

FORENSIC ANALYSIS TIMELINE

==================================================

For live analysis, maintain previous results.

Example:

Window 1

0–5 sec

AI probability 72%

Window 2

5–10 sec

AI probability 81%

Window 3

10–15 sec

AI probability 88%

Window 4

15–20 sec

AI probability 92%

Display these as a timeline or compact chart.

==================================================

CALL ANALYSIS PRIVACY UX

==================================================

Make analysis status explicit.

When active:

"AI voice analysis active"

When paused:

"AI voice analysis paused"

When possible, clearly indicate that audio is being processed.

Do not imply that calls are recorded permanently.

The intended architecture is:

audio chunk

→ analysis

→ result

→ temporary processing/deletion

Actual data retention should be controlled by backend policy.

==================================================

RESPONSIVE DESIGN

==================================================

Desktop:

Use a multi-column forensic dashboard.

Mobile:

Use vertically stacked cards.

The interface should work well at:

320px+

768px+

1024px+

1440px+

Charts must resize correctly.

Do not allow heatmaps or charts to overflow horizontally.

==================================================

EXISTING UI COMPONENTS

==================================================

The project already contains shadcn/Radix-style components in:

src/components/ui/

Reuse these components.

Do not delete the entire UI component directory.

Do not recreate buttons/cards/dialogs unnecessarily.

Only add new components when needed.

==================================================

FILES TO MODIFY

==================================================

Primary:

src/routes/index.tsx

src/routes/dashboard.tsx

src/routes/__root.tsx

src/components/Spectrum.tsx

src/lib/voxguard.ts

src/lib/fft.ts

src/styles.css

Create:

src/components/AudioUploader.tsx

src/components/DetectionResult.tsx

src/components/ConfidenceMeter.tsx

src/components/ForensicMetrics.tsx

src/components/F0Chart.tsx

src/components/MFCCHeatmap.tsx

src/components/MelSpectrogram.tsx

src/components/AnalysisTimeline.tsx

src/components/RiskIndicator.tsx

If an existing component already provides equivalent functionality, modify/reuse it instead of duplicating it.

==================================================

DO NOT MODIFY UNNECESSARILY

==================================================

Do not modify:

node_modules/

bun.lock unless dependency changes are genuinely required

routeTree.gen.ts unless routing generation requires it

server.ts

start.ts

Do not convert the project to another framework.

Do not convert the web application to React Native.

Do not change the Python backend while performing a UI-only task unless required for API compatibility.

==================================================

MOBILE APPLICATION

==================================================

The mobile version should eventually be a separate React Native application.

Suggested architecture:

mobile/

├── React Native

├── TypeScript

├── android/

│   └── native Android integration

└── src/

    ├── screens/

    │   ├── Home.tsx

    │   ├── IncomingCall.tsx

    │   ├── ActiveCall.tsx

    │   ├── Analysis.tsx

    │   └── History.tsx

    ├── components/

    │   ├── RiskIndicator.tsx

    │   ├── F0Chart.tsx

    │   ├── MFCCHeatmap.tsx

    │   └── MelSpectrogram.tsx

    └── services/

        └── api.ts

The mobile application should eventually use a VoxGuard-controlled VoIP/audio path.

Do not assume that a standard cellular call can be captured by the application simply because the user presses "Merge call".

==================================================

BACKEND FUTURE ARCHITECTURE

==================================================

The backend should eventually become:

backend/

├── main.py

├── model.py

├── audio_features.py

├── risk_engine.py

└── uploads/

model.py:

Deepfake model inference

audio_features.py:

F0

MFCC

Mel spectrogram

Spectral features

risk_engine.py:

Combine model outputs over multiple windows

main.py:

API endpoints

Potential future endpoint:

POST /api/analyze-chunk

This receives one short audio chunk and returns:

- prediction

- confidence

- probabilities

- F0 statistics

- MFCC information

- Mel spectrogram information

Do not implement a fake streaming system.

==================================================

QUALITY REQUIREMENTS

==================================================

The final UI must:

- Look production-quality

- Look appropriate for cybersecurity/audio forensics

- Have strong visual hierarchy

- Have no broken buttons

- Have no dead navigation

- Have proper loading states

- Have proper error states

- Have empty states

- Work responsively

- Avoid hard-coded analysis results

- Preserve existing functionality

- Use reusable components

- Keep TypeScript types clean

- Avoid unnecessary dependencies

- Avoid huge DOM-based heatmaps

- Keep chart performance reasonable

==================================================

MOST IMPORTANT REQUIREMENT

==================================================

Do not simply create a visually attractive mockup.

The UI must be structured around REAL data coming from the existing FastAPI backend.

Current working flow:

Audio file

    ↓

POST /api/analyze

    ↓

FastAPI

    ↓

model.py

    ↓

Wav2Vec2 deepfake detector

    ↓

prediction + confidence + probabilities

    ↓

React dashboard

Extend the UI architecture so that F0, MFCC, Mel spectrogram, pitch and live chunk analysis can be added without rewriting the application.

Build the UI so the backend can progressively expose these features.

Do not fabricate results.

==================================================

FINAL RESULT

==================================================

The result should feel like a serious AI voice-forensics product:

VOXGUARD

"Detect synthetic voices before they become a threat."

The application should clearly communicate:

CALL

    ↓

VOICE

    ↓

ANALYSIS

    ↓

AI DETECTION

    ↓

FORENSIC FEATURES

    ↓

RISK

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/131eb30d-cc24-451c-9947-05587cb3c43e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
