import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';

export const ChatsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>💬 Direct & Group Chats</Text>

      <Card>
        <Text style={styles.cardTitle}>Royal Textiles & Fashion Hub</Text>
        <Text style={styles.cardSub}>Surat, Gujarat • Wholesale Manufacturer</Text>
        <Text style={styles.msgSnippet}>"Can you send latest summer catalog price list?"</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>👕 Clothing Trade Group #1</Text>
        <Text style={styles.cardSub}>Capacity: 38 / 40 Members • Broadcast Channel</Text>
        <Text style={styles.msgSnippet}>"Member #1024: Hot selling kurtis available in bulk..."</Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cardSub: { color: '#818cf8', fontSize: 11, marginTop: 2, marginBottom: 8 },
  msgSnippet: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic' },
});
