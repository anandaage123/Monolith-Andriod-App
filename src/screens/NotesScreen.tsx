import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem('@notes');
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) { }
  };

  const saveNotes = async (newNotes: Note[]) => {
    try {
      await AsyncStorage.setItem('@notes', JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (e) { }
  };

  const saveCurrentNote = () => {
    if (!currentNote.title?.trim() && !currentNote.content?.trim()) {
      setIsEditing(false);
      return;
    }
    const newNote: Note = {
      id: currentNote.id || Date.now().toString(),
      title: currentNote.title || 'Untitled',
      content: currentNote.content || '',
      date: new Date().toLocaleDateString(),
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
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          saveNotes(notes.filter(n => n.id !== id));
        }
      },
    ]);
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={saveCurrentNote}>
            <Ionicons name="chevron-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editing Note</Text>
          <View style={{ width: 28 }} />
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity onPress={() => { setCurrentNote({}); setIsEditing(true); }}>
          <Ionicons name="create-outline" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>
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
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.noteDate}>{item.date}</Text>
            <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    ...Typography.header,
  },
  row: {
    justifyContent: 'space-between',
  },
  noteCard: {
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 16,
    width: '48%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 140,
  },
  noteTitle: {
    ...Typography.title,
    fontSize: 16,
    marginBottom: 5,
  },
  noteDate: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: 8,
  },
  noteContent: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  titleInput: {
    ...Typography.header,
    marginVertical: 10,
    padding: 10,
  },
  contentInput: {
    ...Typography.body,
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
});
