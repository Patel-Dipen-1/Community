import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WhatsAppMediaCollageProps {
  urls: string[];
  caption?: string;
  onPressImage?: (url: string, index: number) => void;
}

export const WhatsAppMediaCollage = ({
  urls = [],
  caption,
  onPressImage,}: WhatsAppMediaCollageProps) => {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  const handleThumbPress = (idx: number) => {
    if (onPressImage) {
      onPressImage(urls[idx], idx);
    } else {
      setFullscreenIndex(idx);
    }
  };

  const totalCount = urls.length;
  const overflowCount = totalCount - 3; // For 4th tile overlay (+21 when 25 images)

  return (
    <View style={styles.container}>
      {/* CASE 1: Single Image */}
      {totalCount === 1 && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleThumbPress(0)}
          style={styles.singleBox}
        >
          <Image source={{ uri: urls[0] }} style={styles.singleImage} resizeMode="cover" />
        </TouchableOpacity>
      )}

      {/* CASE 2: 2 Images Side-by-Side */}
      {totalCount === 2 && (
        <View style={styles.row2Box}>
          {urls.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.9}
              onPress={() => handleThumbPress(idx)}
              style={styles.halfCell}
            >
              <Image source={{ uri: url }} style={styles.fillImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* CASE 3: 3 Images (1 Big Left + 2 Stacked Right) */}
      {totalCount === 3 && (
        <View style={styles.row3Box}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleThumbPress(0)}
            style={styles.leftBigCell}
          >
            <Image source={{ uri: urls[0] }} style={styles.fillImage} resizeMode="cover" />
          </TouchableOpacity>

          <View style={styles.rightColStack}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleThumbPress(1)}
              style={styles.stackedCell}
            >
              <Image source={{ uri: urls[1] }} style={styles.fillImage} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleThumbPress(2)}
              style={styles.stackedCell}
            >
              <Image source={{ uri: urls[2] }} style={styles.fillImage} resizeMode="cover" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CASE 4: 4+ Images WhatsApp 2x2 Grid with +N Overlay (e.g. +21) */}
      {totalCount >= 4 && (
        <View style={styles.grid2x2Box}>
          {urls.slice(0, 4).map((url, idx) => {
            const isFourthTile = idx === 3;
            const hasMore = isFourthTile && overflowCount > 0;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                onPress={() => handleThumbPress(idx)}
                style={styles.gridCell}
              >
                <Image source={{ uri: url }} style={styles.fillImage} resizeMode="cover" />
                {hasMore && (
                  <View style={styles.overlayMore}>
                    <Text style={styles.overlayMoreText}>+{overflowCount}</Text>
                    <Text style={styles.overlayMoreSub}>Photos</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Album Footer Badge for Multiple Images */}
      {totalCount > 1 && (
        <View style={styles.albumBadgeRow}>
          <Text style={styles.albumBadgeText}>
            🖼️ï¸ Album ({totalCount} Photos)
          </Text>
        </View>
      )}

      {/* Fullscreen Media Gallery Viewer Modal */}
      <Modal
        visible={fullscreenIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenIndex(null)}
      >
        <View style={styles.galleryModalBg}>
          {/* Top Bar Header */}
          <View style={styles.galleryTopHeader}>
            <Text style={styles.galleryCounterText}>
              {fullscreenIndex !== null ? `${fullscreenIndex + 1} of ${totalCount}` : ''}
            </Text>
            <TouchableOpacity
              style={styles.galleryCloseBtn}
              onPress={() => setFullscreenIndex(null)}
            >
              <Text style={styles.galleryCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontally Scrollable Fullscreen Gallery */}
          {fullscreenIndex !== null && (
            <FlatList
              horizontal
              pagingEnabled
              data={urls}
              initialScrollIndex={fullscreenIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              keyExtractor={(_, i) => String(i)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={styles.fullscreenSlide}>
                  <Image source={{ uri: item }} style={styles.fullscreenImage} resizeMode="contain" />
                  <Text style={styles.slideCaption}>
                    Photo {index + 1} of {totalCount}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    marginVertical: 4,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  singleBox: {
    width: 240,
    height: 180,
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  row2Box: {
    flexDirection: 'row',
    width: 240,
    height: 140,
    gap: 2,
  },
  halfCell: {
    flex: 1,
    height: '100%',
  },
  row3Box: {
    flexDirection: 'row',
    width: 240,
    height: 150,
    gap: 2,
  },
  leftBigCell: {
    flex: 1,
    height: '100%',
  },
  rightColStack: {
    width: 118,
    height: '100%',
    gap: 2,
  },
  stackedCell: {
    flex: 1,
  },
  grid2x2Box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    height: 200,
    gap: 2,
  },
  gridCell: {
    width: 119,
    height: 99,
    position: 'relative',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  overlayMore: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMoreText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  overlayMoreSub: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  albumBadgeRow: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  albumBadgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
  },
  galleryModalBg: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  galleryTopHeader: {
    position: 'absolute',
    top: 45,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryCounterText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  galleryCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  galleryCloseText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  fullscreenSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  slideCaption: {
    position: 'absolute',
    bottom: 50,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
