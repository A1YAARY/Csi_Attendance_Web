import React, { useState, useEffect, useCallback, useRef } from "react";
import TextType from "../../reactbitscomponents/TextType";
import { useAuth } from "../../context/authStore";
import {
  Brain, Send, MessageSquare, Zap, AlertCircle, CheckCircle, RefreshCw, Copy, Trash2,
  Clock, TrendingUp, Volume2, VolumeX, Mic, MicOff, Sparkles, XCircle, Play, Pause,
  Loader2, Star, BarChart3, Users, Calendar, Activity, Waves, Bot, Settings, Download,
  Share2, BookOpen, HelpCircle,
} from "lucide-react";
import { toast } from "react-toastify";

const AITestPage = () => {
  const { queryAI, getAIHealth, getAICapabilities, user } = useAuth();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiCapabilities, setAiCapabilities] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // TTS Settings - Enhanced with multiple options
  const [ttsSettings, setTtsSettings] = useState({
    voice: "Google UK English Female", // Default voice
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    useOpenAI: false, // Toggle between browser and OpenAI TTS
  });
  
  const [availableVoices, setAvailableVoices] = useState([]);
  const synthRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize TTS and speech recognition
  useEffect(() => {
    // Initialize Speech Synthesis
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setSpeechSupported(true);

      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);

        // Find the best default voice
        const preferredVoices = [
          "Google UK English Female",
          "Google US English Female", 
          "Microsoft Zira - English (United States)",
          "Alex",
          "Samantha"
        ];

        let selectedVoice = voices.find(voice => 
          preferredVoices.some(preferred => voice.name.includes(preferred))
        );

        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang.includes("en") && voice.name.toLowerCase().includes("female")
          );
        }

        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.includes("en"));
        }

        if (selectedVoice) {
          setTtsSettings(prev => ({ ...prev, voice: selectedVoice.name }));
        }
      };

      loadVoices();
      synthRef.current.addEventListener("voiceschanged", loadVoices);
    }

    // Initialize Speech Recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        toast.success(`🎤 Voice captured: "${transcript}"`);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast.error("Speech recognition failed. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    fetchAICapabilities();
    checkAIHealth();
    loadQueryHistory();

    const healthInterval = setInterval(checkAIHealth, 30000);
    return () => {
      clearInterval(healthInterval);
      if (synthRef.current) {
        synthRef.current.removeEventListener("voiceschanged", () => {});
      }
    };
  }, []);

  // Enhanced TTS function with multiple options
  const speakText = useCallback(async (text) => {
    if (!text || isSpeaking) return;
    
    setIsSpeaking(true);

    if (ttsSettings.useOpenAI) {
      // OpenAI TTS (if user wants premium quality)
      await speakWithOpenAI(text);
    } else {
      // Browser TTS (default, more reliable)
      speakWithBrowser(text);
    }
  }, [isSpeaking, ttsSettings]);

  // Browser TTS (Primary method)
  const speakWithBrowser = useCallback((text) => {
    try {
      if (!synthRef.current) {
        toast.error("Speech synthesis not supported");
        setIsSpeaking(false);
        return;
      }

      // Stop any current speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const selectedVoice = voices.find(voice => voice.name === ttsSettings.voice);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = ttsSettings.rate;
      utterance.pitch = ttsSettings.pitch;
      utterance.volume = ttsSettings.volume;

      utterance.onstart = () => {
        currentUtteranceRef.current = utterance;
        toast.success("🔊 AI is speaking...");
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        toast.info("🔇 Speech completed");
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        toast.error("Speech synthesis failed");
      };

      synthRef.current.speak(utterance);
    } catch (error) {
      console.error("Browser TTS Error:", error);
      setIsSpeaking(false);
      toast.error("Text-to-speech failed");
    }
  }, [ttsSettings]);

  // OpenAI TTS (Premium option)
  const speakWithOpenAI = useCallback(async (text) => {
    try {
      toast.info("🎙️ Generating premium AI voice...");

      // Call your backend to generate OpenAI TTS
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice: 'nova', // or alloy, echo, fable, onyx, shimmer
          speed: ttsSettings.rate 
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.volume = ttsSettings.volume;
      audio.onloadeddata = () => toast.success("🔊 AI is speaking...");
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast.info("🔇 Speech completed");
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast.error("Audio playback failed, using browser TTS");
        speakWithBrowser(text); // Fallback
      };

      await audio.play();
    } catch (error) {
      console.error("OpenAI TTS Error:", error);
      toast.info("Using browser TTS instead");
      speakWithBrowser(text); // Fallback
    }
  }, [ttsSettings, speakWithBrowser]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current = null;
    }
    
    setIsSpeaking(false);
    toast.info("Speech stopped by user.");
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("🎤 Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    setIsListening(true);
    try {
      recognitionRef.current.start();
      toast.info("🎤 Listening... Speak now!");
    } catch (error) {
      console.error("Speech recognition start error:", error);
      setIsListening(false);
      toast.error("🎤 Could not start speech recognition");
    }
  }, [isListening]);

  const fetchAICapabilities = useCallback(async () => {
    try {
      const data = await getAICapabilities();
      if (data.success) {
        setAiCapabilities(data.capabilities);
      }
    } catch (error) {
      console.error("Failed to fetch AI capabilities:", error);
    }
  }, [getAICapabilities]);

  const checkAIHealth = useCallback(async () => {
    try {
      const data = await getAIHealth();
      if (data.success) {
        setAiHealth(data.health);
      } else {
        setAiHealth({ status: "unhealthy", error: data.message });
      }
    } catch (error) {
      setAiHealth({ status: "unhealthy", error: error.message });
    }
  }, [getAIHealth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("📝 Please enter a question");
      return;
    }

    setLoading(true);
    setResponse("");
    stopSpeech();

    try {
      toast.info("🤖 AI is processing your request...");
      const data = await queryAI({ question: question.trim() });

      if (data.success) {
        const aiResponse = data.response || "No response from AI";
        setResponse(aiResponse);

        const historyItem = {
          id: Date.now(),
          question: question.trim(),
          response: aiResponse,
          timestamp: new Date().toISOString(),
          user: user?.email || "Unknown",
        };

        const newHistory = [historyItem, ...queryHistory.slice(0, 9)];
        setQueryHistory(newHistory);
        saveQueryHistory(newHistory);

        toast.success("✅ AI response received!");

        // Auto-speak response if voice is enabled
        if (isVoiceEnabled) {
          setTimeout(() => speakText(aiResponse), 500);
        }
      } else {
        const errorMessage = data.message || "Failed to get AI response";
        setResponse(`❌ Error: ${errorMessage}`);
        toast.error(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("AI query failed:", error);
      const errorMessage = "Could not connect to AI service. Please check your connection.";
      setResponse(`❌ ${errorMessage}`);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveQueryHistory = (history) => {
    try {
      localStorage.setItem("ai-query-history", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save query history:", error);
    }
  };

  const loadQueryHistory = () => {
    try {
      const saved = localStorage.getItem("ai-query-history");
      if (saved) {
        setQueryHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load query history:", error);
    }
  };

  const clearResponse = () => {
    setResponse("");
    setQuestion("");
    stopSpeech();
    toast.info("🗑️ Cleared response");
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      toast.success("📋 Response copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            <TextType
              text="AI Testing Dashboard"
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Advanced AI Query Interface with Voice Integration
          </p>
        </div>

        {/* AI Health Status */}
        <div className="mb-6 flex justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            aiHealth?.status === 'healthy' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
            {aiHealth?.status === 'healthy' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            AI Status: {aiHealth?.status || 'Unknown'} • Model: {aiHealth?.model || 'Groq'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Voice Settings Panel */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Voice Settings</h3>
                </div>
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isVoiceEnabled 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              </div>

              {isVoiceEnabled && (
                <div className="space-y-4">
                  {/* TTS Method Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Voice Quality
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTtsSettings(prev => ({ ...prev, useOpenAI: false }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${
                          !ttsSettings.useOpenAI
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        Browser (Fast)
                      </button>
                      <button
                        onClick={() => setTtsSettings(prev => ({ ...prev, useOpenAI: true }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${
                          ttsSettings.useOpenAI
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        AI (Premium)
                      </button>
                    </div>
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Voice
                    </label>
                    <select
                      value={ttsSettings.voice}
                      onChange={(e) => setTtsSettings(prev => ({ ...prev, voice: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speed Control */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Speed: {ttsSettings.rate}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={ttsSettings.rate}
                      onChange={(e) => setTtsSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Volume Control */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Volume: {Math.round(ttsSettings.volume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={ttsSettings.volume}
                      onChange={(e) => setTtsSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Test Voice Button */}
                  <button
                    onClick={() => speakText("Hello! This is how your AI assistant sounds.")}
                    disabled={isSpeaking}
                    className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 transition-colors duration-200 disabled:opacity-50"
                  >
                    {isSpeaking ? "Speaking..." : "Test Voice"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Query Interface */}
          <div className="lg:col-span-8 space-y-6">
            {/* Query Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI Query Interface
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask anything about your attendance data..."
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows="4"
                    disabled={loading}
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startListening}
                      disabled={loading || !speechSupported}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isListening
                          ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 animate-pulse'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
                      } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Ask AI
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={clearResponse}
                    className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Response Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    AI Response
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {response && isVoiceEnabled && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(response)}
                        disabled={isSpeaking}
                        className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200"
                        title="Speak Response"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      {isSpeaking && (
                        <button
                          onClick={stopSpeech}
                          className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200"
                          title="Stop Speech"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {response && (
                    <button
                      onClick={copyResponse}
                      className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200"
                      title="Copy Response"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                      Groq AI is analyzing your request...
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Using advanced analytics
                    </p>
                  </div>
                ) : response ? (
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 whitespace-pre-wrap">
                      {response}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Ask a question to see AI response here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Speech Status */}
              {isSpeaking && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <Waves className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    AI is speaking...
                  </span>
                  <button
                    onClick={stopSpeech}
                    className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
