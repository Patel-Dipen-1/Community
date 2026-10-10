import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { colors, spacing, borderRadius } from '../theme/theme';
import { useLogCallMutation } from '../store/api/callApi';

import { socketService } from '../services/socket/socketService';

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>;
type CallState = 'INCOMING' | 'DIALING' | 'CONNECTED' | 'ENDED';

export const CallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { recipientId, recipientName, recipientAvatar, callType = 'AUDIO', isIncoming = false } = route.params;

  const [callState, setCallState] = useState<CallState>(isIncoming ? 'INCOMING' : 'DIALING');
  const [durationSecs, setDurationSecs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'VIDEO');

  const [logCall] = useLogCallMutation();

  // Socket call invitation & status listeners
  useEffect(() => {
    socketService.connect();

    if (!isIncoming) {
      console.log('📞 Emitting call:invite to recipient:', recipientId);
      socketService.emit('call:invite', {
        targetUserId: recipientId,
        callType,
      });
    }

    const handleCallAccepted = () => {
      console.log('📞 Remote party accepted call');
      setCallState('CONNECTED');
    };

    const handleCallEnded = () => {
      console.log('📞 Remote party ended call');
      setCallState('ENDED');
      setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
      }, 800);
    };

    const handleCallError = (errData: any) => {
      console.warn('📞 Call error:', errData);
      Alert.alert('Call Status', errData?.message || 'Call unavailable or user offline.');
      setCallState('ENDED');
      if (navigation.canGoBack()) navigation.goBack();
    };

    socketService.on('call:accepted', handleCallAccepted);
    socketService.on('call:ended', handleCallEnded);
    socketService.on('call:rejected', handleCallEnded);
    socketService.on('call:error', handleCallError);

    return () => {
      socketService.off('call:accepted', handleCallAccepted);
      socketService.off('call:ended', handleCallEnded);
      socketService.off('call:rejected', handleCallEnded);
      socketService.off('call:error', handleCallError);
    };
  }, [isIncoming, recipientId, callType]);

  // Timer counter for active call duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setDurationSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Handle Accept Call (Incoming)
  const handleAcceptCall = async () => {
    setCallState('CONNECTED');
    socketService.emit('call:accept', { targetUserId: recipientId });
  };

  // Handle Reject / Decline Call (Incoming)
  const handleRejectCall = async () => {
    socketService.emit('call:reject', { targetUserId: recipientId });
    try {
      await logCall({
        receiverId: recipientId,
        callType,
        status: 'REJECTED',
        durationSecs: 0,
      }).unwrap();
    } catch (e) {
      console.warn('Call log network notice:', e);
    }
    setCallState('ENDED');
    if (navigation.canGoBack()) navigation.goBack();
  };

  // Handle End Call (Active or Dialing)
  const handleEndCall = async () => {
    socketService.emit('call:end', { targetUserId: recipientId });
    const finalStatus = callState === 'CONNECTED' ? 'CONNECTED' : 'MISSED';
    try {
      await logCall({
        receiverId: recipientId,
        callType,
        status: finalStatus,
        durationSecs,
      }).unwrap();
    } catch (e) {
      console.warn('Call log network notice:', e);
    }
    setCallState('ENDED');
    if (navigation.canGoBack()) navigation.goBack();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initialLetter = recipientName ? recipientName.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      {/* Top Header info */}
      <View style={styles.topHeader}>
        <Text style={styles.badgeText}>
          {callType === 'VIDEO' ? '📹 B2B Video Call' : '📞 B2B Audio Call'}
        </Text>
        <Text style={styles.statusText}>
          {callState === 'INCOMING' && 'Incoming Call...'}
          {callState === 'DIALING' && 'Calling supplier...'}
          {callState === 'CONNECTED' && `Active • ${formatTimer(durationSecs)}`}
          {callState === 'ENDED' && 'Call Ended'}
        </Text>
      </View>

      {/* User Info Avatar Section */}
      <View style={styles.avatarSection}>
        {recipientAvatar ? (
          <Image source={{ uri: recipientAvatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initialLetter}</Text>
          </View>
        )}
        <Text style={styles.recipientName}>{recipientName}</Text>
        <Text style={styles.subtitleText}>Verified Business Partner</Text>
      </View>

      {/* Mid Control Actions (Mute, Speaker, Video toggle) */}
      {callState === 'CONNECTED' && (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}
          >
            <Text style={styles.controlIcon}>🔊</Text>
            <Text style={styles.controlLabel}>{isSpeaker ? 'Earpiece' : 'Speaker'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isVideoOn && styles.controlBtnActive]}
            onPress={() => setIsVideoOn(!isVideoOn)}
          >
            <Text style={styles.controlIcon}>{isVideoOn ? '📹' : '📷'}</Text>
            <Text style={styles.controlLabel}>{isVideoOn ? 'Video On' : 'Video Off'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Call Action Buttons (Accept / Reject / End) */}
      <View style={styles.bottomActions}>
        {callState === 'INCOMING' ? (
          <View style={styles.incomingActions}>
            <TouchableOpacity style={[styles.actionCircle, styles.rejectBtn]} onPress={handleRejectCall}>
              <Text style={styles.actionIconText}>📞</Text>
              <Text style={styles.actionBtnLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCircle, styles.acceptBtn]} onPress={handleAcceptCall}>
              <Text style={styles.actionIconText}>📞</Text>
              <Text style={styles.actionBtnLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.actionCircle, styles.rejectBtn]} onPress={handleEndCall}>
            <Text style={styles.actionIconText}>🛑</Text>
            <Text style={styles.actionBtnLabel}>{callState === 'CONNECTED' ? 'End Call' : 'Cancel'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  topHeader: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  badgeText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  avatarInitial: {
    color: colors.textMain,
    fontSize: 48,
    fontWeight: '900',
  },
  recipientName: {
    color: colors.textMain,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  controlIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  controlLabel: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  bottomActions: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.error,
  },
  actionIconText: {
    fontSize: 26,
    color: colors.textMain,
  },
  actionBtnLabel: {
    color: colors.textMain,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    position: 'absolute',
    bottom: -22,
  },
});
