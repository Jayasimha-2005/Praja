import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/voice-assistant.css';

interface Message {
  text: string;
  type: 'user' | 'ai';
}

interface VoiceAssistantProps {
  onReset?: () => void;
  resetCounter?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
};

const API_BASE = ((import.meta as any).env?.VITE_API_BASE || '').replace(/\/$/, '');
const withApiBase = (path: string) => `${API_BASE}${path}`;

export default function VoiceAssistant({ resetCounter = 0 }: VoiceAssistantProps) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [placeholder, setPlaceholder] = useState('');

  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const lastSentTranscriptRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isAISpeakingRef = useRef(false);
  const conversationModeRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // Store conversation history globally for PDF generation
  useEffect(() => {
    (window as any).conversationHistory = conversationHistory;
  }, [conversationHistory]);

  // Initialize/Reset messages
  useEffect(() => {
    setMessages([
      {
        text: t('complaint.initial.msg'),
        type: 'ai',
      },
    ]);
  }, [language, resetCounter, t]);

  // Update placeholder based on language/state
  useEffect(() => {
    if (!isListening && !isProcessing) {
      setPlaceholder(t('complaint.input.placeholder'));
    }
  }, [language, isListening, isProcessing, t]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_MAP[language] || 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setPlaceholder('🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      if (!event.results[0].isFinal) {
        setPlaceholder(`Hearing: "${transcript}"`);
        return;
      }

      const finalText = transcript.trim();
      if (finalText.length < 3) return;

      // Ignore if we've already queued or sent this exact transcript
      if (lastSentTranscriptRef.current && lastSentTranscriptRef.current === finalText) {
        return;
      }

      if (isAISpeakingRef.current) {
        stopAISpeech();
      }

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      setPlaceholder(`Got: "${finalText}" - waiting 4s for more...`);

      speechTimeoutRef.current = window.setTimeout(() => {
        // mark as sent to prevent duplicates
        lastSentTranscriptRef.current = finalText.trim();
        handleUserSpeech(finalText.trim());
        speechTimeoutRef.current = null;
      }, 4000);
    };

    recognition.onerror = (event: any) => {
      console.error('Recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!conversationModeRef.current) {
        setIsListening(false);
      } else {
        // don't restart if we're waiting for processing
        if (!isProcessing) {
          try { recognition.start(); } catch (e) {}
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  const stopAISpeech = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isAISpeakingRef.current = false;
  };

  const restartListening = () => {
    if (conversationModeRef.current && recognitionRef.current) {
      setTimeout(() => {
        try { recognitionRef.current.start(); } catch (e) {}
      }, 1500);
    }
  };

  const handleUserSpeech = async (text: string) => {
    setMessages((prev) => [...prev, { text, type: 'user' }]);
    setIsProcessing(true);
    setPlaceholder('Processing...');

    try {
      const response = await fetch(withApiBase('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: LANGUAGE_MAP[language],
          history: conversationHistory,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { text: data.response, type: 'ai' }]);

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: data.response }] },
      ]);

      // Play audio if available
      if (data.audio) {
        playAudio(data.audio);
      } else {
        restartListening();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, { text: 'Sorry, I encountered an error. Please try again.', type: 'ai' }]);
      restartListening();
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (base64Audio: string) => {
    stopAISpeech();
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    currentAudioRef.current = audio;
    isAISpeakingRef.current = true;
    
    audio.onended = () => {
      isAISpeakingRef.current = false;
      restartListening();
    };
    
    audio.play();
  };

  const toggleConversation = () => {
    if (conversationMode) {
      setConversationMode(false);
      conversationModeRef.current = false;
      recognitionRef.current?.stop();
    } else {
      setConversationMode(true);
      conversationModeRef.current = true;
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  };

  const sendTextMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const input = f.elements.namedItem('textInput') as HTMLInputElement;
    const t = input.value.trim();
    if (t) {
      handleUserSpeech(t);
      input.value = '';
    }
  };

  return (
    <div className="voice-assistant-container">
      <div className="chat-box">
        <div className="chat-messages" ref={chatContainerRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="message ai">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <form onSubmit={sendTextMessage} className="text-input-wrapper">
            <input
              type="text"
              name="textInput"
              placeholder={placeholder}
              className="text-input"
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={toggleConversation}
              className={`mic-button-right ${isListening ? 'active' : ''}`}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
            <button type="submit" className="send-button" disabled={isProcessing}>
              {t('complaint.input.send')}
            </button>
          </form>
        </div>

        <div className="chat-footer">
          {t('complaint.footer.hint')}
          <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
            {t('complaint.footer.powered')}
          </div>
        </div>
      </div>
    </div>
  );
}
