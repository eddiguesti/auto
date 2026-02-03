import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

interface RecordingState {
  isRecording: boolean;
  duration: number; // in seconds
  audioUri: string | null;
  error: string | null;
  audioLevel: number; // 0-1 normalized audio level for visualization
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    audioUri: null,
    error: null,
    audioLevel: 0,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request permissions
  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState(s => ({ ...s, error: 'Microphone permission denied' }));
        return false;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording with metering enabled for audio visualization
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      recordingRef.current = recording;

      // Set up metering callback for audio level visualization
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          // Metering is in dB, typically -160 to 0
          // Convert to 0-1 range for visualization
          // -60dB and below = 0, 0dB = 1
          const db = status.metering;
          const minDb = -60;
          const maxDb = 0;
          const normalized = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
          setState(s => ({ ...s, audioLevel: normalized }));
        }
      });

      // Start duration timer
      setState(s => ({ ...s, isRecording: true, duration: 0, audioLevel: 0, error: null }));

      durationIntervalRef.current = setInterval(() => {
        setState(s => ({ ...s, duration: s.duration + 1 }));
      }, 1000);

      return true;
    } catch (error) {
      console.error('Start recording error:', error);
      setState(s => ({ ...s, error: 'Failed to start recording' }));
      return false;
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState(s => ({
        ...s,
        isRecording: false,
        audioUri: uri,
        audioLevel: 0,
      }));

      return uri;
    } catch (error) {
      console.error('Stop recording error:', error);
      setState(s => ({ ...s, error: 'Failed to stop recording', isRecording: false }));
      return null;
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState({
        isRecording: false,
        duration: 0,
        audioUri: null,
        error: null,
        audioLevel: 0,
      });
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isRecording: false,
      duration: 0,
      audioUri: null,
      error: null,
      audioLevel: 0,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
