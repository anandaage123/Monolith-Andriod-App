import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const stored = await AsyncStorage.getItem('@daily_todos_v2');
      if (stored) setTodos(JSON.parse(stored));
    } catch (e) {
      console.log('Failed to load todos', e);
    }
  };

  const saveTodos = async (newTodos: Todo[]) => {
    setTodos(newTodos); // Optimistic UI update immediately
    try {
      await AsyncStorage.setItem('@daily_todos_v2', JSON.stringify(newTodos));
    } catch (e) {
      console.log('Failed to save todos', e);
    }
  };

  const aAddTodo = () => {
    if (inputText.trim()) {
      const newTodo = { id: Date.now().toString(), text: inputText.trim(), completed: false };
      saveTodos([newTodo, ...todos]);
      setInputText('');
    }
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTodos(newTodos);
  };

  const deleteTodo = (id: string) => {
    const newTodos = todos.filter(t => t.id !== id);
    saveTodos(newTodos);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tasks</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={aAddTodo}
        />
        <TouchableOpacity style={styles.addButton} onPress={aAddTodo}>
          <Ionicons name="add" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity style={styles.todoContent} onPress={() => toggleTodo(item.id)}>
              <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                {item.completed && <Ionicons name="checkmark" size={16} color={Colors.text} />}
              </View>
              <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>
                {item.text}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTodo(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  header: { ...Typography.header, marginBottom: 20 },
  inputContainer: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, backgroundColor: Colors.surface, color: Colors.text, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  addButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 12, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  todoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  todoContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxCompleted: { backgroundColor: Colors.primary },
  todoText: { ...Typography.body, flex: 1 },
  todoTextCompleted: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  deleteButton: { padding: 5 }
});
