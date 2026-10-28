import type { Audio as ExpoAudioType } from 'expo-av';

let ExpoAVAudio: typeof ExpoAudioType | null = null;
let isNativeAudioAvailable = false;

try {
  // Dynamically require expo-av inside try/catch so missing ExponentAV native module
  // in Expo Go does NOT crash the application on launch.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const avModule = require('expo-av');
  if (avModule && avModule.Audio) {
    ExpoAVAudio = avModule.Audio;
    isNativeAudioAvailable = true;
  }
} catch (err) {
  // ExponentAV native module is missing (e.g. running in standard Expo Go)
  isNativeAudioAvailable = false;
  if (__DEV__) {
    console.log('[SafeAudio] Running in Expo Go (native ExponentAV not present). Safe mock audio fallback active.');
  }
}

class MockSound {
  async playAsync() {}
  async stopAsync() {}
  async unloadAsync() {}
  async pauseAsync() {}
  setOnPlaybackStatusUpdate(_callback: any) {}
}

export const SafeAudio = {
  get isAvailable(): boolean {
    return isNativeAudioAvailable && ExpoAVAudio !== null;
  },

  async requestPermissionsAsync() {
    if (this.isAvailable && ExpoAVAudio) {
      return ExpoAVAudio.requestPermissionsAsync();
    }
    return {
      status: 'denied' as const,
      canAskAgain: false,
      granted: false,
      expires: 'never' as const,
    };
  },

  async setAudioModeAsync(options: Parameters<typeof ExpoAudioType.setAudioModeAsync>[0]) {
    if (this.isAvailable && ExpoAVAudio) {
      return ExpoAVAudio.setAudioModeAsync(options);
    }
    return Promise.resolve();
  },

  Recording: {
    async createAsync(options?: any) {
      if (SafeAudio.isAvailable && ExpoAVAudio?.Recording) {
        return ExpoAVAudio.Recording.createAsync(options);
      }
      throw new Error(
        'Voice recording is not available in Expo Go. The native ExponentAV module requires a development build (npx expo run:android).'
      );
    },
  },

  Sound: {
    async createAsync(source: any, initialStatus?: any, onPlaybackStatusUpdate?: any) {
      if (SafeAudio.isAvailable && ExpoAVAudio?.Sound) {
        return ExpoAVAudio.Sound.createAsync(source, initialStatus, onPlaybackStatusUpdate);
      }
      return {
        sound: new MockSound() as unknown as ExpoAudioType.Sound,
        status: { isLoaded: false } as any,
      };
    },
  },

  RecordingOptionsPresets: {
    HIGH_QUALITY: (ExpoAVAudio as any)?.RecordingOptionsPresets?.HIGH_QUALITY || {},
    LOW_QUALITY: (ExpoAVAudio as any)?.RecordingOptionsPresets?.LOW_QUALITY || {},
  },
};

// Merged namespace & const for seamless TypeScript type and runtime compatibility
export namespace SafeAudio {
  export type Sound = ExpoAudioType.Sound;
  export type Recording = ExpoAudioType.Recording;
}

export { SafeAudio as Audio };
