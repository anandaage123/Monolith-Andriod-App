# Methodic Muse - Project Map & Agent Instructions

## Project Overview
A holistic productivity and privacy app built with Expo, React Native, and TypeScript. 
Theme: "Methodic Muse" - minimalist, elegant, dark-themed (deep purples, slate, and high-contrast text).

## Project Structure
- `src/screens/`: Main application features.
- `src/navigation/`: React Navigation configuration.
- `src/theme/`: Global color palette (`MM_Colors`) and typography.
- `assets/`: Static assets (images, fonts, sounds).

## Key Files & Functionalities

### 1. Dashboard (`src/screens/DashboardScreen.tsx`)
- **Greeting & Date**: Dynamic greeting based on time.
- **Quotes**: Swipeable quote card fetching from `dummyjson.com/quotes/random`.
- **Daily Rituals**: Habit tracking with icon selection. Supports toggle and long-press to delete.
- **Weather**: Integrated with `expo-location` and `open-meteo`. Location-aware weather updates.
- **Focus Metrics**: Dynamic progress bars for Ritual Completion and Budget Health.
- **Vault Entry**: Hidden entry via long-press (2s) on the "Daily Hub" logo.

### 2. Deep Focus (`src/screens/FocusScreen.tsx`)
- **Timer**: Pomodoro timer with 'Work' and 'Break' modes.
- **Breathing Animation**: Pulse animation (max 1.08x) during inhalation/exhalation cycles.
- **Audio**: Uses `expo-audio` for timer end alerts.
- **Presets**: Quick-select buttons for common durations.

### 3. Journal (`src/screens/NotesScreen.tsx`)
- **Security**: Protected by a 6-digit PIN. Supports Reset PIN via email.
- **Features**: Create/Edit/Delete musings with mood and category tagging.
- **Search & Filter**: Search by text and filter by category (Personal, Work, Ideas).
- **Export**: Share journal entries as a text file.

### 4. Daily Tasks (`src/screens/TodosScreen.tsx`)
- **Task Management**: Add tasks with Low/Med/High priority.
- **Focus Task**: Long-press a task to set it as the primary focus.
- **Sweep**: Custom modal to clear all tasks for a fresh start.

### 5. Secure Vault (`src/screens/VaultScreen.tsx`)
- **Dual PINs**: Primary PIN for real vault, Decoy PIN for a secondary safe space.
- **Media**: Secure storage for images/videos. Fullscreen viewer using `expo-video` for playback.
- **Passwords**: Encrypted storage for site credentials.
- **Gestures**: Long-press on media thumbnails to Restore/Remove.

### 6. Wallet (`src/screens/BudgetScreen.tsx`)
- **Transactions**: Track income and expenses.
- **Location-based Currency**: Automatically sets symbol (₹, $, €) based on recent weather location.
- **SectionList**: Groups transactions by date for a clean ledger view.
- **Advanced Filter**: Modal to select specific Month and Year for historical data.

## Implementation Guidelines
- **Padding/Scrolling**: Content should be centered or top-aligned. Avoid excessive bottom padding that results in empty "black space" when scrolling. Use `scrollEnabled={contentHeight > screenHeight}` where applicable.
- **Theme Consistency**: Always use the `MM_Colors` palette.
- **State Management**: Uses `AsyncStorage` for persistence across all modules.
- **Permissions**: Handle location and media library permissions gracefully with alerts.
