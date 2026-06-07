import { describe, it, expect } from 'vitest';
import { createSpeechRecognition } from './speech';

describe('Speech Recognition Service', () => {
  it('should return null if SpeechRecognition is not supported', () => {
    const original = window.SpeechRecognition;
    const originalWebkit = window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    const recognizer = createSpeechRecognition(() => {}, () => {}, () => {});
    expect(recognizer).toBeNull();
    
    window.SpeechRecognition = original;
    window.webkitSpeechRecognition = originalWebkit;
  });

  it('should create and return a valid recognizer interface if supported', () => {
    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = false;
      }
      start() {}
      stop() {}
    }
    
    const original = window.SpeechRecognition;
    window.SpeechRecognition = MockSpeechRecognition;

    const recognizer = createSpeechRecognition(() => {}, () => {}, () => {});
    expect(recognizer).not.toBeNull();
    expect(typeof recognizer.start).toBe('function');
    expect(typeof recognizer.stop).toBe('function');
    
    window.SpeechRecognition = original;
  });
});
