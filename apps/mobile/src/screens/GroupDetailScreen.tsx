import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { Header } from '../components/common/Header';
import { useGetGroupByIdQuery, useGetGroupMessagesQuery, useSendGroupMessageMutation } from '../store/api/groupApi';
import { useAppSelector } from '../hooks/useRedux';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

export const GroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, groupTitle } = route.params;
  const { user } = useAppSelector((state) => state.auth);
  const [text, setText] = useState('');

  const { data: groupData } = useGetGroupByIdQuery(groupId);
  const { data: messagesData, refetch } = useGetGroupMessagesQuery({ groupId });
  const [sendGroupMsg, { isLoading: isSending }] = useSendGroupMessageMutation();

  const group = groupData?.group;

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await sendGroupMsg({ groupId, text: text.trim() }).unwrap();
      setText('');
      refetch();
    } catch (err: any) {
      Alert.alert('Group Post Error', err?.data?.error || 'Only Group Admins can post in this broadcast channel.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={groupTitle || group?.title || 'Trade Broadcast Group'}
        subtitle={group?.onlyAdminCanPost ? '🔒 Admin Broadcast Only' : '💬 Open Trade Channel'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messagesData?.messages || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                <Text style={styles.senderName}>{item.sender?.fullName || 'Group Member'}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        {(!group?.onlyAdminCanPost || group?.roleInGroup === 'ADMIN') && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Post broadcast message to channel..."
              placeholderTextColor="#64748b"
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isSending}>
              <Text style={styles.sendIcon}>➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flexOne: { flex: 1 },
  messagesList: { padding: 14 },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myBubble: { backgroundColor: '#4f46e5', alignSelf: 'flex-end' },
  otherBubble: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', alignSelf: 'flex-start' },
  senderName: { color: '#818cf8', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  msgText: { color: '#ffffff', fontSize: 14 },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, textAlign: 'right', marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  input: { flex: 1, backgroundColor: '#020617', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: '#ffffff', borderWidth: 1, borderColor: '#1e293b' },
  sendBtn: { backgroundColor: '#4f46e5', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendIcon: { color: '#ffffff', fontWeight: '900' },
});
