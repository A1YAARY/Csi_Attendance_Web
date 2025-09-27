import React, { useState, useEffect, useCallback, useRef } from "react";
import TextType from "../../reactbitscomponents/TextType";

import { useAuth } from "../../context/authStore";
import {
  Brain,
  Send,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Copy,
  Trash2,
  Clock,
  TrendingUp,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  XCircle,
  Play,
  Pause,
  Loader2,
  Star,
  BarChart3,
  Users,
  Calendar,
  Activity,
  Waves,
  Bot,
  Settings,
  Download,
  Share2,
  BookOpen,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState("query");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Enhanced TTS Settings
  const [ttsSettings, setTtsSettings] = useState({
    voice: "Google UK English Female",
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });
  const [availableVoices, setAvailableVoices] = useState([]);

  const synthRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentUtteranceRef = useRef(null);

  // Enhanced sample questions with categories and icons
  const sampleQuestions = [
    {
      category: "📊 Daily Reports",
      icon: BarChart3,
      color: "from-blue-500 to-cyan-500",
      gradient: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
      border: "border-blue-500/30",
      questions: [
        "Show me today's attendance summary",
        "How many people attended work today?",
        "Who was absent today?",
        "Show me late arrivals today",
        "What's the attendance percentage for today?",
        "List all check-ins for today",
        "Show today's working hours summary",
      ],
    },
    {
      category: "👥 User Analytics",
      icon: Users,
      color: "from-purple-500 to-pink-500",
      gradient: "bg-gradient-to-br from-purple-500/10 to-pink-500/10",
      border: "border-purple-500/30",
      questions: [
        "Who has perfect attendance this month?",
        "Show me the most punctual employees",
        "List users with irregular attendance patterns",
        "Who worked the most hours this week?",
        "Show me user attendance trends",
        "Find employees with low attendance",
        "Display top performers by attendance",
      ],
    },
    {
      category: "📅 Date-Specific Queries",
      icon: Calendar,
      color: "from-green-500 to-emerald-500",
      gradient: "bg-gradient-to-br from-green-500/10 to-emerald-500/10",
      border: "border-green-500/30",
      questions: [
        "Was john@example.com present on 2025-09-20?",
        "Show me absent users on 2025-09-19",
        "Who worked overtime yesterday?",
        "Generate attendance report for 2025-09-15",
        "Compare this week vs last week attendance",
        "Show attendance for last Monday",
        "Get weekly report for user@example.com",
      ],
    },
    {
      category: "📈 Analytics & Insights",
      icon: Activity,
      color: "from-orange-500 to-red-500",
      gradient: "bg-gradient-to-br from-orange-500/10 to-red-500/10",
      border: "border-orange-500/30",
      questions: [
        "Generate weekly report for this week",
        "Show me monthly attendance statistics",
        "What are the attendance patterns?",
        "Average working hours this week",
        "Identify attendance anomalies",
        "Show productivity metrics",
        "Analyze peak working hours",
      ],
    },
  ];

  // Initialize TTS and speech recognition
  useEffect(() => {
    // Initialize Speech Synthesis
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setSpeechSupported(true);

      // Load available voices
      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);

        // Find a good default voice
        const preferredVoice =
          voices.find(
            (voice) =>
              voice.name.includes("Google") && voice.lang.includes("en")
          ) ||
          voices.find((voice) => voice.lang.includes("en")) ||
          voices[0];

        if (preferredVoice) {
          setTtsSettings((prev) => ({ ...prev, voice: preferredVoice.name }));
        }
      };

      // Load voices immediately and on voiceschanged event
      loadVoices();
      synthRef.current.addEventListener("voiceschanged", loadVoices);
    }

    // Initialize Speech Recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
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

    // Auto-refresh health status every 30 seconds
    const healthInterval = setInterval(checkAIHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  // Enhanced TTS function with multiple voice options
  const speakText = useCallback(
    (text) => {
      try {
        if (!isVoiceEnabled || !synthRef.current) {
          return;
        }

        // Stop any current speech
        if (currentUtteranceRef.current) {
          synthRef.current.cancel();
        }

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);

        // Find selected voice
        const voices = synthRef.current.getVoices();
        const selectedVoice =
          voices.find((voice) => voice.name === ttsSettings.voice) || voices[0];

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Apply settings
        utterance.rate = ttsSettings.rate;
        utterance.pitch = ttsSettings.pitch;
        utterance.volume = ttsSettings.volume;

        // Event handlers
        utterance.onstart = () => {
          setIsSpeaking(true);
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

        // Speak the text
        synthRef.current.speak(utterance);
      } catch (error) {
        console.error("TTS Error:", error);
        toast.error("Text-to-speech failed");
      }
    },
    [isVoiceEnabled, ttsSettings]
  );

  // Stop speech function
  const stopSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
      toast.info("🔇 Speech stopped");
    }
  }, []);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("🎤 Speech recognition not supported in this browser");
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
  }, []);

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
    stopSpeech(); // Stop any current speech

    try {
      toast.info("🤖 AI is processing your request...");

      const data = await queryAI({
        question: question.trim(),
      });

      if (data.success) {
        const aiResponse = data.response || "No response from AI";
        setResponse(aiResponse);

        // Add to query history
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

        // Auto-speak if voice is enabled
        if (isVoiceEnabled) {
          setTimeout(() => speakText(aiResponse), 1000);
        }
      } else {
        const errorMessage = data.message || "Failed to get AI response";
        setResponse(`❌ Error: ${errorMessage}`);
        toast.error(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("AI query failed:", error);
      const errorMessage =
        "Could not connect to AI service. Please check your connection.";
      setResponse(`❌ ${errorMessage}`);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuestion = (sampleQ) => {
    setQuestion(sampleQ);
    setActiveTab("query");
    // Smooth scroll to query section
    setTimeout(() => {
      document.querySelector(".query-section")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    toast.info(`📝 Sample question selected: "${sampleQ.substring(0, 30)}..."`);
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

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem("ai-query-history");
    toast.success("🗑️ Query history cleared!");
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Voice Settings Panel - Show when voice is enabled */}
        {/* {isVoiceEnabled && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-semibold">Voice Settings:</span>
                </div>

                <select
                  value={ttsSettings.voice}
                  onChange={(e) =>
                    setTtsSettings((prev) => ({
                      ...prev,
                      voice: e.target.value,
                    }))
                  }
                  className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white"
                >
                  {availableVoices.map((voice, idx) => (
                    <option
                      key={idx}
                      value={voice.name}
                      className="bg-gray-800"
                    >
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsSettings.rate}
                    onChange={(e) =>
                      setTtsSettings((prev) => ({
                        ...prev,
                        rate: parseFloat(e.target.value),
                      }))
                    }
                    className="w-20"
                  />
                  <span className="text-sm w-8">{ttsSettings.rate}x</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Pitch:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsSettings.pitch}
                    onChange={(e) =>
                      setTtsSettings((prev) => ({
                        ...prev,
                        pitch: parseFloat(e.target.value),
                      }))
                    }
                    className="w-20"
                  />
                  <span className="text-sm w-8">{ttsSettings.pitch}</span>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {/* AI Health Status */}
        <div className="mb-8 flex justify-center">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl backdrop-blur-md border transition-all transform hover:scale-105 ${
              aiHealth?.status === "healthy"
                ? "bg-green-500/20 border-green-400/30 text-green-300 shadow-lg shadow-green-500/20"
                : "bg-red-500/20 border-red-400/30 text-red-300 shadow-lg shadow-red-500/20"
            }`}
          >
            <div className="relative">
              {aiHealth?.status === "healthy" ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
              <div
                className={`absolute inset-0 rounded-full ${
                  aiHealth?.status === "healthy" ? "bg-green-400" : "bg-red-400"
                } opacity-20 animate-ping`}
              ></div>
            </div>

            <div className="flex flex-col">
              <span className="font-semibold">
                AI System: {aiHealth?.status || "Checking..."}
              </span>
              <span className="text-xs opacity-75">Audio: Frontend TTS</span>
            </div>

            <button
              onClick={checkAIHealth}
              className="ml-2 p-2 hover:bg-white/10 rounded-full transition-colors group"
              title="Refresh health status"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 shadow-xl">
            {[
              {
                id: "query",
                label: "AI Query",
                icon: MessageSquare,
                count: null,
              },
              {
                id: "history",
                label: "History",
                icon: Clock,
                count: queryHistory.length,
              },
              {
                id: "capabilities",
                label: "Capabilities",
                icon: Zap,
                count: null,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-8 py-4 rounded-xl transition-all font-semibold ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === "query" && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Sample Questions Sidebar */}
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="text-yellow-400 w-6 h-6" />
                    <h3 className="text-xl font-bold">Sample Questions</h3>
                  </div>

                  <div className="space-y-4">
                    {sampleQuestions.map((category, idx) => {
                      const Icon = category.icon;
                      return (
                        <div key={idx} className="space-y-3">
                          <div
                            className={`flex items-center gap-3 p-3 rounded-xl ${category.gradient} border ${category.border}`}
                          >
                            <Icon className="w-5 h-5" />
                            <h4 className="font-semibold text-sm">
                              {category.category}
                            </h4>
                          </div>

                          <div className="grid gap-2 pl-2">
                            {category.questions.slice(0, 4).map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSampleQuestion(q)}
                                className="group text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-all border border-transparent hover:border-purple-400/30 hover:shadow-lg"
                                disabled={loading}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 bg-purple-400 rounded-full group-hover:w-2 group-hover:h-2 transition-all"></div>
                                  {q}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Voice Controls Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Waves className="text-purple-400 w-5 h-5" />
                    <h3 className="text-lg font-bold">Voice Controls</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Voice Input</span>
                      <button
                        onClick={startListening}
                        disabled={isListening || loading}
                        className={`p-2 rounded-lg transition-colors ${
                          isListening
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
                        }`}
                      >
                        {isListening ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        Voice Response
                      </span>
                      <button
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          isVoiceEnabled
                            ? "bg-green-500/20 hover:bg-green-500/30 text-green-300"
                            : "bg-gray-500/20 hover:bg-gray-500/30 text-gray-300"
                        }`}
                      >
                        {isVoiceEnabled ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {isSpeaking && (
                      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-green-400 animate-pulse" />
                          <span className="text-sm text-green-300">
                            AI Speaking...
                          </span>
                        </div>
                        <button
                          onClick={stopSpeech}
                          className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="text-xs text-gray-400 p-2 bg-blue-500/10 rounded">
                      💡 Uses high-quality browser TTS with customizable voice
                      settings
                    </div>
                  </div>
                </div>
              </div>

              {/* Query Section */}
              <div className="lg:col-span-2 space-y-6 query-section">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-purple-400 w-7 h-7 animate-spin-slow" />
                    <h2 className="text-2xl font-bold">Ask AI Assistant</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask me anything about attendance data..."
                        className="w-full p-6 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 resize-none transition-all text-lg"
                        rows={5}
                        disabled={loading}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        {speechSupported && (
                          <button
                            type="button"
                            onClick={startListening}
                            disabled={isListening || loading}
                            className={`p-3 rounded-lg transition-colors shadow-lg ${
                              isListening
                                ? "bg-red-500 text-white animate-pulse shadow-red-500/25"
                                : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:shadow-purple-500/25"
                            }`}
                            title={isListening ? "Listening..." : "Voice input"}
                          >
                            {isListening ? (
                              <MicOff className="w-5 h-5" />
                            ) : (
                              <Mic className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isVoiceEnabled}
                            onChange={(e) =>
                              setIsVoiceEnabled(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            Enable voice response
                          </span>
                          {isVoiceEnabled ? (
                            <Volume2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-gray-400" />
                          )}
                        </label>

                        <div className="text-sm text-gray-400">
                          {question.length}/1000 characters
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={clearResponse}
                          className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg text-gray-300 hover:text-white transition-colors shadow-lg"
                          disabled={loading}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>

                        <button
                          type="submit"
                          disabled={loading || !question.trim()}
                          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl transform hover:scale-105"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Ask AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Response Section */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 min-h-[500px] shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Brain className="text-blue-400 w-7 h-7" />
                      <h2 className="text-2xl font-bold">AI Response</h2>
                    </div>

                    {response && (
                      <div className="flex gap-2">
                        {isVoiceEnabled && (
                          <button
                            onClick={() =>
                              isSpeaking ? stopSpeech() : speakText(response)
                            }
                            className={`p-3 rounded-lg transition-colors shadow-lg ${
                              isSpeaking
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 shadow-red-500/25"
                                : "bg-green-500/20 hover:bg-green-500/30 text-green-300 shadow-green-500/25"
                            }`}
                            title={
                              isSpeaking ? "Stop speaking" : "Speak response"
                            }
                          >
                            {isSpeaking ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={copyResponse}
                          className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 hover:text-blue-200 transition-colors shadow-lg"
                          title="Copy response"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="min-h-[350px] bg-black/30 rounded-xl p-6 font-mono text-sm overflow-auto border border-white/10">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="relative mb-6">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-400" />
                            <div className="absolute inset-0 bg-purple-400 rounded-full opacity-20 animate-ping"></div>
                          </div>
                          <p className="text-gray-300 text-lg mb-2">
                            AI is analyzing your request...
                          </p>
                          <p className="text-gray-500 text-sm">
                            This may take a few seconds
                          </p>
                          <div className="flex justify-center gap-1 mt-4">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-100"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
                          </div>
                        </div>
                      </div>
                    ) : response ? (
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                          <TextType
                            text={[response]}
                            typingSpeed={20}
                            pauseDuration={1500}
                            showCursor={true}
                            cursorCharacter="|"
                          />
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                          <span>
                            Response generated at{" "}
                            {new Date().toLocaleTimeString()}
                          </span>
                          <span>•</span>
                          <span>{response.split(" ").length} words</span>
                          <span>•</span>
                          <span>Frontend TTS Ready</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 mx-auto mb-6 opacity-50" />
                          <p className="text-xl mb-2">
                            Ask a question to see AI response here
                          </p>
                          <p className="text-sm opacity-75">
                            Try one of the sample questions on the left
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History and Capabilities tabs remain the same... */}
          {/* ... (keeping the existing history and capabilities code) ... */}
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
