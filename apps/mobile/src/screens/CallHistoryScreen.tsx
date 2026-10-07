import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { Header, PageTitle, SectionTitle, MutedText, BodyText, EmptyState } from '../components/common';
import { colors, spacing, borderRadius } from '../theme/theme';
import { useGetCallHistoryQuery, CallLogItem } from '../store/api/callApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CallHistory'>;

export const CallHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { data, isLoading, refetch } = useGetCallHistoryQuery();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCallUser = (targetUser: any, callType: 'AUDIO' | 'VIDEO' = 'AUDIO') => {
    if (!targetUser) return;
    navigation.navigate('Call', {
      recipientId: targetUser.id,
      recipientName: targetUser.fullName || targetUser.mobileNumber,
      recipientAvatar: targetUser.avatar,
      callType,
      isIncoming: false,
    });
  };

  const renderCallItem = ({ item }: { item: CallLogItem }) => {
    // Current user context check
    const isOutgoing = true; // relative item
    const otherUser = item.receiver || item.caller;
    const isMissed = item.status === 'MISSED' || item.status === 'REJECTED';

    const formatTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (secs: number) => {
      if (secs === 0) return 'No Answer';
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      if (mins === 0) return `${remainingSecs}s`;
      return `${mins}m ${remainingSecs}s`;
    };

    return (
      <View style={styles.callRow}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {otherUser?.avatar ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {otherUser?.fullName ? otherUser.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.userName}>{otherUser?.fullName || 'Business User'}</Text>
          <View style={styles.subRow}>
            <Text style={[styles.directionIcon, isMissed && styles.missedText]}>
              {isMissed ? '↙ Missed' : '↗ Outgoing'}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.callTypeLabel}>{item.callType === 'VIDEO' ? '📹 Video' : '📞 Voice'}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.durationText}>{formatDuration(item.durationSecs)}</Text>
          </View>
          <Text style={styles.timestampText}>{formatTime(item.startedAt)}</Text>
        </View>

        {/* Quick Call Action */}
        <TouchableOpacity
          style={styles.callActionBtn}
          onPress={() => handleCallUser(otherUser, item.callType)}
        >
          <Text style={styles.callActionIcon}>{item.callType === 'VIDEO' ? '📹' : '📞'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Call Logs History" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={data?.calls || []}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="📞"
              title="No Call History Yet"
              description="Calls made or received with verified suppliers will appear here."
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarInitial: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: '800',
  },
  infoContainer: {
    flex: 1,
  },
  userName: {
    color: colors.textMain,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  directionIcon: {
    color: colors.successLight,
    fontSize: 11,
    fontWeight: '700',
  },
  missedText: {
    color: colors.error,
  },
  dotSeparator: {
    color: colors.textSubtle,
    marginHorizontal: 4,
    fontSize: 10,
  },
  callTypeLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  durationText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  timestampText: {
    color: colors.textSubtle,
    fontSize: 10,
  },
  callActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  callActionIcon: {
    fontSize: 18,
  },
});
