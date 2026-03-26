import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, Keyboard, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

type Mood = '😀' | '😌' | '😐' | '😩' | '😡';
const MOODS: Mood[] = ['😀', '😌', '😐', '😩', '😡'];

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: Mood;
}

export default function NotesScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRegisteredPin, setHasRegisteredPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  
  const [setupStep, setSetupStep] = useState<'none' | 'set' | 'confirm'>('none');
  const [tempPin, setTempPin] = useState('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    checkPinStatus();
    loadNotes();
  }, []);

  useEffect(() => {
    if (!isFocused && isAuthenticated) {
      setIsAuthenticated(false);
      setPin('');
      setIsEditing(false);
    }
  }, [isFocused]);

  const checkPinStatus = async () => {
    try {
      const savedPin = await AsyncStorage.getItem('@journal_pin');
      setHasRegisteredPin(!!savedPin);
      if (!savedPin) {
         setIsAuthenticated(true);
      }
    } catch (e) {}
  };

  const startSetup = () => {
    setIsAuthenticated(false);
    setSetupStep('set');
    setPin('');
  };

  const removePin = async () => {
    Alert.alert("Remove PIN", "This removes the lock from your Journal.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
         await AsyncStorage.removeItem('@journal_pin');
         setHasRegisteredPin(false);
         setIsSettingsVisible(false);
         Alert.alert("Success", "Journal PIN removed.");
      }}
    ]);
  };

  const handlePin = async (p: string) => {
    const newPin = pin + p;
    setPin(newPin);
    
    if (newPin.length === 4) {
      setTimeout(async () => {
        if (setupStep === 'set') {
          setTempPin(newPin);
          setSetupStep('confirm');
        } else if (setupStep === 'confirm') {
          if (newPin === tempPin) {
             await AsyncStorage.setItem('@journal_pin', newPin);
             setHasRegisteredPin(true);
             setIsAuthenticated(true);
             setSetupStep('none');
             Alert.alert("Secured", "Journal PIN set successfully.");
          } else {
             Alert.alert("Error", "PINs do not match. Try again.");
             setSetupStep('set');
          }
        } else {
          // Login
          const savedPin = await AsyncStorage.getItem('@journal_pin');
          if (newPin === savedPin) {
            setIsAuthenticated(true);
          } else {
            Alert.alert("Error", "Incorrect PIN");
          }
        }
        setPin('');
      }, 100);
    }
  };

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem('@daily_notes_v3');
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) {}
  };

  const saveNotes = async (newNotes: Note[]) => {
    setNotes(newNotes); 
    try {
      await AsyncStorage.setItem('@daily_notes_v3', JSON.stringify(newNotes));
    } catch (e) {}
  };

  const saveCurrentNote = () => {
    Keyboard.dismiss();
    
    if (!currentNote.title?.trim() && !currentNote.content?.trim()) {
      setIsEditing(false);
      return;
    }
    
    const newNote: Note = {
      id: currentNote.id || Date.now().toString(),
      title: currentNote.title || 'Untitled',
      content: currentNote.content || '',
      date: new Date().toLocaleDateString(),
      mood: currentNote.mood || '😌',
    };
    
    let updatedNotes;
    if (currentNote.id) {
      updatedNotes = notes.map(n => n.id === currentNote.id ? newNote : n);
    } else {
      updatedNotes = [newNote, ...notes];
    }
    
    saveNotes(updatedNotes);
    setIsEditing(false);
    setCurrentNote({});
  };

  const deleteNote = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          saveNotes(notes.filter(n => n.id !== id));
      }},
    ]);
  };

  const getAuthTitle = () => {
    if (setupStep === 'set') return "Set New Journal PIN";
    if (setupStep === 'confirm') return "Confirm Journal PIN";
    return "Enter Journal PIN";
  };

  if (hasRegisteredPin === null) return null;

  if ((hasRegisteredPin && !isAuthenticated) || setupStep !== 'none') {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="journal" size={50} color={Colors.primary} style={{marginBottom: 30}} />
        <Text style={styles.authTitle}>{getAuthTitle()}</Text>
        <Text style={styles.pinDisplay}>{'*'.repeat(pin.length)}</Text>
        
        <View style={styles.numpad}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePin(num.toString())}>
              <Text style={styles.numText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numBtn} onPress={() => setupStep === 'none' ? setPin('') : startSetup()}>
             {setupStep === 'none' ? <View /> : <Ionicons name="close" size={24} color={Colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => handlePin('0')}>
            <Text style={styles.numText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
            <Ionicons name="backspace" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isEditing) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Ionicons name="chevron-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editing Note</Text>
          <TouchableOpacity onPress={saveCurrentNote} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.moodSelector}>
           <Text style={{...Typography.body, color: Colors.textSecondary, marginRight: 15}}>Today's Mood:</Text>
           {MOODS.map(m => (
             <TouchableOpacity key={m} onPress={() => setCurrentNote({...currentNote, mood: m})} style={[styles.moodBadge, currentNote.mood === m && styles.moodActive]}>
                <Text style={{fontSize: 20}}>{m}</Text>
             </TouchableOpacity>
           ))}
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={Colors.textMuted}
          value={currentNote.title}
          onChangeText={(text) => setCurrentNote({ ...currentNote, title: text })}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="Start writing..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          value={currentNote.content}
          onChangeText={(text) => setCurrentNote({ ...currentNote, content: text })}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Secret Journal</Text>
        <View style={{flexDirection: 'row'}}>
           <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{marginRight: 20}}>
             <Ionicons name="settings-outline" size={28} color={Colors.textSecondary} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => { setCurrentNote({mood: '😌'}); setIsEditing(true); }}>
             <Ionicons name="create-outline" size={28} color={Colors.primary} />
           </TouchableOpacity>
        </View>
      </View>
      
      {!hasRegisteredPin && setupStep === 'none' && (
         <TouchableOpacity onPress={startSetup} style={styles.warningBox}>
            <Ionicons name="lock-open-outline" size={20} color="#FFD700" />
            <Text style={{...Typography.body, color: "#FFD700", marginLeft: 10, flex: 1}}>Set a Custom PIN to lock this Journal.</Text>
         </TouchableOpacity>
      )}

      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.noteCard} 
            onPress={() => { setCurrentNote(item); setIsEditing(true); }}
            onLongPress={() => deleteNote(item.id)}
          >
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
               <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
               <Text style={{fontSize: 16}}>{item.mood}</Text>
            </View>
            <Text style={styles.noteDate}>{item.date}</Text>
            <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{color: Colors.textMuted, textAlign: 'center', marginTop: 50}}>No notes yet. Tap the pencil icon to begin.</Text>}
      />

      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Journal Settings</Text>
             
             {hasRegisteredPin && (
               <>
                 <TouchableOpacity style={styles.actionBtn} onPress={() => {setIsSettingsVisible(false); startSetup();}}>
                    <Ionicons name="key-outline" size={24} color={Colors.text} style={{marginRight: 10}} />
                    <Text style={styles.actionText}>Change Journal PIN</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.accent + '30'}]} onPress={removePin}>
                    <Ionicons name="lock-open-outline" size={24} color={Colors.accent} style={{marginRight: 10}} />
                    <Text style={[styles.actionText, {color: Colors.accent}]}>Remove Journal PIN</Text>
                 </TouchableOpacity>
               </>
             )}
             
             <TouchableOpacity style={{marginTop: 15}} onPress={() => setIsSettingsVisible(false)}>
                <Text style={{color: Colors.textMuted, fontWeight: 'bold'}}>Close</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authTitle: { ...Typography.title, marginBottom: 20 },
  pinDisplay: { ...Typography.header, letterSpacing: 20, marginBottom: 40, height: 40, color: Colors.primary },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between' },
  numBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  numText: { ...Typography.header },

  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { ...Typography.header },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 10, borderRadius: 12, marginBottom: 15 },
  row: { justifyContent: 'space-between' },
  noteCard: { backgroundColor: Colors.surface, padding: 15, borderRadius: 16, width: '48%', marginBottom: 15, borderWidth: 1, borderColor: Colors.border, height: 140 },
  noteTitle: { ...Typography.title, fontSize: 16, marginBottom: 5, flex: 1, paddingRight: 5 },
  noteDate: { ...Typography.caption, fontSize: 12, marginBottom: 8 },
  noteContent: { ...Typography.body, fontSize: 14, color: Colors.textSecondary },
  
  moodSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: Colors.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  moodBadge: { padding: 5, borderRadius: 20, marginHorizontal: 3 },
  moodActive: { backgroundColor: Colors.primary + '50' },
  
  titleInput: { ...Typography.header, marginVertical: 10, padding: 10 },
  contentInput: { ...Typography.body, flex: 1, padding: 10, fontSize: 16, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: Colors.text, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surfaceHighlight, padding: 25, borderRadius: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { ...Typography.title, marginBottom: 25 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, width: '100%', padding: 15, borderRadius: 12, marginBottom: 10 },
  actionText: { ...Typography.body, fontWeight: '600' }
});
