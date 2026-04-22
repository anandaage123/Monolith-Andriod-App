import { NativeModules, Platform } from 'react-native';

/**
 * WidgetBridge — pushes live task/timer state to the Android homescreen widget.
 *
 * Usage:
 *   import WidgetBridge from './services/WidgetBridge';
 *   WidgetBridge.update({ activeTasks: 3, timerSeconds: 1500, isRunning: false, sessionName: '' });
 */

interface WidgetState {
  activeTasks: number;
  timerSeconds: number;
  isRunning: boolean;
  sessionName?: string;
}

const { MonolithWidget } = NativeModules;

function update(state: WidgetState) {
  if (Platform.OS !== 'android' || !MonolithWidget) return;
  try {
    MonolithWidget.updateWidget({
      active_tasks:   state.activeTasks,
      timer_seconds:  state.timerSeconds,
      timer_running:  state.isRunning,
      session_name:   state.sessionName ?? '',
    });
  } catch (_) {
    // Widget not installed or bridge unavailable — fail silently
  }
}

export default { update };
