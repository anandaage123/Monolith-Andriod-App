import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, DimensionValue } from 'react-native';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function FocusScreen() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customWorkMin, setCustomWorkMin] = useState('');
  const [customBreakMin, setCustomBreakMin] = useState('');

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/timer_end.wav')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing sound:', e);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
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
      playSound();
      // Auto switch logic
      if (mode === 'work') {
        const nextTime = (customBreakMin ? parseInt(customBreakMin) : 5) * 60;
        setMode('break');
        setTotalTime(nextTime);
        setTimeLeft(nextTime);
      } else {
        const nextTime = (customWorkMin ? parseInt(customWorkMin) : 25) * 60;
        setMode('work');
        setTotalTime(nextTime);
        setTimeLeft(nextTime);
      }
    }
  }, [timeLeft, isActive, mode, customBreakMin, customWorkMin]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
  };

  const switchMode = (m: 'work' | 'break') => {
    setIsActive(false);
    setMode(m);
    const mTime = m === 'work' 
      ? (customWorkMin ? parseInt(customWorkMin) * 60 : 25 * 60)
      : (customBreakMin ? parseInt(customBreakMin) * 60 : 5 * 60);
    setTotalTime(mTime);
    setTimeLeft(mTime);
  };

  const handleCustomSubmit = () => {
    setIsActive(false);
    const workMins = parseInt(customWorkMin);
    const breakMins = parseInt(customBreakMin);
    
    // Default fallback if numbers are invalid
    const w = isNaN(workMins) || workMins <= 0 ? 25 : workMins;
    const b = isNaN(breakMins) || breakMins <= 0 ? 5 : breakMins;
    
    setCustomWorkMin(w.toString());
    setCustomBreakMin(b.toString());

    if (mode === 'work') {
      setTotalTime(w * 60);
      setTimeLeft(w * 60);
    } else {
      setTotalTime(b * 60);
      setTimeLeft(b * 60);
    }
    setShowCustomModal(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressHeight = `${Math.max(0, Math.min(100, (timeLeft / totalTime) * 100))}%` as DimensionValue;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Focus Timer</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, mode === 'work' && styles.tabActive]} onPress={() => switchMode('work')}>
          <Text style={[styles.tabText, mode === 'work' && styles.tabTextActive]}>Work</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'break' && styles.tabActive]} onPress={() => switchMode('break')}>
          <Text style={[styles.tabText, mode === 'break' && styles.tabTextActive]}>Break</Text>
        </TouchableOpacity>
      </View>

      <View style={{flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center'}}>
        {[15, 25, 50].map(min => (
           <TouchableOpacity key={min} onPress={() => { 
                setIsActive(false); 
                setTotalTime(min * 60); 
                setTimeLeft(min * 60); 
                if (mode === 'work') setCustomWorkMin(min.toString());
                else setCustomBreakMin(min.toString());
              }} 
              style={{ marginHorizontal: 10, marginBottom: 10 }}>
              <Text style={{color: Colors.textSecondary, fontWeight: 'bold'}}>{min} min</Text>
           </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setShowCustomModal(true)} style={{ marginHorizontal: 10 }}>
           <Text style={{color: Colors.primary, fontWeight: 'bold'}}>Custom</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerCircle}>
        <View style={[styles.progressBar, { height: progressHeight }]} />
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        <Text style={styles.modeText}>{mode === 'work' ? 'Deep Work' : 'Short Break'}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.iconBtn} onPress={resetTimer}>
          <Ionicons name="refresh" size={30} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={toggleTimer}>
          <Ionicons name={isActive ? "pause" : "play"} size={40} color={Colors.background} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTimeLeft(0)}>
          <Ionicons name="play-skip-forward" size={30} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={showCustomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Custom Times (min)</Text>
            
            <View style={styles.inputRow}>
               <Text style={styles.inputLabel}>Focus Time:</Text>
               <TextInput 
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={Colors.textMuted}
                  value={customWorkMin}
                  onChangeText={setCustomWorkMin}
               />
            </View>
            
            <View style={styles.inputRow}>
               <Text style={styles.inputLabel}>Break Time:</Text>
               <TextInput 
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={Colors.textMuted}
                  value={customBreakMin}
                  onChangeText={setCustomBreakMin}
               />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCustomSubmit}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 15}} onPress={() => setShowCustomModal(false)}>
              <Text style={{color: Colors.textMuted, fontWeight: 'bold'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60, alignItems: 'center' },
  header: { ...Typography.header, marginBottom: 30, width: '100%', textAlign: 'left' },
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 30, padding: 5 },
  tab: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.body, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.text },
  timerCircle: { width: 280, height: 280, borderRadius: 140, borderWidth: 4, borderColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 50 },
  progressBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.primary + '30' },
  timerText: { fontSize: 64, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'] },
  modeText: { ...Typography.body, color: Colors.textSecondary, marginTop: 10, textTransform: 'uppercase', letterSpacing: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-evenly' },
  iconBtn: { padding: 15, borderRadius: 30, backgroundColor: Colors.surfaceHighlight },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surfaceHighlight, padding: 25, borderRadius: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { ...Typography.title, marginBottom: 25, color: Colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  inputLabel: { ...Typography.body, color: Colors.text, fontWeight: 'bold' },
  timeInput: { backgroundColor: Colors.background, color: Colors.text, width: 80, padding: 10, borderRadius: 8, textAlign: 'center', fontSize: 18, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginTop: 20, width: '100%', alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: 'bold', fontSize: 16 }
});
