import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, Keyboard, Modal, Animated, Dimensions, StatusBar, Share, ScrollView, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type Mood = '😀' | '😌' | '😐' | '😩' | '😡';
const MOODS: Mood[] = ['😀', '😌', '😐', '😩', '😡'];

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: Mood;
  category: string;
}

const CATEGORIES = ['All', 'Personal', 'Work', 'Ideas'];

export default function NotesScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRegisteredPin, setHasRegisteredPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  
  const [setupStep, setSetupStep] = useState<'none' | 'set' | 'confirm'>('none');
  const [tempPin, setTempPin] = useState('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPinStatus();
    loadNotes();
  }, []);

  useEffect(() => {
    if (!isFocused && isAuthenticated) {
      setIsAuthenticated(false);
      setPin('');
      setIsEditing(false);
      setIsViewing(false);
    }
  }, [isFocused]);

  const checkPinStatus = async () => {
    try {
      const savedPin = await AsyncStorage.getItem('@journal_pin_v2');
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

  const cancelAuth = () => {
    if (setupStep !== 'none') {
      setSetupStep('none');
      setPin('');
    } else {
      navigation.navigate('Dashboard');
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handlePin = async (p: string) => {
    const newPin = pin + p;
    if (newPin.length > 6) return;
    setPin(newPin);
    
    if (newPin.length === 6) {
      setTimeout(async () => {
        if (setupStep === 'set') {
          setTempPin(newPin);
          setSetupStep('confirm');
        } else if (setupStep === 'confirm') {
          if (newPin === tempPin) {
             await AsyncStorage.setItem('@journal_pin_v2', newPin);
             setHasRegisteredPin(true);
             setIsAuthenticated(true);
             setSetupStep('none');
          } else {
             shake();
             Alert.alert("Error", "PINs don't match.");
             setSetupStep('set');
          }
        } else {
          const savedPin = await AsyncStorage.getItem('@journal_pin_v2');
          if (newPin === savedPin) {
            setIsAuthenticated(true);
          } else {
            shake();
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

  const exportNotes = async () => {
    if (notes.length === 0) {
      Alert.alert("Empty", "No notes to export.");
      return;
    }
    const content = notes.map(n => `TITLE: ${n.title}\nDATE: ${n.date}\nMOOD: ${n.mood || 'N/A'}\nCATEGORY: ${n.category}\n\n${n.content}\n\n-------------------\n\n`).join('');
    try {
        if (Platform.OS === 'ios') {
            const fileName = `MethodicMuse_Journal_Export_${new Date().getTime()}.txt`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(filePath, content);
            await Share.share({ url: filePath, title: 'Export Journal' });
        } else {
            await Share.share({ message: content, title: 'Export Journal' });
        }
    } catch (e) {
      Alert.alert("Error", "Could not export notes.");
    }
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
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      mood: currentNote.mood || '😌',
      category: currentNote.category || 'Personal',
    };
    let updatedNotes;
    if (currentNote.id) {
      updatedNotes = notes.map(n => n.id === currentNote.id ? newNote : n);
    } else {
      updatedNotes = [newNote, ...notes];
    }
    saveNotes(updatedNotes);
    setIsEditing(false);
    setIsViewing(true);
    setCurrentNote(newNote);
  };

  const confirmDeleteNote = (id: string) => {
    setNoteToDelete(id);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteNote = () => {
    if (noteToDelete) {
      const updatedNotes = notes.filter(n => n.id !== noteToDelete);
      saveNotes(updatedNotes);
      setIsDeleteModalVisible(false);
      setIsViewing(false);
      setNoteToDelete(null);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getAuthTitle = () => {
    if (setupStep === 'set') return "Set Journal PIN";
    if (setupStep === 'confirm') return "Confirm Journal PIN";
    return "Enter Journal PIN";
  };

  const screenPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) navigation.navigate('Dashboard');
      }
    })
  ).current;

  if (hasRegisteredPin === null) return null;

  if ((hasRegisteredPin && !isAuthenticated) || setupStep !== 'none') {
    return (
      <View style={styles.authContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.authMain}>
          <View style={styles.identitySection}>
            <View style={styles.enhancedIconContainer}>
              <MaterialIcons name="lock-outline" size={40} color={MM_Colors.primary} />
            </View>
            <Text style={styles.authHeading}>{getAuthTitle()}</Text>
            <Text style={styles.authSubtext}>Authentication required to access journal</Text>
          </View>

          <Animated.View style={[styles.pinDisplay, { transform: [{ translateX: shakeAnim }] }]}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.pinDot, pin.length >= i && styles.pinDotActive]} />
            ))}
          </Animated.View>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Pressable key={num} style={({ pressed }) => [styles.keypadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => handlePin(num.toString())}>
                <Text style={styles.keypadBtnText}>{num}</Text>
              </Pressable>
            ))}
            <Pressable style={({ pressed }) => [styles.keypadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={cancelAuth}>
              <Ionicons name="close" size={28} color={MM_Colors.textVariant} />
            </Pressable>
            <Pressable style={({ pressed }) => [styles.keypadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => handlePin('0')}>
              <Text style={styles.keypadBtnText}>0</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.keypadBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={() => setPin(pin.slice(0, -1))}>
              <Ionicons name="backspace-outline" size={28} color={MM_Colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (isViewing) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setIsViewing(false)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-back" size={28} color={MM_Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitleMain}>View Musing</Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Pressable onPress={() => { setIsViewing(false); setIsEditing(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="create-outline" size={24} color={MM_Colors.primary} />
            </Pressable>
            <Pressable onPress={() => confirmDeleteNote(currentNote.id!)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="trash-outline" size={24} color={MM_Colors.error} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.viewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.viewMeta}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{currentNote.category?.toUpperCase()}</Text>
            </View>
            <Text style={styles.viewDate}>{currentNote.date}</Text>
            <Text style={{ fontSize: 24 }}>{currentNote.mood}</Text>
          </View>
          <Text style={styles.viewTitle}>{currentNote.title}</Text>
          <Text style={styles.viewBody}>{currentNote.content}</Text>
        </ScrollView>
      </View>
    );
  }

  if (isEditing) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => { setIsEditing(false); if (currentNote.id) setIsViewing(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: MM_Colors.primary, fontSize: 17 }}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitleMain}>{currentNote.id ? 'Edit Musing' : 'New Musing'}</Text>
          <Pressable onPress={saveCurrentNote} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: MM_Colors.primary, fontSize: 17, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
        
        <View style={styles.editControls}>
          <View style={styles.selectorGroup}>
             <Text style={styles.labelSmall}>MOOD</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
               {MOODS.map(m => (
                 <Pressable key={m} onPress={() => setCurrentNote({...currentNote, mood: m})} style={({ pressed }) => [styles.moodBadge, currentNote.mood === m && styles.moodActive, { opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={{fontSize: 22}}>{m}</Text>
                 </Pressable>
               ))}
             </ScrollView>
          </View>

          <View style={styles.selectorGroup}>
             <Text style={styles.labelSmall}>CATEGORY</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
               {CATEGORIES.filter(c => c !== 'All').map(c => (
                 <Pressable key={c} onPress={() => setCurrentNote({...currentNote, category: c})} style={({ pressed }) => [styles.catChip, currentNote.category === c && styles.catChipActive, { opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={[styles.catChipText, currentNote.category === c && {color: '#FFF'}]}>{c}</Text>
                 </Pressable>
               ))}
             </ScrollView>
          </View>
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={MM_Colors.textVariant}
          value={currentNote.title}
          onChangeText={(text) => setCurrentNote({ ...currentNote, title: text })}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="Start writing..."
          placeholderTextColor={MM_Colors.textVariant}
          multiline
          value={currentNote.content}
          onChangeText={(text) => setCurrentNote({ ...currentNote, content: text })}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.mainContainer} {...screenPanResponder.panHandlers}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.appBar}>
        <Text style={styles.logoText}>Journal</Text>
        <Pressable onPress={() => setIsSettingsVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
           <Ionicons name="settings-outline" size={24} color={MM_Colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.searchSection}>
           <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color={MM_Colors.textVariant} style={{marginRight: 8}} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search musings"
                placeholderTextColor={MM_Colors.textVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
           </View>
        </View>

        <ScrollView
           horizontal
           showsHorizontalScrollIndicator={false}
           style={styles.filterBar}
           contentContainerStyle={{ paddingHorizontal: Spacing.padding, gap: 10 }}
        >
            {CATEGORIES.map(cat => (
              <Pressable
                 key={cat}
                 style={({ pressed }) => [styles.filterChip, selectedCategory === cat && styles.filterChipActive, { opacity: pressed ? 0.7 : 1 }]}
                 onPress={() => setSelectedCategory(cat)}
              >
                 <Text style={[styles.filterChipText, selectedCategory === cat && {color: '#FFF'}]}>
                    {cat}
                 </Text>
              </Pressable>
            ))}
        </ScrollView>

        <View style={styles.notesGrid}>
           {filteredNotes.length > 0 ? (
             filteredNotes.map((item) => (
               <Pressable
                 key={item.id}
                 style={({ pressed }) => [styles.noteCard, { opacity: pressed ? 0.7 : 1 }]}
                 onPress={() => { setCurrentNote(item); setIsViewing(true); }}
                 onLongPress={() => confirmDeleteNote(item.id)}
               >
                 <View style={styles.noteTop}>
                    <View style={styles.tagBadge}>
                       <Text style={styles.tagText}>{item.category.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.noteDateText}>{item.date}</Text>
                 </View>
                 <Text style={styles.noteCardTitle} numberOfLines={1}>{item.title}</Text>
                 <Text style={styles.noteCardContent} numberOfLines={3}>{item.content}</Text>
                 <View style={styles.noteBottom}>
                    <Text style={{fontSize: 18}}>{item.mood}</Text>
                    <Ionicons name="chevron-forward" size={16} color={MM_Colors.surfaceContainerHigh} />
                 </View>
               </Pressable>
             ))
           ) : (
             <View style={styles.emptyContainer}>
               <Ionicons name="document-text-outline" size={64} color={MM_Colors.surfaceContainer} />
               <Text style={styles.emptyText}>No musings found.</Text>
             </View>
           )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fabMain, { opacity: pressed ? 0.8 : 1 }]}
        onPress={() => { setCurrentNote({mood: '😌', category: 'Personal'}); setIsEditing(true); }}
      >
        <LinearGradient colors={[MM_Colors.primary, MM_Colors.primaryLight]} style={styles.fabInner}>
           <Ionicons name="add" size={32} color="#FFF" />
        </LinearGradient>
      </Pressable>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setIsSettingsVisible(false)}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Settings</Text>
             <Pressable style={styles.actionBtn} onPress={exportNotes}>
                <Ionicons name="share-outline" size={22} color={MM_Colors.primary} style={{marginRight: 12}} />
                <Text style={styles.actionText}>Export Musings</Text>
             </Pressable>
             <Pressable style={styles.actionBtn} onPress={startSetup}>
                <Ionicons name="key-outline" size={22} color={MM_Colors.primary} style={{marginRight: 12}} />
                <Text style={styles.actionText}>Change PIN</Text>
             </Pressable>
             <Pressable style={styles.actionBtn} onPress={() => {
                Alert.alert("Wipe Journal", "Permanently delete all notes?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Wipe All", style: "destructive", onPress: async () => {
                      await AsyncStorage.removeItem('@daily_notes_v3');
                      setNotes([]);
                      setIsSettingsVisible(false);
                  }}
                ]);
             }}>
                <Ionicons name="trash-outline" size={22} color={MM_Colors.error} style={{marginRight: 12}} />
                <Text style={[styles.actionText, {color: MM_Colors.error}]}>Delete All</Text>
             </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmContent}>
            <Text style={styles.confirmTitle}>Delete Musing?</Text>
            <Text style={styles.confirmSub}>This entry will be permanently removed.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.cancelConfirmBtn} onPress={() => { setIsDeleteModalVisible(false); setNoteToDelete(null); }}>
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirmBtn} onPress={handleDeleteNote}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: MM_Colors.background },
  authContainer: { flex: 1, backgroundColor: MM_Colors.background, justifyContent: 'center' },
  authMain: { padding: 32, alignItems: 'center' },
  identitySection: { alignItems: 'center', marginBottom: 40 },
  enhancedIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: MM_Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Shadows.soft },
  authHeading: { ...Typography.header, fontSize: 28, textAlign: 'center', marginBottom: 8 },
  authSubtext: { ...Typography.body, color: MM_Colors.textVariant, textAlign: 'center', fontSize: 15 },
  pinDisplay: { flexDirection: 'row', gap: 20, marginBottom: 48 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: MM_Colors.surfaceContainer },
  pinDotActive: { backgroundColor: MM_Colors.primary },
  keypad: { width: '100%', maxWidth: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 },
  keypadBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: MM_Colors.white, ...Shadows.soft },
  keypadBtnText: { ...Typography.title, fontSize: 24 },

  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.padding, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 12 },
  logoText: { ...Typography.header },

  searchSection: { paddingHorizontal: Spacing.padding, marginVertical: 12 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: MM_Colors.surfaceContainer, paddingHorizontal: 12, height: 40, borderRadius: 10 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 16 },

  filterBar: { marginBottom: 20, flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: MM_Colors.white, ...Shadows.soft },
  filterChipActive: { backgroundColor: MM_Colors.primary },
  filterChipText: { ...Typography.caption, fontWeight: '600', color: MM_Colors.textVariant },

  notesGrid: { paddingHorizontal: Spacing.padding, gap: 16 },
  noteCard: { backgroundColor: MM_Colors.white, padding: 16, borderRadius: 12, ...Shadows.soft },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: MM_Colors.background },
  tagText: { ...Typography.caption, fontSize: 10, fontWeight: '700', color: MM_Colors.primary },
  noteDateText: { ...Typography.caption, color: MM_Colors.textVariant },
  noteCardTitle: { ...Typography.title, fontSize: 18, marginBottom: 4 },
  noteCardContent: { ...Typography.body, fontSize: 15, color: MM_Colors.textVariant, lineHeight: 20 },
  noteBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },

  fabMain: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, ...Shadows.soft },
  fabInner: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.padding, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15 },
  headerTitleMain: { ...Typography.title, fontSize: 17, fontWeight: '600' },

  editControls: { paddingHorizontal: Spacing.padding, marginBottom: 20 },
  selectorGroup: { marginBottom: 16 },
  labelSmall: { ...Typography.caption, fontWeight: '700', color: MM_Colors.textVariant, marginBottom: 8 },
  moodBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: MM_Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.soft },
  moodActive: { backgroundColor: MM_Colors.surfaceContainer, borderWidth: 1, borderColor: MM_Colors.primary },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: MM_Colors.white, ...Shadows.soft },
  catChipActive: { backgroundColor: MM_Colors.primary },
  catChipText: { ...Typography.caption, fontWeight: '600', color: MM_Colors.textVariant },

  titleInput: { ...Typography.header, fontSize: 28, paddingHorizontal: Spacing.padding, marginBottom: 12 },
  contentInput: { flex: 1, ...Typography.body, paddingHorizontal: Spacing.padding, textAlignVertical: 'top' },

  viewContent: { paddingHorizontal: Spacing.padding, paddingTop: 10, paddingBottom: 100 },
  viewMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  viewDate: { ...Typography.body, color: MM_Colors.textVariant, fontSize: 15 },
  viewTitle: { ...Typography.header, fontSize: 32, marginBottom: 16 },
  viewBody: { ...Typography.body, lineHeight: 26 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: MM_Colors.white, borderRadius: 14, padding: 20, width: '100%', maxWidth: 300, ...Shadows.soft },
  modalTitle: { ...Typography.title, textAlign: 'center', marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: MM_Colors.surfaceContainer },
  actionText: { ...Typography.body, fontSize: 17 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { ...Typography.body, color: MM_Colors.textVariant, marginTop: 16 },

  confirmContent: { backgroundColor: MM_Colors.white, borderRadius: 14, padding: 20, width: '100%', maxWidth: 280, alignItems: 'center', ...Shadows.soft },
  confirmTitle: { ...Typography.title, fontSize: 17, marginBottom: 4 },
  confirmSub: { ...Typography.body, fontSize: 13, textAlign: 'center', color: MM_Colors.textVariant, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: MM_Colors.surfaceContainer, width: '100%' },
  cancelConfirmBtn: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: MM_Colors.surfaceContainer },
  cancelConfirmText: { ...Typography.body, color: MM_Colors.primary, fontSize: 17 },
  deleteConfirmBtn: { flex: 1, padding: 12, alignItems: 'center' },
  deleteConfirmText: { ...Typography.body, color: MM_Colors.error, fontSize: 17, fontWeight: '600' },
});
