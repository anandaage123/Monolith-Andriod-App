# Daily Life

**Daily Life** is a comprehensive productivity and lifestyle management application built with React Native and Expo. It features a sleek dark-themed interface designed to help users manage their daily tasks, habits, and focus sessions in one place.

## 📱 UI Design & Aesthetics

The application follows a modern **Dark-Theme** aesthetic with the following design principles:
- **Color Palette**: Deep Charcoal (`#1E1E2C`) background with Gold (`#FFD700`) and Vibrant Purple (`#7148FC`) accents.
- **Typography**: Clean, bold headers with readable, high-contrast body text using Manrope and Inter styles.
- **Navigation**: An intuitive bottom tab navigator for quick access to core modules.
- **Glassmorphism**: Subtle use of surface highlights and blurs to create depth.
- **Adaptive Icons**: Support for modern Android adaptive icons with matching theme colors.

---

## 🚀 Core Functionalities

### 1. 🏠 Dashboard (Home)
- **Daily Greeting**: Personalized greetings based on the time of day.
- **Weather Integration**: Live weather updates using the Open-Meteo API. Users can search and set their city.
- **Daily Inspiration**: Fetches daily motivational quotes from the ZenQuotes API.
- **Habit Tracker**: Track daily recurring habits with a simple toggle mechanism. Features long-press deletion.

### 2. 📝 Task Management (Tasks)
- **Priority-Based To-Dos**: Add tasks with Low, Medium, or High priority levels.
- **Auto-Reset**: Daily tasks automatically uncheck at the start of a new day to encourage consistency.
- **Sweep Feature**: Easily clear all tasks with a single "Sweep" action.
- **Persistence**: All tasks are saved locally using `AsyncStorage`.

### 4. ⏱️ Focus Timer (Focus)
- **Liquid-Fill Animation**: A modern visual timer where the background "fills" up as time progresses, providing an intuitive sense of remaining time.
- **Asymmetric Mode Selection**: Switch between "Deep Work" and "Short Break" using a modern, card-based interface.
- **Advanced Customization**: Dedicated Settings Modal to fine-tune Focus and Break durations independently.
- **Interactive Controls**: Features a primary Gradient Start/Pause button, a session Reset, and quick-skip functionality.
- **Editorial Quotes**: Displays context-relevant productivity insights (e.g., Stephen Covey) to maintain motivation during focus blocks.
- **Audio Notifications**: High-quality alerts play automatically upon session completion.

### 5. 📓 Notes (Notes)
- **Quick Jot**: Create and manage personal notes.
- **Rich Interaction**: Simple interface for capturing thoughts on the go.

### 6. 🔐 Secret Vault
- **Hidden Access**: A secret navigation trigger on the Dashboard (Long press on header) allows access to a private Vault area.

---

## 🛠️ Technical Implementation

- **Framework**: React Native (Expo SDK 55+)
- **Graphics**: `expo-linear-gradient` for premium UI effects.
- **Audio**: `expo-av` for haptic-like sound feedback.
- **Storage**: `@react-native-async-storage/async-storage` for local data persistence.
- **Navigation**: `@react-navigation/native` with Stack and Bottom Tab navigators.
- **API Connectivity**: Integration with Geocoding, Open-Meteo, and ZenQuotes.

---

## 🌐 Web Companion (Monolith Remote)

A powerful companion website hosted on **GitHub Pages** acts as a fully-featured desktop remote for the Android app. 

### How It Works
- **Feature Parity**: The web interface mirrors all native app functionalities: Focus Timers, To-Dos management, Dashboard insights, and Journaling.
- **Unique Pairing Code**: Access the remote by inputting a unique connection code generated directly by your Android app.
- **Real-time Synchronization**: Acts as a near-instant remote control. Start a timer or add a task on the web, and it will immediately reflect in the app. Data is synced over WebSockets/WebRTC using the device code.
- **App as Source-of-Truth**: The phone's local database acts as the master storage. The website securely requests the latest state when paired, guaranteeing absolute data privacy and continuity without requiring a dedicated cloud backend.
- **Demo Mode Preview**: Includes a manual fallback "Demo Mode" for testing layout refinements without an active device connection.

---

## 📦 Build & Run

To build an independent APK and install it on your device, use the included script:
```bash
./new.sh
```
This generates `DailyLife.apk` in the root folder and pushes it to your connected Android device.
