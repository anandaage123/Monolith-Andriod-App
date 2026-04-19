import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = 'O3b65Vq12H8k2Mh8N1jD1i2vB3k8A4K3dZ8G9e1O';
let ws: WebSocket | null = null;
let syncCode: string | null = null;

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

export const getSyncCode = async (): Promise<string> => {
  if (syncCode) return syncCode;
  
  const cached = await AsyncStorage.getItem('@monolith_sync_code');
  if (cached) {
    syncCode = cached;
    return cached;
  }
  
  // Generate a new 6-character code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  syncCode = code;
  await AsyncStorage.setItem('@monolith_sync_code', code);
  return code;
};

export const startSyncService = async () => {
  if (ws) return; // Already running
  const code = await getSyncCode();
  const channelId = `monolith_sync_${code}`;
  
  // Connect to PieSocket public cluster
  ws = new WebSocket(`wss://cluster.piesocket.com/v3/${channelId}?api_key=${API_KEY}&notify_self=0`);
  
  ws.onopen = () => {
    console.log('[SyncService] Connected using code:', code);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.__monolith && data.source === 'WEB') {
        notifySubscribers(data.type, data.payload);
      }
    } catch (e) {
      // Ignored
    }
  };
  
  ws.onclose = () => {
    console.log('[SyncService] Disconnected. Reconnecting in 5s...');
    ws = null;
    setTimeout(startSyncService, 5000);
  };
};

export const broadcastSyncUpdate = async (type: string, payload: any) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      __monolith: true,
      source: 'APP',
      type,
      payload
    }));
  }
};
