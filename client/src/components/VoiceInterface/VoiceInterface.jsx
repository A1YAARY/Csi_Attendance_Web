import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Play, Pause } from 'lucide-react';
import './VoiceInterface.css';

const VoiceInterface = ({ organizationId, userId, onDataReceived }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Voice backend URL
  const VOICE_API_URL = 'http://localhost:8001';

  useEffect(() => {
    checkConnectionStatus();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${VOICE_API_URL}/health`);
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const startListening = async () => {
    try {
      setError('');
      setTranscript('');
      setResponse('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const response = await fetch(`${VOICE_API_URL}/voice/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: base64Audio,
          user_id: userId,
          organization_id: organizationId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setTranscript(data.text_response || '');
      setResponse(data.text_response || '');
      
      if (data.audio_response) {
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audio_response), c => c.charCodeAt(0))
        ], { type: 'audio/wav' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        
        // Auto-play the response
        playAudio(audioUrl);
      }
      
      if (data.data && onDataReceived) {
        onDataReceived(data.data);
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setError('Failed to process voice command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (url) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const sendTextQuery = async (text) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch(`${VOICE_API_URL}/text/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          user_id: userId,
          organization_id: organizationId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResponse(data.text_response || '');
      
      if (data.audio_response) {
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audio_response), c => c.charCodeAt(0))
        ], { type: 'audio/wav' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
      }
      
      if (data.data && onDataReceived) {
        onDataReceived(data.data);
      }
      
    } catch (error) {
      console.error('Error processing text query:', error);
      setError('Failed to process query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#34D399';
      case 'error': return '#F87171';
      default: return '#9CA3AF';
    }
  };

  return (
    <div className="voice-interface">
      <div className="voice-container">
        {/* Connection Status */}
        <div className="connection-status">
          <div 
            className="status-indicator" 
            style={{ backgroundColor: getConnectionStatusColor() }}
          />
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'error' ? 'Connection Error' : 'Connecting...'}
          </span>
        </div>

        {/* Main Voice Interface */}
        <div className="voice-main">
          <div className="voice-controls">
            <button
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || connectionStatus !== 'connected'}
            >
              {isProcessing ? (
                <Loader2 className="voice-icon spinning" />
              ) : isListening ? (
                <MicOff className="voice-icon" />
              ) : (
                <Mic className="voice-icon" />
              )}
            </button>
            
            <div className="voice-label">
              {isListening ? 'Listening...' : 
               isProcessing ? 'Processing...' : 
               'Tap to speak'}
            </div>
          </div>

          {/* Audio Controls */}
          {audioUrl && (
            <div className="audio-controls">
              <button
                className="audio-button"
                onClick={isPlaying ? stopAudio : () => playAudio(audioUrl)}
              >
                {isPlaying ? (
                  <Pause className="audio-icon" />
                ) : (
                  <Play className="audio-icon" />
                )}
              </button>
              <span className="audio-label">
                {isPlaying ? 'Playing response...' : 'Replay response'}
              </span>
            </div>
          )}
        </div>

        {/* Response Display */}
        {(response || error) && (
          <div className="response-container">
            <div className="response-header">
              <Volume2 className="response-icon" />
              <span>AI Response</span>
            </div>
            <div className={`response-content ${error ? 'error' : ''}`}>
              {error || response}
            </div>
          </div>
        )}

        {/* Quick Text Input */}
        <div className="text-input-container">
          <input
            type="text"
            placeholder="Or type your question here..."
            className="text-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendTextQuery(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceInterface;
