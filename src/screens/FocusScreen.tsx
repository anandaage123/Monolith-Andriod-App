import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  DimensionValue,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Vibration,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Typography, Shadows } from '../theme/Theme';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const ds = (size: number) => (size * width) / 414;

type TimerStatus = 'setup' | 'focus' | 'break';
interface SessionLog {
  id: string;
  name: string;
  tag: string;
  duration: number;
  timestamp: number;
}

const MODES = [
  { id: 'pomodoro', name: 'Pomodoro', focus: 25, break: 5, icon: 'timer-outline' },
  { id: 'deep_work', name: 'Deep Work', focus: 90, break: 15, icon: 'flash-outline' },
  { id: 'zen', name: 'Zen Flow', focus: 10, break: 0, icon: 'leaf-outline' },
  { id: 'custom', name: 'Custom Flow', focus: 25, break: 5, icon: 'options-outline' },
];

const TAGS = ['Work', 'Code', 'Study', 'Personal'];

export default function FocusScreen() {
  const { colors, isDark } = useTheme();
  useKeepAwake();

  // ─── State ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<TimerStatus>('setup');
  const [activeModeIdx, setActiveModeIdx] = useState(0);
  const [sessionName, setSessionName] = useState('');
  const [sessionTag, setSessionTag] = useState('Work');
  
  const [customFocus, setCustomFocus] = useState('25');
  const [customBreak, setCustomBreak] = useState('5');
  
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  
  const [logs, setLogs] = useState<SessionLog[]>([]);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const breatheOpacity = useRef(new Animated.Value(0)).current;
  const wavyPulse = useRef(new Animated.Value(0)).current;
  const [breatheLabel, setBreatheLabel] = useState('Inhale');

  const mode = MODES[activeModeIdx];
  const isCustomMode = mode.id === 'custom';
  const isZenMode = mode.id === 'zen';
  
  // Theme Overrides
  const focusGreen = '#006947'; // Emerald
  const breakRed = '#B41340';   // Ruby
  const currentThemeColor = status === 'focus' ? focusGreen : (status === 'break' ? breakRed : colors.primary);

  // ─── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      const saved = await AsyncStorage.getItem('@focus_logs_v2');
      if (saved) setLogs(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  const saveSession = async () => {
    if (status !== 'focus') return;
    const newLog: SessionLog = {
      id: Date.now().toString(),
      name: sessionName || (isZenMode ? 'Zen Meditation' : 'Primal Flow'),
      tag: sessionTag,
      duration: Math.floor(totalTime / 60),
      timestamp: Date.now(),
    };
    const updated = [newLog, ...logs].slice(0, 5);
    setLogs(updated);
    try {
      await AsyncStorage.setItem('@focus_logs_v2', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  };

  // ─── Feedback & Logic ─────────────────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Focus Engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handlePhaseEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handlePhaseEnd = () => {
    setIsActive(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Vibration.vibrate([0, 500, 200, 500]);

    if (status === 'focus') {
      saveSession();
      if (mode.break > 0) {
        setStatus('break');
        const secs = (isCustomMode ? (parseInt(customBreak) || 5) : mode.break) * 60;
        setTimeLeft(secs); setTotalTime(secs); setIsActive(true); 
      } else {
        setStatus('focus');
        const secs = (isZenMode ? mode.focus : (isCustomMode ? parseInt(customFocus)||25 : mode.focus)) * 60;
        setTimeLeft(secs); setTotalTime(secs); setIsActive(false);
      }
    } else if (status === 'break') {
      setStatus('focus');
      const secs = (isCustomMode ? (parseInt(customFocus) || 25) : mode.focus) * 60;
      setTimeLeft(secs); setTotalTime(secs); setIsActive(false); 
    }
  };

  const skipPhase = () => {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      handlePhaseEnd();
  };

  // ─── Fluid Breathing & Water Animation ─────────────────────────────────────
  useEffect(() => {
    let animLoop: any = null;
    let waveLoop: any = null;

    if (isActive && status !== 'setup') {
      // Primary Breathing Loop
      const breatheSequence = () => {
        setBreatheLabel('Inhale');
        animLoop = Animated.parallel([
           Animated.timing(pulseAnim, { toValue: 1.15, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
           Animated.sequence([
              Animated.timing(breatheOpacity, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
              Animated.delay(2000),
              Animated.timing(breatheOpacity, { toValue: 0, duration: 1000, useNativeDriver: true })
           ])
        ]);
        animLoop.start(({ finished }: any) => {
          if (!finished) return;
          setBreatheLabel('Exhale');
          Animated.parallel([
             Animated.timing(pulseAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
             Animated.sequence([
                Animated.timing(breatheOpacity, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
                Animated.delay(2000),
                Animated.timing(breatheOpacity, { toValue: 0, duration: 1000, useNativeDriver: true })
             ])
          ]).start(({ finished: f }: any) => {
             if (f && isActive) breatheSequence();
          });
        });
      };
      breatheSequence();

      // Fluid Wave Animation during Focus
      if (status === 'focus') {
        waveLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(wavyPulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(wavyPulse, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
          ])
        );
        waveLoop.start();
      }
    } else {
       pulseAnim.setValue(1);
       breatheOpacity.setValue(0);
       wavyPulse.setValue(0);
       if (animLoop) animLoop.stop();
       if (waveLoop) waveLoop.stop();
    }
    return () => { 
        if (animLoop) animLoop.stop(); 
        if (waveLoop) waveLoop.stop();
    };
  }, [isActive, status]);

  // ─── Styles ─────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: ds(24), paddingTop: Platform.OS === 'ios' ? ds(54) : ds(24), marginBottom: ds(16) },
    title: { ...Typography.header, fontSize: ds(24), color: colors.text, letterSpacing: -0.5, textAlign: 'center' },
    sub: { ...Typography.body, color: colors.textVariant, opacity: 0.6, fontSize: ds(13), marginTop: ds(2), textAlign: 'center' },
    
    // Setup
    card: { backgroundColor: isDark ? colors.surfaceContainer : '#F3F4F9', borderRadius: ds(28), padding: ds(20), marginHorizontal: ds(24), marginBottom: ds(16) },
    label: { ...Typography.caption, color: colors.primary, fontWeight: '700', marginBottom: ds(12), textTransform: 'uppercase', letterSpacing: ds(1.2) },
    input: { ...Typography.body, fontSize: ds(18), color: colors.text, borderBottomWidth: 1.5, borderBottomColor: colors.surfaceContainer, paddingVertical: ds(8) },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ds(10), marginTop: ds(4) },
    gridItem: { 
      flexDirection: 'row', alignItems: 'center', padding: ds(12), borderRadius: ds(16), 
      backgroundColor: colors.surface, borderWidth: 1, borderColor: 'transparent',
      width: (width - ds(48) - ds(40) - ds(10)) / 2 
    },
    gridItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    gridItemText: { ...Typography.body, fontSize: ds(13), fontWeight: '700', color: colors.text, marginLeft: ds(8) },

    tagRow: { flexDirection: 'row', gap: ds(8), marginTop: ds(16) },
    tagChip: { 
      paddingHorizontal: ds(16), 
      paddingVertical: ds(10), 
      borderRadius: ds(14), 
      backgroundColor: colors.surface, 
      borderWidth: 1.5, 
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center'
    },
    tagChipActive: { 
      backgroundColor: colors.primary, 
      borderColor: colors.primary,
      transform: [{ scale: 1.05 }] // Subtle enlargement as a premium selection effect
    },
    tagText: { ...Typography.caption, fontWeight: '700', color: colors.textVariant, fontSize: ds(12) },
    tagActiveText: { color: '#FFF' },

    mainBtn: { height: ds(60), borderRadius: ds(30), backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginHorizontal: ds(24), marginTop: ds(8), ...Shadows.soft },
    mainBtnText: { ...Typography.title, color: '#FFF', fontSize: ds(17), fontWeight: '800' },

    // Records Section
    recordsHeader: { marginTop: ds(32), marginHorizontal: ds(24), marginBottom: ds(12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recordsTitle: { ...Typography.caption, color: colors.text, fontWeight: '800', letterSpacing: ds(1.5), textTransform: 'uppercase' },
    logCard: { 
       backgroundColor: colors.surface, borderRadius: ds(20), padding: ds(16), 
       marginHorizontal: ds(24), marginBottom: ds(10), flexDirection: 'row', 
       alignItems: 'center', justifyContent: 'space-between', ...Shadows.soft 
    },
    logInfo: { flex: 1 },
    logName: { ...Typography.body, fontSize: ds(14), fontWeight: '700', color: colors.text },
    logMeta: { ...Typography.caption, fontSize: ds(11), color: colors.textVariant, opacity: 0.6, marginTop: ds(2) },
    logBadgeRow: { flexDirection: 'row', gap: ds(6), marginTop: ds(4) },
    logBadge: { backgroundColor: colors.primary + '10', paddingHorizontal: ds(8), paddingVertical: ds(4), borderRadius: ds(6) },
    logBadgeText: { ...Typography.caption, fontSize: ds(10), color: colors.primary, fontWeight: '700' },

    // Timer View
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    ring: { 
        width: ds(280), height: ds(280), borderRadius: ds(140), 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: colors.surface,
        borderWidth: ds(2), borderColor: colors.surfaceContainer,
        overflow: 'hidden'
    },
    waveRing: { 
        position: 'absolute', width: ds(300), height: ds(300), borderRadius: ds(150), 
        borderWidth: 2, borderColor: currentThemeColor + '40' 
    },
    fill: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: currentThemeColor + '10' },
    timeText: { ...Typography.header, fontSize: ds(64), color: colors.text, letterSpacing: ds(-2) },
    phaseText: { ...Typography.caption, fontWeight: '900', color: currentThemeColor, marginTop: ds(-4), letterSpacing: ds(2) },
    
    controlsRoot: { alignItems: 'center', marginTop: ds(40) },
    exitBtn: { width: ds(56), height: ds(56), borderRadius: ds(28), backgroundColor: colors.surfaceContainer, justifyContent: 'center', alignItems: 'center', marginBottom: ds(20) },
    controlsRow: { flexDirection: 'row', alignItems: 'center', gap: ds(24) },
    ctrlBtn: { width: ds(52), height: ds(52), borderRadius: ds(26), backgroundColor: isDark ? colors.surfaceContainer : '#F3F4F9', justifyContent: 'center', alignItems: 'center' },
    playBtn: { width: ds(84), height: ds(84), borderRadius: ds(42), backgroundColor: currentThemeColor, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },

    overlay: { marginBottom: ds(20), width: '100%', alignItems: 'center' },
    overlayText: { ...Typography.header, fontSize: ds(18), color: currentThemeColor, letterSpacing: ds(5), textTransform: 'uppercase' },
  });

  const percent = (timeLeft / totalTime) * 100;

  if (status === 'setup') {
    return (
      <View style={s.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={s.header}>
          <Text style={s.title}>Focus & Zen</Text>
          <Text style={s.sub}>Set your focal boundaries.</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: ds(60) }}>
          <View style={s.card}>
            <Text style={s.label}>Configurations</Text>
            <View style={s.grid}>
              {MODES.map((m, i) => (
                <TouchableOpacity 
                   key={m.id} 
                   style={[s.gridItem, activeModeIdx === i && s.gridItemActive]} 
                   onPress={() => { 
                       setActiveModeIdx(i); 
                       if (m.id === 'zen') setSessionTag('Zen');
                       triggerHaptic(Haptics.ImpactFeedbackStyle.Light); 
                    }}
                >
                  <Ionicons name={m.icon as any} size={18} color={activeModeIdx === i ? colors.primary : colors.textVariant} />
                  <Text style={s.gridItemText}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isCustomMode && (
               <View style={{ flexDirection: 'row', gap: ds(12), marginTop: ds(16) }}>
                 <View style={{ flex: 1 }}>
                    <Text style={[s.label, { fontSize: 9, marginBottom: 2 }]}>Focus</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={customFocus} onChangeText={setCustomFocus} maxLength={3} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={[s.label, { fontSize: 9, marginBottom: 2 }]}>Break</Text>
                    <TextInput style={s.input} keyboardType="numeric" value={customBreak} onChangeText={setCustomBreak} maxLength={3} />
                 </View>
               </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.label}>Primary Intent</Text>
            <TextInput style={s.input} placeholder={isZenMode ? "Specify Meditative Goal" : "Focus Session Target"} placeholderTextColor={colors.textVariant + '80'} value={sessionName} onChangeText={setSessionName} numberOfLines={1} maxLength={40} />
            <View style={s.tagRow}>
              {TAGS.map(t => (
                 <TouchableOpacity key={t} style={[s.tagChip, t === sessionTag && s.tagChipActive]} onPress={() => setSessionTag(t)}>
                   <Text style={[s.tagText, t === sessionTag && s.tagActiveText]}>{t}</Text>
                 </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={s.mainBtn} onPress={() => { triggerHaptic(); setStatus('focus'); setTimeLeft((isZenMode ? mode.focus : (isCustomMode ? parseInt(customFocus)||25 : mode.focus)) * 60); setTotalTime((isZenMode ? mode.focus : (isCustomMode ? parseInt(customFocus)||25 : mode.focus)) * 60); setIsActive(true); }}>
            <Text style={s.mainBtnText}>{isZenMode ? "INITIATE ZEN" : "ENGAGE FLOW"}</Text>
          </TouchableOpacity>

          {logs.length > 0 && (
             <>
               <View style={s.recordsHeader}>
                 <Text style={s.recordsTitle}>Flow Records</Text>
                 <TouchableOpacity onPress={async () => { await AsyncStorage.removeItem('@focus_logs_v2'); setLogs([]); }}>
                   <Text style={[s.logMeta, { color: colors.error, opacity: 1 }]}>Clear All</Text>
                 </TouchableOpacity>
               </View>
               {logs.map(log => (
                 <View key={log.id} style={s.logCard}>
                   <View style={s.logInfo}>
                     <Text style={s.logName} numberOfLines={1}>{log.name}</Text>
                     <View style={s.logBadgeRow}>
                        <View style={[s.logBadge, { backgroundColor: colors.secondary + '10' }]}>
                            <Text style={[s.logBadgeText, { color: colors.secondary }]}>#{log.tag.toUpperCase()}</Text>
                        </View>
                        <Text style={s.logMeta}>{new Date(log.timestamp).toLocaleDateString()}</Text>
                     </View>
                   </View>
                   <View style={s.logBadge}>
                     <Text style={s.logBadgeText}>{log.duration} MIN</Text>
                   </View>
                 </View>
               ))}
             </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={isDark ? [colors.background, '#12121A'] : ['#FFF', colors.background]} style={StyleSheet.absoluteFill} />

      <View style={s.header}>
        <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: currentThemeColor + '15', paddingHorizontal: ds(12), paddingVertical: ds(4), borderRadius: ds(20), marginBottom: ds(4) }}>
                <Text style={{ ...Typography.caption, color: currentThemeColor, fontWeight: '800', fontSize: ds(11) }}>{sessionTag.toUpperCase()}</Text>
            </View>
            <Text style={[s.title, { fontSize: ds(22) }]} numberOfLines={1} ellipsizeMode="tail">
                {sessionName || (isZenMode ? 'Zen Meditation' : 'Primal Focus')}
            </Text>
        </View>
      </View>

      <View style={s.container}>
         {/* FLUID WATER ANIMATION (OUTER RING) */}
         {status === 'focus' && isActive && (
           <Animated.View style={[s.waveRing, { transform: [{ scale: wavyPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }], opacity: wavyPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0.6] }) } ]} />
         )}

         {isActive && (
           <Animated.View style={[s.overlay, { opacity: breatheOpacity }]}>
             <Text style={[s.overlayText, { color: currentThemeColor }]}>{breatheLabel}</Text>
           </Animated.View>
         )}

         <Animated.View style={[s.ring, { transform: [{ scale: pulseAnim }], borderColor: currentThemeColor + '20' }]}>
            <View style={[s.fill, { height: `${percent}%` as DimensionValue, backgroundColor: currentThemeColor + '10' }]} />
            <Text style={s.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={[s.phaseText, { color: currentThemeColor }]}>
                {isZenMode ? 'MEDITATING' : (status === 'focus' ? 'CONCENTRATING' : 'RECOVERING')}
            </Text>
         </Animated.View>

         <View style={s.controlsRoot}>
            <TouchableOpacity style={s.exitBtn} onPress={() => { triggerHaptic(); setStatus('setup'); setIsActive(false); }}>
               <Ionicons name="close-outline" size={ds(32)} color={colors.text} />
            </TouchableOpacity>

            <View style={s.controlsRow}>
                <TouchableOpacity style={s.ctrlBtn} onPress={() => { triggerHaptic(); setTimeLeft(totalTime); }}>
                   <Ionicons name="refresh-outline" size={ds(24)} color={colors.textVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={[s.playBtn, { backgroundColor: currentThemeColor }]} onPress={() => { triggerHaptic(); setIsActive(!isActive); }}>
                   <Ionicons name={isActive ? "pause" : "play"} size={ds(40)} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={s.ctrlBtn} onPress={skipPhase}>
                   <Ionicons name="play-skip-forward-outline" size={ds(24)} color={colors.textVariant} />
                </TouchableOpacity>
            </View>
         </View>
      </View>
    </View>
  );
}
