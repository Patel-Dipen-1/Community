import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

interface InAppBannerProps {
  visible: boolean;
  title: string;
  body: string;
  avatar?: string;
  onPress: () => void;
  onDismiss: () => void;
}

export const InAppNotificationBanner: React.FC<InAppBannerProps> = ({
  visible,
  title,
  body,
  avatar,
  onPress,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      dismiss();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const initialChar = (title || 'U').charAt(0).toUpperCase();

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.9}
        onPress={() => {
          dismiss();
          onPress();
        }}
      >
        <View style={styles.avatarWrapper}>
          {avatar && avatar.startsWith('http') ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>{initialChar}</Text>
            </View>
          )}
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.infoWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timeTag}>Just now • 💬</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {body}
          </Text>
        </View>

        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Reply</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4338ca',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#818cf8',
  },
  defaultAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  infoWrapper: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  timeTag: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '700',
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
