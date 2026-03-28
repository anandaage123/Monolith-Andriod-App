import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  DimensionValue,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Vibration,
  Dimensions,
  StatusBar,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';

const { width } = Dimensions.get('window');

const PRESET_WORK = [15, 25, 45, 60];
const PRESET_BREAK = [5, 10, 15, 30];

export default function FocusScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const appState = useRef(AppState.currentState);
  const startTimeRef = useRef<number | null>(null);

  useKeepAwake(); // Keep screen on while this screen is focused

  const workPlayer = useAudioPlayer(require('../../assets/timer_end.wav'));
  const breakPlayer = useAudioPlayer(require('../../assets/timer_end.wav'));

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customWorkMin, setCustomWorkMin] = useState('25');
  const [customBreakMin, setCustomBreakMin] = useState('5');

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const breatheTextOpacity = useRef(new Animated.Value(0)).current;
  const [breatheStatus, setBreatheStatus] = useState('Inhale');

  useEffect(() => {
    loadTimings();
  }, []);

  const loadTimings = async () => {
    try {
      const w = await AsyncStorage.getItem('@focus_work_min');
      const b = await AsyncStorage.getItem('@focus_break_min');
      if (w) {
        setCustomWorkMin(w);
        const secs = parseInt(w) * 60;
        setTotalTime(secs);
        setTimeLeft(secs);
      }
      if (b) setCustomBreakMin(b);
    } catch (e) {}
  };

  // Background timer logic
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        if (isActive) {
          startTimeRef.current = Date.now();
        }
      } else if (appState.current.match(/background/) && nextAppState === 'active') {
        if (isActive && startTimeRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTimeRef.current) / 1000);
          setTimeLeft(prev => Math.max(0, prev - elapsed));
          startTimeRef.current = null;
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      const breatheSequence = () => {
        setBreatheStatus('Inhale');
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(breatheTextOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(breatheTextOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ])
        ]).start(({ finished }) => {
          if (finished && isActive) {
            setBreatheStatus('Exhale');
            Animated.parallel([
              Animated.timing(pulseAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(breatheTextOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.delay(2000),
                Animated.timing(breatheTextOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
              ])
            ]).start(() => {
              if (isActive) breatheSequence();
            });
          }
        });
      };
      breatheSequence();
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      breatheTextOpacity.setValue(0);
      rotateAnim.stopAnimation();
    }
  }, [isActive]);

  const playSound = async (type: 'work' | 'break') => {
    try {
      if (type === 'work') {
        workPlayer.play();
        Vibration.vibrate([0, 500, 200, 500]);
      } else {
        breakPlayer.play();
        Vibration.vibrate([0, 100, 100, 100, 100, 100]);
      }
    } catch (e) { console.log('Sound error'); }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playSound(mode);
      const nextMode = mode === 'work' ? 'break' : 'work';
      const nextTime = nextMode === 'work' ? parseInt(customWorkMin) * 60 : parseInt(customBreakMin) * 60;
      setMode(nextMode);
      setTotalTime(nextTime);
      setTimeLeft(nextTime);
    }
  }, [timeLeft, isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
  };

  const switchMode = (m: 'work' | 'break') => {
    setIsActive(false);
    setMode(m);
    const mTime = m === 'work' ? parseInt(customWorkMin) * 60 : parseInt(customBreakMin) * 60;
    setTotalTime(mTime);
    setTimeLeft(mTime);
  };

  const setPreset = async (mins: number, type: 'work' | 'break') => {
    setIsActive(false);
    if (type === 'work') {
      setCustomWorkMin(mins.toString());
      await AsyncStorage.setItem('@focus_work_min', mins.toString());
      if (mode === 'work') {
        setTotalTime(mins * 60);
        setTimeLeft(mins * 60);
      }
    } else {
      setCustomBreakMin(mins.toString());
      await AsyncStorage.setItem('@focus_break_min', mins.toString());
      if (mode === 'break') {
        setTotalTime(mins * 60);
        setTimeLeft(mins * 60);
      }
    }
  };

  const handleCustomSubmit = async () => {
    const workMins = Math.max(1, parseInt(customWorkMin) || 25);
    const breakMins = Math.max(1, parseInt(customBreakMin) || 5);
    setCustomWorkMin(workMins.toString());
    setCustomBreakMin(breakMins.toString());
    await AsyncStorage.setItem('@focus_work_min', workMins.toString());
    await AsyncStorage.setItem('@focus_break_min', breakMins.toString());
    const nextTime = (mode === 'work' ? workMins : breakMins) * 60;
    setTotalTime(nextTime);
    setTimeLeft(nextTime);
    setShowCustomModal(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const progress = timeLeft / totalTime;
  const fillHeight = `${progress * 100}%` as DimensionValue;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerBar}>
        <Text style={styles.logoText}>Deep Focus</Text>
        <Pressable 
          onPress={() => setIsLocked(!isLocked)} 
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1, marginRight: 16 }]}
        >
          <Ionicons name={isLocked ? "lock-closed" : "lock-open-outline"} size={22} color={isLocked ? MM_Colors.error : MM_Colors.primary} />
        </Pressable>
        <Pressable 
          disabled={isLocked}
          onPress={() => setShowCustomModal(true)} 
          style={({ pressed }) => [{ opacity: pressed || isLocked ? 0.5 : 1 }]}
        >
          <Ionicons name="options-outline" size={24} color={MM_Colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.innerTrack}>
              <View style={[styles.progressFill, { height: fillHeight }]}>
                <LinearGradient colors={[MM_Colors.primary, MM_Colors.primaryLight]} style={styles.gradient} />
              </View>
              <View style={styles.timerContent}>
                <Text style={styles.timerDigits}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerSubText}>
                  {!isActive ? 'PAUSED' : (mode === 'work' ? 'FLOWING' : 'RECOVERY')}
                </Text>
                <Animated.Text style={[styles.breatheText, { opacity: breatheTextOpacity }]}>
                  {breatheStatus}
                </Animated.Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'work' && styles.modeBtnActive, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => switchMode('work')}
          >
            <MaterialCommunityIcons name="brain" size={24} color={mode === 'work' ? '#FFF' : MM_Colors.primary} />
            <Text style={[styles.modeBtnText, mode === 'work' && styles.textWhite]}>Work</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, mode === 'break' && styles.modeBtnActive, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => switchMode('break')}
          >
            <Ionicons name="leaf" size={24} color={mode === 'break' ? '#FFF' : MM_Colors.primary} />
            <Text style={[styles.modeBtnText, mode === 'break' && styles.textWhite]}>Break</Text>
          </Pressable>
        </View>

        <View style={styles.presetsSection}>
          <Text style={styles.sectionLabel}>PRESETS ({mode.toUpperCase()})</Text>
          <View style={styles.presetGrid}>
            {(mode === 'work' ? PRESET_WORK : PRESET_BREAK).map(m => (
              <Pressable
                key={m}
                style={({ pressed }) => [
                  styles.presetBtn,
                  (mode === 'work' ? customWorkMin : customBreakMin) === m.toString() && styles.presetBtnActive,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => setPreset(m, mode)}
              >
                <Text style={[styles.presetBtnText, (mode === 'work' ? customWorkMin : customBreakMin) === m.toString() && styles.presetBtnTextActive]}>{m}m</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={resetTimer}>
            <Ionicons name="reload" size={24} color={MM_Colors.primary} />
          </Pressable>

          <Pressable style={({ pressed }) => [styles.mainBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={toggleTimer}>
            <LinearGradient colors={[MM_Colors.primary, MM_Colors.primaryLight]} style={styles.mainBtnGradient}>
              <Ionicons name={isActive ? "pause" : "play"} size={28} color="#FFF" />
              <Text style={styles.mainBtnText}>{isActive ? 'PAUSE' : 'START'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showCustomModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Timer Settings</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>WORK (MIN)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={customWorkMin}
                  onChangeText={setCustomWorkMin}
                />
              </View>
              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>BREAK (MIN)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={customBreakMin}
                  onChangeText={setCustomBreakMin}
                />
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleCustomSubmit}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
            <Pressable onPress={() => setShowCustomModal(false)} style={({ pressed }) => [{ marginTop: 20, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ color: MM_Colors.primary, fontWeight: '600', fontSize: 17 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MM_Colors.background },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.padding, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 12 },
  logoText: { ...Typography.header },

  scrollContent: { padding: Spacing.padding, flexGrow: 1, justifyContent: 'center' },
  timerContainer: { alignItems: 'center', marginBottom: 48 },
  glowRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MM_Colors.white,
    padding: 10,
    ...Shadows.soft,
  },
  innerTrack: { flex: 1, borderRadius: 120, backgroundColor: MM_Colors.white, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  progressFill: { position: 'absolute', bottom: 0, width: '100%', opacity: 0.1 },
  gradient: { flex: 1 },
  timerContent: { alignItems: 'center' },
  timerDigits: { ...Typography.header, fontSize: 64, letterSpacing: -2 },
  timerSubText: { ...Typography.caption, fontWeight: '700', letterSpacing: 1.5, marginTop: -4 },
  breatheText: { ...Typography.body, color: MM_Colors.primary, fontWeight: '600', marginTop: 12, letterSpacing: 2 },

  modeToggle: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  modeBtn: { flex: 1, height: 90, borderRadius: 20, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },
  modeBtnActive: { backgroundColor: MM_Colors.primary },
  modeBtnText: { ...Typography.body, fontWeight: '600', marginTop: 8 },
  textWhite: { color: '#FFF' },

  presetsSection: { marginBottom: 40 },
  sectionLabel: { ...Typography.caption, fontWeight: '700', marginBottom: 12 },
  presetGrid: { flexDirection: 'row', gap: 10 },
  presetBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },
  presetBtnActive: { backgroundColor: MM_Colors.primary },
  presetBtnText: { ...Typography.body, fontSize: 15, fontWeight: '600' },
  presetBtnTextActive: { color: '#FFF' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  secondaryBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },
  mainBtn: { flex: 1, height: 60, borderRadius: 30, overflow: 'hidden', ...Shadows.soft },
  mainBtnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  mainBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', ...Shadows.soft },
  modalTitle: { ...Typography.title, marginBottom: 24 },
  inputContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  inputItem: { flex: 1, alignItems: 'center' },
  inputLabel: { ...Typography.caption, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: MM_Colors.background, width: '100%', padding: 16, borderRadius: 12, ...Typography.header, fontSize: 32, textAlign: 'center' },
  saveBtn: { backgroundColor: MM_Colors.primary, width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  headerBtn: { padding: 8, borderRadius: 12, backgroundColor: MM_Colors.white, ...Shadows.soft },
  lockOverlay: { marginTop: 32, alignItems: 'center' },
  lockText: { ...Typography.title, color: MM_Colors.error, marginTop: 12 },
  lockSubText: { ...Typography.caption, marginTop: 4, opacity: 0.6 },
});
