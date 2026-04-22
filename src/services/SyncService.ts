import AsyncStorage from '@react-native-async-storage/async-storage';

let ws: WebSocket | null = null;
let syncCode: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

// Subscribers
type SyncCallback = (type: string, payload: any) => void;
const subscribers: SyncCallback[] = [];

export const subscribeToSync = (callback: SyncCallback) => {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx > -1) subscribers.splice(idx, 1);
  };
};

const notifySubscribers = (type: string, payload: any) => {
  subscribers.forEach(cb => cb(type, payload));
};

export const getSyncCode = async (): Promise<string | null> => {
  if (syncCode) return syncCode;
  const cached = await AsyncStorage.getItem('@monolith_sync_code');
  if (cached) { syncCode = cached; return cached; }
  return null;
};

export const startSyncService = async (providedCode?: string) => {
  const code = providedCode || await getSyncCode();
  if (!code) return;

  // Already open on the same code — do nothing
  if (ws && ws.readyState === WebSocket.OPEN && syncCode === code) return;

  // Clean up stale socket
  if (ws) {
    ws.onclose = null; ws.onerror = null; ws.onmessage = null;
    if (ws.readyState < WebSocket.CLOSING) ws.close();
    ws = null;
  }
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }

  syncCode = code;
  await AsyncStorage.setItem('@monolith_sync_code', code);

  ws = new WebSocket(`wss://free.blr2.piesocket.com/v3/${code}?api_key=6gyNU01H5lr7Q8g2ern3HwMLg3MAcysgXPxfZA7C&notify_self=1`);

  ws.onopen = () => {
    console.log('[SyncService] Connected:', code);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ __monolith: true, channel: code, source: 'APP', type: 'APP_CONNECTED', payload: {} }));
    }
    // Heartbeat — keep PieSocket free-tier alive
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ __monolith: true, channel: code, source: 'APP', type: 'PING', payload: {} }));
      }
    }, 25000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.__monolith && data.channel === code && data.source === 'WEB') {
        notifySubscribers(data.type, data.payload);
      }
    } catch (e) { }
  };

  ws.onclose = () => {
    console.log('[SyncService] Disconnected — retrying in 4s');
    ws = null;
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    setTimeout(() => startSyncService(code), 4000);
  };
};

export const stopSyncService = async () => {
  if (ws) {
    ws.onclose = null; // prevent auto-reconnect on manual stop
    ws.close();
    ws = null;
  }
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  syncCode = null;
  await AsyncStorage.removeItem('@monolith_sync_code');
};

export const broadcastSyncUpdate = async (type: string, payload: any) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ __monolith: true, channel: syncCode, source: 'APP', type, payload }));
  }
};
