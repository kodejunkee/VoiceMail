# VoiceMail Assist

A voice-based email system designed for visually impaired users. Send, receive, and manage emails entirely through voice interaction.

---

## 📁 Project Structure

```
VoiceMail/
├── app/                        # React Native Expo frontend
│   ├── app/                    # expo-router screens
│   │   ├── _layout.tsx         # Root layout + auth guard
│   │   ├── index.tsx           # Splash screen
│   │   ├── login.tsx           # Login / signup screen
│   │   └── (tabs)/            
│   │       ├── _layout.tsx     # Tab layout (hidden bar)
│   │       ├── home.tsx        # Voice command hub
│   │       ├── compose.tsx     # Voice email composition
│   │       ├── inbox.tsx       # Inbox listing
│   │       └── read.tsx        # Read single email
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API, Supabase, command parser
│   ├── context/                # Auth context provider
│   ├── constants/              # Colors, prompts, config
│   ├── app.json                # Expo configuration
│   └── package.json
│
├── backend/                    # Node.js Express server
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── routes/email.ts     # Email CRUD endpoints
│   │   ├── services/           # Nodemailer + Supabase
│   │   ├── middleware/         # JWT auth middleware
│   │   └── types/              # TypeScript interfaces
│   ├── .env                    # Environment variables
│   └── package.json
│
├── supabase_schema.sql         # Database schema
└── README.md                   # This file
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo SDK 54) + TypeScript |
| Navigation | expo-router (file-based) |
| Speech-to-Text | expo-speech-recognition |
| Text-to-Speech | expo-speech |
| Auth & Database | Supabase |
| Backend | Node.js + Express |
| Email | Nodemailer (Gmail SMTP) |

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- A Supabase project (free tier)
- Gmail account with 2FA enabled + App Password
- Android Studio (for Android) or Xcode (for iOS)

### 1. Database Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the **SQL Editor**
3. Copy and paste the contents of `supabase_schema.sql`
4. Click **Run** to create the tables and policies

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env with your credentials:
#   SUPABASE_URL=<your-project-url>
#   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
#   GMAIL_USER=<your-gmail@gmail.com>
#   GMAIL_APP_PASSWORD=<your-app-password>

# Start the development server
npm run dev
```

The backend will run on `http://localhost:3001`.

### 3. Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

### 4. Build for Device (Required for Voice Features)

Speech recognition requires a **development build** — it does NOT work in Expo Go.

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### 5. Configure API URL for Physical Device

If testing on a physical device, update the `API_URL` in `app/app.json` to your computer's local IP:

```json
"extra": {
  "API_URL": "http://192.168.x.x:3001"
}
```

---

## 🎙️ Voice Commands

### Home Screen
| Command | Action |
|---|---|
| "Compose email" | Open compose screen |
| "Read inbox" / "Check email" | Open inbox |
| "Help" | Hear available commands |
| "Logout" | Sign out |

### Compose Screen
The compose flow is guided step-by-step:
1. Speak recipient email address
2. Confirm with "yes" or "no"
3. Speak subject
4. Speak message
5. Say "send" to send

### Inbox Screen
| Command | Action |
|---|---|
| "Next" | Next email |
| "Previous" | Previous email |
| "Open" / "Read it" | Open current email |
| "Delete" | Delete current email |
| "Go back" | Return to home |

### Read Email Screen
| Command | Action |
|---|---|
| "Repeat" | Read email again |
| "Delete" | Delete email |
| "Go back" | Return to inbox |

---

## 🔐 Authentication

- Uses Supabase email/password authentication
- Sessions are persisted securely using `expo-secure-store`
- All API requests include the JWT token in the Authorization header

---

## 📧 Email Flow

```
Voice Input → Speech-to-Text → Command Parser → UI Action → API Call → Response → Text-to-Speech
```

1. User speaks a command
2. `expo-speech-recognition` transcribes it
3. `commandParser.ts` maps text to a structured command
4. The screen handles the command (navigate, send, etc.)
5. Backend processes the request
6. `expo-speech` reads the result back to the user

---

## ⚠️ Important Notes

- **Physical device required** — Speech recognition needs a real microphone
- **Development build required** — Expo Go does not support native modules
- **Gmail App Password** — Standard passwords don't work; use an App Password
- **iOS Silent Mode** — TTS won't produce sound if the iPhone is in silent mode
- **Email demo** — Received emails only appear if the recipient is also a VoiceMail user

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/send-email` | Send an email |
| GET | `/api/emails` | Get all user emails |
| GET | `/api/emails/:id` | Get single email |
| DELETE | `/api/emails/:id` | Delete an email |
| PATCH | `/api/emails/:id/read` | Mark as read |

All endpoints require `Authorization: Bearer <token>` header.
