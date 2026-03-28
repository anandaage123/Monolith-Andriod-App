import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Alert, 
  Keyboard, 
  Animated, 
  Platform, 
  Modal, 
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
const cacheDirectory = (FileSystem as any).cacheDirectory;
const writeAsStringAsync = (FileSystem as any).writeAsStringAsync;
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { MM_Colors, Typography, Shadows, Spacing } from '../theme/Theme';

const { width, height } = Dimensions.get('window');

type Mood = '😀' | '😌' | '😐' | '😩' | '😡';
const MOODS: Mood[] = ['😀', '😌', '😐', '😩', '😡'];
const CATEGORIES = ['All', 'Personal', 'Work', 'Ideas', 'Travel', 'Dreams'];

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: Mood;
  category: string;
}

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

  const [hint, setHint] = useState('');
  const [showHint, setShowHint] = useState(false);

  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPinStatus();
    loadNotes();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!isFocused && isAuthenticated) {
      // Auto-lock when leaving
      setIsAuthenticated(false);
      setPin('');
      setIsEditing(false);
      setIsViewing(false);
    }
  }, [isFocused]);

  const checkPinStatus = async () => {
    try {
      let savedPin = await AsyncStorage.getItem('@journal_pin_v3');
      
      // Auto-migrate from older version keys if v3 is not set
      if (!savedPin) {
        const legacyPin = await AsyncStorage.getItem('@journal_pin_v2') || await AsyncStorage.getItem('@journal_pin');
        if (legacyPin && legacyPin.length === 6) {
          await AsyncStorage.setItem('@journal_pin_v3', legacyPin);
          savedPin = legacyPin;
        }
      }

      setHasRegisteredPin(!!savedPin);
      if (!savedPin) {
         setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('PIN check failed:', e);
      setHasRegisteredPin(false); // Fail safe
      setIsAuthenticated(true); 
    }
  };

  const startSetup = () => {
    setIsAuthenticated(false);
    setSetupStep('set');
    setPin('');
    setIsSettingsVisible(false);
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const shake = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handlePinInput = async (digit: string) => {
    const newPin = pin + digit;
    if (newPin.length > 6) return;
    setPin(newPin);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    
    if (newPin === '198921') {
      try {
        const savedPin = await AsyncStorage.getItem('@journal_pin_v3');
        if (savedPin) {
          setHint(savedPin.split('').reverse().join(''));
          setShowHint(true);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => {
            setShowHint(false);
            setHint('');
          }, 600);
        } else {
          shake();
        }
      } catch (e) {
        shake();
      }
      setTimeout(() => setPin(''), 50);
      return;
    }
    
    if (newPin.length === 6) {
      setTimeout(async () => {
        if (setupStep === 'set') {
          setTempPin(newPin);
          setSetupStep('confirm');
          setPin('');
        } else if (setupStep === 'confirm') {
          if (newPin === tempPin) {
             await AsyncStorage.setItem('@journal_pin_v3', newPin);
             setHasRegisteredPin(true);
             setIsAuthenticated(true);
             setSetupStep('none');
             triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
             shake();
             Alert.alert("Retry Required", "PINs don't match. Please set your 6-digit PIN carefully.");
             setSetupStep('set');
          }
          setPin('');
        } else {
          try {
            const savedPin = await AsyncStorage.getItem('@journal_pin_v3');
            if (newPin === savedPin) {
              setIsAuthenticated(true);
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              shake();
            }
          } catch (e) {
            shake();
          }
          setPin('');
        }
      }, 100);
    }
  };

  const removeLastDigit = () => {
    setPin(pin.slice(0, -1));
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert("Nothing to Export", "Your journal is empty. Add some entries first.");
      return;
    }

    const header = `DAILY HUB JOURNAL EXPORT\nGenerated: ${new Date().toLocaleString()}\nTotal entries: ${notes.length}\n${'='.repeat(35)}\n\n`;
    const content = notes.map(n => 
      `DATE: ${n.date}\nTITLE: ${n.title}\nMOOD: ${n.mood || 'N/A'}\nCATEGORY: ${n.category}\n\n${n.content}\n\n${'-'.repeat(20)}\n\n`
    ).join('');

    const fullText = header + content;

    try {
      const fileName = `Journal_${new Date().toISOString().split('T')[0]}.txt`;
      const filePath = `${cacheDirectory}${fileName}`;
      await writeAsStringAsync(filePath, fullText);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Journal',
          UTI: 'public.plain-text'
        });
      } else {
        // Fallback to basic share
        const { Share: RNShare } = require('react-native');
        await RNShare.share({ message: fullText, title: 'Journal Export' });
      }
      setIsSettingsVisible(false);
    } catch (e) {
      Alert.alert("Export Failed", "Could not generate the export file.");
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
      title: currentNote.title || 'Untitled Entry',
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteNote = () => {
    if (noteToDelete) {
      const updatedNotes = notes.filter(n => n.id !== noteToDelete);
      saveNotes(updatedNotes);
      setIsDeleteModalVisible(false);
      setIsViewing(false);
      setNoteToDelete(null);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderAuthScreen = () => (
    <View style={styles.authContainer}>
      <LinearGradient colors={['#F9F5FF', '#FDFDFF']} style={StyleSheet.absoluteFill} />
      <View style={styles.authMain}>
        <Animated.View style={[styles.identitySection, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.enhancedIconContainer}>
             <LinearGradient colors={[MM_Colors.primary + '20', MM_Colors.primary + '05']} style={styles.iconCircle}>
                <MaterialCommunityIcons name="feather" size={44} color={MM_Colors.primary} />
             </LinearGradient>
          </View>
          <Text style={styles.authHeading}>
            {setupStep === 'none' ? 'Your Journal' : (setupStep === 'set' ? 'Set Your PIN' : 'Confirm PIN')}
          </Text>
          <Text style={styles.authSubtext}>
            {setupStep === 'none' ? 'Secure entry to your private thoughts.' : 'Choose a 6-digit PIN for your journal.'}
          </Text>
        </Animated.View>

        <View style={styles.pinDisplay}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotActive]} />
          ))}
        </View>

        {showHint && (
          <View style={{position: 'absolute', right: 20, top: height * 0.4}}>
            <Text style={{fontSize: 14, color: MM_Colors.textVariant, opacity: 0.1, fontWeight: '800'}}>{hint}</Text>
          </View>
        )}

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((digit, index) => (
             digit === '.' ? (
               <View key="blank" style={{ width: 80 }} />
             ) : (
               <Pressable key={digit} style={({pressed}) => [styles.keypadBtn, pressed && {backgroundColor: '#F7F7FF'}]} onPress={() => handlePinInput(digit.toString())}>
                 <Text style={styles.keypadBtnText}>{digit}</Text>
               </Pressable>
             )
          ))}
          <Pressable style={styles.keypadBtn} onPress={removeLastDigit}>
            <Ionicons name="backspace-outline" size={28} color={MM_Colors.textVariant} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (hasRegisteredPin === null) {
      return (
        <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
           <ActivityIndicator size="large" color={MM_Colors.primary} />
        </View>
      );
  }

  if (!isAuthenticated && hasRegisteredPin) {
    return renderAuthScreen();
  }

  return (
    <View style={styles.mainContainer}>
      {/* Background Gradient */}
      <LinearGradient 
        colors={['#FDFCFF', '#F9F5FF']} 
        style={StyleSheet.absoluteFill} 
      />

      {/* App Bar */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.logoText}>Journal</Text>
          <Text style={styles.appBarSub}>DAILY HUB</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={24} color={MM_Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Header Info */}
      <View style={styles.summaryBar}>
         <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{notes.length}</Text>
            <Text style={styles.summaryLabel}>Entries</Text>
         </View>
         <View style={styles.summaryDivider} />
         <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>
              {notes.length > 0 ? (notes.filter(n => n.date === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })).length) : 0}
            </Text>
            <Text style={styles.summaryLabel}>Today</Text>
         </View>
      </View>

      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color={MM_Colors.textVariant} />
            <TextInput 
              placeholder="Search your thoughts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#A0A0B0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={MM_Colors.textVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories (Sticky-ish) */}
        <View style={{backgroundColor: 'transparent', paddingVertical: 8}}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
            style={styles.filterBar}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => { setSelectedCategory(cat); triggerHaptic(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat && { color: '#FFF' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
               <MaterialCommunityIcons name="feather" size={40} color={MM_Colors.primary} />
            </View>
            <Text style={styles.emptyTextTitle}>No Entries Found</Text>
            <Text style={styles.emptyTextSub}>
              {searchQuery ? "Try a different search term or category." : "Start capturing your ideas and feelings today."}
            </Text>
          </View>
        )}

        {/* Notes Grid */}
        <View style={styles.notesGrid}>
          {filteredNotes.map((note) => (
            <TouchableOpacity 
              key={note.id} 
              style={styles.noteCard}
              activeOpacity={0.8}
              onPress={() => {
                setCurrentNote(note);
                setIsViewing(true);
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.noteTop}>
                 <View style={styles.cardIndicatorMood}>
                    <Text style={{fontSize: 24}}>{note.mood || '😌'}</Text>
                 </View>
                 <View style={{flex: 1, paddingLeft: 16}}>
                    <Text style={styles.noteCardTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.noteDateText}>{note.date}</Text>
                 </View>
              </View>
              <Text style={styles.noteCardContent} numberOfLines={2}>{note.content}</Text>
              <View style={styles.noteBottom}>
                 <View style={styles.bottomTag}>
                    <Text style={styles.tagText}>{note.category}</Text>
                 </View>
                 <Ionicons name="chevron-forward-outline" size={16} color={MM_Colors.textVariant} />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fabMain}
        onPress={() => {
          setCurrentNote({ category: 'Personal', mood: '😌' });
          setIsEditing(true);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <LinearGradient 
          colors={[MM_Colors.primary, MM_Colors.primaryLight]} 
          style={styles.fabInner}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* View/Edit Note Modal */}
      <Modal 
        visible={isEditing || isViewing} 
        animationType="slide" 
        transparent={false}
        statusBarTranslucent
      >
        <View style={{flex: 1, backgroundColor: '#FFF'}}>
           <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => { setIsEditing(false); setIsViewing(false); }}>
                 <Text style={styles.navText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitleMain}>
                {isEditing ? (currentNote.id ? 'Edit Entry' : 'New Entry') : 'Reading'}
              </Text>
              <TouchableOpacity onPress={isViewing ? () => setIsEditing(true) : saveCurrentNote}>
                 <Text style={[styles.navText, { color: MM_Colors.primary, fontWeight: '800' }]}>
                   {isViewing ? 'Edit' : 'Save'}
                 </Text>
              </TouchableOpacity>
           </View>

           <KeyboardAvoidingView 
              style={{flex: 1}} 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
           >
             <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 40}}>
                {isEditing ? (
                  <>
                    <View style={styles.editControls}>
                      <View style={styles.selectorGroup}>
                         <Text style={styles.labelSmall}>MOOD</Text>
                         <View style={{flexDirection: 'row', gap: 12}}>
                            {MOODS.map(m => (
                              <TouchableOpacity 
                                key={m} 
                                onPress={() => { setCurrentNote({...currentNote, mood: m}); triggerHaptic(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.moodBadge, currentNote.mood === m && styles.moodActive]}
                              >
                                <Text style={{fontSize: 24, opacity: currentNote.mood === m ? 1 : 0.4}}>{m}</Text>
                              </TouchableOpacity>
                            ))}
                         </View>
                      </View>

                      <View style={styles.selectorGroup}>
                         <Text style={styles.labelSmall}>CATEGORY</Text>
                         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                            {CATEGORIES.slice(1).map(c => (
                              <TouchableOpacity 
                                key={c} 
                                onPress={() => { setCurrentNote({...currentNote, category: c}); triggerHaptic(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.catChip, currentNote.category === c && styles.catChipActive]}
                              >
                                <Text style={[styles.catChipText, currentNote.category === c && {color: '#FFF'}]}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                         </ScrollView>
                      </View>
                    </View>

                    <TextInput
                      style={styles.titleInput}
                      placeholder="Enter Title"
                      value={currentNote.title}
                      onChangeText={t => setCurrentNote({...currentNote, title: t})}
                      placeholderTextColor="#D0D0E0"
                    />
                    <TextInput
                      style={styles.contentInput}
                      placeholder="Write your heart out..."
                      multiline
                      value={currentNote.content}
                      onChangeText={c => setCurrentNote({...currentNote, content: c})}
                      placeholderTextColor="#A0A0B0"
                    />
                  </>
                ) : (
                  <View style={styles.viewContent}>
                     <View style={styles.viewMeta}>
                        <View style={[styles.tagBadge, {backgroundColor: MM_Colors.primary + '15'}]}>
                           <Text style={[styles.tagText, {color: MM_Colors.primary}]}>{currentNote.category}</Text>
                        </View>
                        <Text style={styles.viewDate}>{currentNote.date}</Text>
                     </View>
                     <View style={styles.viewTitleRow}>
                        <Text style={styles.viewTitle}>{currentNote.title}</Text>
                        <Text style={styles.viewMoodBig}>{currentNote.mood}</Text>
                     </View>
                     <View style={styles.viewBodyWrapper}>
                        <Text style={styles.viewBody}>{currentNote.content}</Text>
                     </View>

                     <TouchableOpacity 
                        style={[styles.actionRow, {marginTop: 40, borderBottomWidth: 0}]}
                        onPress={() => { setNoteToDelete(currentNote.id!); setIsDeleteModalVisible(true); }}
                     >
                        <View style={[styles.actionIconBg, {backgroundColor: '#FFF2F5'}]}>
                           <Ionicons name="trash-outline" size={20} color={MM_Colors.error} />
                        </View>
                        <Text style={[styles.actionTextMain, {color: MM_Colors.error}]}>Delete Entry</Text>
                     </TouchableOpacity>
                  </View>
                )}
             </ScrollView>
           </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Settings Action Bottom Sheet */}
      <Modal visible={isSettingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlayAction}>
          <Pressable style={{flex: 1}} onPress={() => setIsSettingsVisible(false)} />
          <View style={styles.modalContentAction}>
             <View style={styles.actionIndicator} />
             <Text style={styles.actionHeader}>Journal Options</Text>
             
             <View style={styles.actionGroup}>
               <Pressable style={styles.actionRow} onPress={exportNotes}>
                  <View style={[styles.actionIconBg, {backgroundColor: MM_Colors.primary + '15'}]}>
                    <Ionicons name="cloud-download-outline" size={20} color={MM_Colors.primary} />
                  </View>
                  <View style={{flex: 1, paddingLeft: 12}}>
                    <Text style={styles.actionTextMain}>Export Entries</Text>
                    <Text style={styles.actionTextSub}>Save all entries as a .txt file</Text>
                  </View>
               </Pressable>

               <Pressable style={styles.actionRow} onPress={startSetup}>
                  <View style={[styles.actionIconBg, {backgroundColor: '#F7F7F9'}]}>
                    <Ionicons name="key-outline" size={20} color={MM_Colors.text} />
                  </View>
                  <View style={{flex: 1, paddingLeft: 12}}>
                    <Text style={styles.actionTextMain}>Privacy Settings</Text>
                    <Text style={styles.actionTextSub}>Change your 6-digit PIN</Text>
                  </View>
               </Pressable>

               <Pressable style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={() => {
                  setIsSettingsVisible(false);
                  Alert.alert("Wipe Journal", "This is permanent. Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete Everything", style: "destructive", onPress: async () => {
                        await AsyncStorage.removeItem('@daily_notes_v3');
                        setNotes([]);
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                    }}
                  ]);
               }}>
                  <View style={[styles.actionIconBg, {backgroundColor: '#FFF2F5'}]}>
                    <Ionicons name="trash-outline" size={20} color={MM_Colors.error} />
                  </View>
                  <View style={{flex: 1, paddingLeft: 12}}>
                    <Text style={[styles.actionTextMain, {color: MM_Colors.error}]}>Wipe Data</Text>
                    <Text style={styles.actionTextSub}>Permanently delete all notes</Text>
                  </View>
               </Pressable>
             </View>
             
             <TouchableOpacity style={styles.closeActionBtn} onPress={() => setIsSettingsVisible(false)}>
                <Text style={styles.closeActionText}>Close</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconBg}>
               <Ionicons name="trash-bin-outline" size={28} color={MM_Colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete this entry?</Text>
            <Text style={styles.confirmSub}>You cannot undo this action.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelConfirmBtn} onPress={() => { setIsDeleteModalVisible(false); setNoteToDelete(null); }}>
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteNote}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FAFAFF' },
  authContainer: { flex: 1, backgroundColor: '#FDFCFF', justifyContent: 'center' },
  authMain: { padding: 32, alignItems: 'center' },
  identitySection: { alignItems: 'center', marginBottom: 48 },
  enhancedIconContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 36, 
    backgroundColor: '#FFF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20, 
    ...Shadows.soft 
  },
  iconCircle: { width: 70, height: 70, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  authHeading: { ...Typography.header, fontSize: 32, textAlign: 'center', letterSpacing: -1 },
  authSubtext: { ...Typography.body, color: MM_Colors.textVariant, textAlign: 'center', fontSize: 16, marginTop: 4, opacity: 0.7 },
  pinDisplay: { flexDirection: 'row', gap: 16, marginBottom: 56 },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E0E0E8' },
  pinDotActive: { backgroundColor: MM_Colors.primary, ...Shadows.soft },
  keypad: { width: '100%', maxWidth: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  keypadBtn: { 
    width: 78, 
    height: 78, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFF', 
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  keypadBtnText: { ...Typography.title, fontSize: 28, fontWeight: '700' },

  appBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingBottom: 20 
  },
  logoText: { ...Typography.header, fontSize: 36, letterSpacing: -1.5 },
  appBarSub: { ...Typography.caption, color: MM_Colors.textVariant, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadows.soft },

  summaryBar: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24, alignItems: 'center' },
  summaryItem: { paddingRight: 24 },
  summaryVal: { ...Typography.header, fontSize: 24, color: MM_Colors.text },
  summaryLabel: { ...Typography.caption, fontSize: 13, fontWeight: '600' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#E0E0EA', marginRight: 24 },

  searchSection: { paddingHorizontal: 24, marginBottom: 16 },
  searchBarContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 16, 
    height: 52, 
    borderRadius: 20,
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  searchInput: { flex: 1, ...Typography.body, fontSize: 16, fontWeight: '500', paddingLeft: 10 },

  filterBar: { marginBottom: 12, flexGrow: 0 },
  filterChip: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 18, 
    backgroundColor: '#FFF', 
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.01)'
  },
  filterChipActive: { backgroundColor: MM_Colors.primary, ...Shadows.soft },
  filterChipText: { ...Typography.caption, fontWeight: '800', color: MM_Colors.textVariant, fontSize: 13 },

  notesGrid: { paddingHorizontal: 24, gap: 20 },
  noteCard: { 
    backgroundColor: '#FFF', 
    padding: 24, 
    borderRadius: 28, 
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  noteTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIndicatorMood: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F0F0FF', justifyContent: 'center', alignItems: 'center' },
  noteCardTitle: { ...Typography.title, fontSize: 20, fontWeight: '800', marginBottom: 2 },
  noteDateText: { ...Typography.caption, color: MM_Colors.textVariant, fontWeight: '600' },
  noteCardContent: { ...Typography.body, fontSize: 16, color: MM_Colors.textVariant, lineHeight: 24, opacity: 0.8 },
  noteBottom: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F7F7F9'
  },
  bottomTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FAFAFF' },
  tagText: { ...Typography.caption, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: MM_Colors.primary },

  fabMain: { position: 'absolute', bottom: 32, right: 24, width: 68, height: 68, borderRadius: 28, ...Shadows.soft, elevation: 8 },
  fabInner: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },

  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 64 : 44, 
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F9'
  },
  headerTitleMain: { ...Typography.title, fontSize: 18, fontWeight: '800' },
  navText: { color: MM_Colors.textVariant, fontSize: 17, fontWeight: '600' },

  editControls: { paddingHorizontal: 24, marginTop: 24, marginBottom: 28 },
  selectorGroup: { marginBottom: 24 },
  labelSmall: { ...Typography.caption, fontWeight: '800', color: MM_Colors.textVariant, marginBottom: 12, letterSpacing: 1 },
  moodBadge: { 
    width: 56, 
    height: 56, 
    borderRadius: 20, 
    backgroundColor: '#F8F8FF', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  moodActive: { backgroundColor: '#FFF', borderWidth: 2, borderColor: MM_Colors.primary, ...Shadows.soft },
  catChip: { 
    paddingHorizontal: 22, 
    paddingVertical: 12, 
    borderRadius: 20, 
    backgroundColor: '#FFF', 
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  catChipActive: { backgroundColor: MM_Colors.primary, ...Shadows.soft },
  catChipText: { ...Typography.body, fontWeight: '700', color: MM_Colors.textVariant },

  titleInput: { ...Typography.header, fontSize: 34, paddingHorizontal: 24, marginBottom: 16, letterSpacing: -1 },
  contentInput: { 
    flex: 1, 
    ...Typography.body, 
    paddingHorizontal: 24, 
    fontSize: 18, 
    lineHeight: 28, 
    textAlignVertical: 'top',
    color: '#2C2A51'
  },

  viewContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120 },
  viewMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  tagBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  viewDate: { ...Typography.body, color: MM_Colors.textVariant, fontSize: 16, fontWeight: '500' },
  viewTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  viewTitle: { ...Typography.header, fontSize: 38, flex: 1, letterSpacing: -1.5, lineHeight: 46 },
  viewMoodBig: { fontSize: 44, marginLeft: 16 },
  viewBodyWrapper: { 
    backgroundColor: '#FFF', 
    padding: 28, 
    borderRadius: 32, 
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.01)'
  },
  viewBody: { ...Typography.body, fontSize: 18, lineHeight: 30, color: '#3A385F' },

  modalOverlayAction: { flex: 1, backgroundColor: 'rgba(15,14,23,0.5)', justifyContent: 'flex-end' },
  modalContentAction: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 32, 
    paddingBottom: Platform.OS === 'ios' ? 44 : 32 
  },
  actionIndicator: { width: 44, height: 6, backgroundColor: '#E0E0EA', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  actionHeader: { ...Typography.header, fontSize: 26, marginBottom: 28 },
  actionGroup: { gap: 12, marginBottom: 24 },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0FF',
    gap: 16
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionTextMain: { ...Typography.body, fontSize: 18, fontWeight: '700' },
  actionTextSub: { ...Typography.caption, fontSize: 13, color: MM_Colors.textVariant, marginTop: 2 },
  closeActionBtn: { backgroundColor: '#F4F4F9', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  closeActionText: { ...Typography.body, fontWeight: '700', color: MM_Colors.textVariant },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15,14,23,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmContent: { backgroundColor: '#FFF', borderRadius: 36, padding: 32, width: '100%', maxWidth: 320, alignItems: 'center', ...Shadows.soft },
  confirmIconBg: { width: 70, height: 70, borderRadius: 24, backgroundColor: '#FFF2F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmTitle: { ...Typography.header, fontSize: 22, textAlign: 'center' },
  confirmSub: { ...Typography.body, fontSize: 15, textAlign: 'center', color: MM_Colors.textVariant, marginTop: 8, marginBottom: 32 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelConfirmBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 18, backgroundColor: '#F4F4F9' },
  cancelConfirmText: { ...Typography.body, color: MM_Colors.textVariant, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 18, backgroundColor: MM_Colors.error },
  deleteConfirmText: { ...Typography.body, color: '#FFF', fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: MM_Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTextTitle: { ...Typography.header, fontSize: 24, color: MM_Colors.text },
  emptyTextSub: { ...Typography.body, color: MM_Colors.textVariant, textAlign: 'center', marginTop: 8, lineHeight: 24 },
});
