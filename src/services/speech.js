export const createSpeechRecognition = (onResult, onError, onEnd) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error("Speech Recognition API not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true; // Provides rapid feedback
  recognition.lang = 'en-US';

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    onResult(finalTranscript, interimTranscript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd(finalTranscript.trim());
    finalTranscript = ''; // Reset after end
  };

  return {
    start: () => {
      finalTranscript = '';
      try {
        recognition.start();
      } catch (e) {
        // Can throw if already started
        console.warn(e);
      }
    },
    stop: () => {
      recognition.stop();
    }
  };
};
