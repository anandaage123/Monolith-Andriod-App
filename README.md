# DailyHub Android Productivity Suite

## Overview
DailyHub is a comprehensive Android productivity application designed to seamlessly blend daily organizational tools with a robust, highly secure "Vault" feature. The app consists of several screens built with React Native and Expo.

## Core Screens
*   **DashboardScreen:** The central hub summarizing the user's daily data.
*   **BudgetScreen:** For tracking daily finances and expenses.
*   **FocusScreen:** A Pomodoro timer with customizable audio and session alerts.
*   **NotesScreen:** For jotting down text-based thoughts.
*   **TodosScreen:** A task manager.
*   **VaultScreen:** A secure, media-hiding feature powered by zero-knowledge architecture.

## The Vault Architecture
The `VaultScreen` is DailyHub's standout privacy feature, designed with **plausible deniability** in mind.

### Key Security Features:
1.  **Dual PIN System (Decoy Architecture):**
    *   **Primary PIN:** Unlocks the true hidden folder containing sensitive personal media.
    *   **Decoy PIN:** If coerced, the user can input this secondary PIN. It opens a completely different `AsyncStorage` list containing fake/innocuous hidden files.
    *   *The UI is 100% identical regardless of which PIN is used, ensuring the attacker has no idea the true vault exists.*
2.  **Partitioned Storage (`Zero-Knowledge`):**
    *   Metadata is partitioned into `@vault_items_primary` and `@vault_items_decoy`.
    *   Hidden files moved from the device's gallery are segregated on disk (e.g., `hidden_primary_1234.jpg` vs `hidden_decoy_5678.jpg`).
3.  **App State Listener (Auto-lock):**
    *   If the user minimizes DailyHub and backgrounds it, the `AppState` listener immediately locks the vault, clears the state, and forces PIN re-entry upon returning.
4.  **Asymmetric Settings Model:**
    *   When logged into the Decoy vault, the settings menu is severely restricted, hiding any option to manage the Primary PIN or remove main security features.
5.  **Multi-Step Blind Onboarding:**
    *   Users are guided to set up both PINs sequentially, forcing them to establish the decoy profile immediately instead of treating it as an afterthought.

## Future AI Instructions
*   When editing React Native components, prioritize exact imports used by Expo (e.g., `expo-file-system/legacy`, `expo-media-library`).
*   Avoid standard web-only Node APIs; stick to React Native ecosystem tools.
*   The project relies heavily on `AsyncStorage` for local state persistence.
