import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
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
  XCircle, // ← Added this missing icon
} from "lucide-react";
import { toast } from "react-toastify";

const AITestPage = () => {
  const { BASE_URL, getAuthHeaders, user } = useAuth();
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

  const synthRef = useRef(null);
  const recognitionRef = useRef(null);
  const responseRef = useRef("");

  // Enhanced sample questions with categories
  const sampleQuestions = [
    {
      category: "📊 Daily Reports",
      questions: [
        "Show me today's attendance summary",
        "How many people attended work today?",
        "Who was absent today?",
        "Show me late arrivals today",
      ],
    },
    {
      category: "📅 Date-Specific Queries",
      questions: [
        "Was john@example.com present on 2025-09-20?",
        "Show me absent users on 2025-09-19",
        "Who worked overtime yesterday?",
        "Generate attendance report for 2025-09-15",
      ],
    },
    {
      category: "📈 Weekly & Monthly",
      questions: [
        "Generate weekly report for this week",
        "Show me monthly attendance statistics",
        "Who has perfect attendance this month?",
        "Average working hours this week",
      ],
    },
    {
      category: "🔍 User Analytics",
      questions: [
        "Show attendance pattern for john@example.com",
        "Find users with low attendance",
        "Who are the most punctual employees?",
        "List users working more than 8 hours daily",
      ],
    },
  ];

  // Initialize speech synthesis and recognition
  useEffect(() => {
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setSpeechSupported(true);
    }

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
  }, []);

  // Update response ref when response changes
  useEffect(() => {
    responseRef.current = response;
  }, [response]);

  // Text-to-Speech function [web:76][web:79]
  const speakText = useCallback(
    (text) => {
      if (!speechSupported || !synthRef.current || !isVoiceEnabled) return;

      // Stop any ongoing speech
      synthRef.current.cancel();

      // Clean text for better speech
      const cleanText = text
        .replace(/❌|✅|📊|📅|📈|🔍|⚠️|👤|⏰/g, "") // Remove emojis
        .replace(/\n/g, " ") // Replace newlines with spaces
        .replace(/\s+/g, " ") // Normalize spaces
        .trim();

      if (cleanText.length === 0) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Voice settings for better experience
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Choose best available voice
      const voices = synthRef.current.getVoices();
      const preferredVoice =
        voices.find(
          (voice) => voice.name.includes("Google") && voice.lang.includes("en")
        ) ||
        voices.find((voice) => voice.lang.includes("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast.error("Voice synthesis failed");
      };

      synthRef.current.speak(utterance);
    },
    [speechSupported, isVoiceEnabled]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Speech recognition start error:", error);
      setIsListening(false);
      toast.error("Could not start speech recognition");
    }
  }, []);

  const fetchAICapabilities = useCallback(async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/ai-analytics/capabilities`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAiCapabilities(data);
      }
    } catch (error) {
      console.error("Failed to fetch AI capabilities:", error);
    }
  }, [BASE_URL, getAuthHeaders]);

  const checkAIHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/ai-analytics/health`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAiHealth(data);
      }
    } catch (error) {
      setAiHealth({ status: "unhealthy", error: error.message });
    }
  }, [BASE_URL, getAuthHeaders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setLoading(true);
    setResponse("");
    stopSpeaking();

    try {
      const response = await fetch(`${BASE_URL}/api/ai-analytics/query`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: question.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
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

        // Speak the response
        if (isVoiceEnabled && aiResponse) {
          setTimeout(() => speakText(aiResponse), 500);
        }

        toast.success("AI response received!");
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: Failed to get AI response`;
        setResponse(`❌ Error: ${errorMessage}`);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("AI query failed:", error);
      const errorMessage =
        "Could not connect to AI service. Please check your connection.";
      setResponse(`❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuestion = (sampleQ) => {
    setQuestion(sampleQ);
    setActiveTab("query");
  };

  const clearResponse = () => {
    setResponse("");
    setQuestion("");
    stopSpeaking();
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      toast.success("Response copied to clipboard!");
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
    toast.success("Query history cleared!");
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Responsive */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Analytics Assistant
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
            Test your AI-powered attendance analytics system with voice support
          </p>

          {/* AI Health Status */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {aiHealth?.status === "healthy" ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-xs sm:text-sm font-medium ${
                aiHealth?.status === "healthy"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              AI Status: {aiHealth?.status || "Checking..."}
            </span>
          </div>
        </div>

        {/* Tab Navigation - Mobile Friendly */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {[
            { id: "query", label: "Query AI", icon: MessageSquare },
            { id: "samples", label: "Examples", icon: Zap },
            { id: "history", label: "History", icon: Clock },
            { id: "capabilities", label: "Features", icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all touch-manipulation text-xs sm:text-sm font-medium ${
                activeTab === id
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-purple-50 border border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Query Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              {activeTab === "query" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Ask Your Question
                    </h2>

                    {/* Voice Controls */}
                    {speechSupported && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                          className={`p-2 rounded-lg transition-colors touch-manipulation ${
                            isVoiceEnabled
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                          title={
                            isVoiceEnabled ? "Voice enabled" : "Voice disabled"
                          }
                        >
                          {isVoiceEnabled ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={isSpeaking ? stopSpeaking : startListening}
                          disabled={loading}
                          className={`p-2 rounded-lg transition-colors touch-manipulation ${
                            isListening
                              ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                              : isSpeaking
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                          }`}
                          title={
                            isListening
                              ? "Listening..."
                              : isSpeaking
                              ? "Speaking..."
                              : "Start voice input"
                          }
                        >
                          {isListening ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask about attendance, user presence, daily summaries, or any analytics question..."
                        rows={3}
                        className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                        disabled={loading}
                      />
                      {isListening && (
                        <div className="absolute inset-0 bg-red-50 bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-red-600">
                              Listening...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium touch-manipulation text-sm sm:text-base"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {loading ? "Processing..." : "Ask AI"}
                      </button>

                      <button
                        type="button"
                        onClick={clearResponse}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                      >
                        Clear
                      </button>
                    </div>
                  </form>

                  {/* Response Area */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                        AI Response
                      </h3>
                      {response && (
                        <div className="flex gap-2">
                          {speechSupported && isVoiceEnabled && (
                            <button
                              onClick={
                                isSpeaking
                                  ? stopSpeaking
                                  : () => speakText(response)
                              }
                              className={`p-2 rounded-lg transition-colors touch-manipulation ${
                                isSpeaking
                                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              }`}
                              title={
                                isSpeaking ? "Stop speaking" : "Read aloud"
                              }
                            >
                              {isSpeaking ? (
                                <VolumeX className="w-4 h-4" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={copyResponse}
                            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors touch-manipulation"
                            title="Copy response"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 min-h-[120px] max-h-[400px] overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-3 text-purple-600">
                            <Brain className="w-6 h-6 animate-pulse" />
                            <span className="text-sm sm:text-base">
                              AI is processing your query...
                            </span>
                          </div>
                        </div>
                      ) : response ? (
                        <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {response}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                          AI response will appear here after you submit a query.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Sample Questions */}
              {activeTab === "samples" && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center">
                    Click on any question to try it out
                  </h2>
                  {sampleQuestions.map((category, idx) => (
                    <div key={idx} className="space-y-3">
                      <h3 className="text-base sm:text-lg font-medium text-gray-700 border-b pb-2">
                        {category.category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {category.questions.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSampleQuestion(q)}
                            className="text-left p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-all border border-purple-200 hover:border-purple-300 touch-manipulation text-sm sm:text-base"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Query History */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Query History
                    </h2>
                    {queryHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear History
                      </button>
                    )}
                  </div>

                  {queryHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm sm:text-base">No queries yet</p>
                      <p className="text-xs sm:text-sm">
                        Your AI queries will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {queryHistory.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="font-medium text-gray-800 text-sm sm:text-base flex-1">
                              {item.question}
                            </p>
                            {speechSupported && isVoiceEnabled && (
                              <button
                                onClick={() => speakText(item.response)}
                                className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors touch-manipulation flex-shrink-0"
                                title="Read response aloud"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-3">
                            {formatTimestamp(item.timestamp)} • {item.user}
                          </p>
                          <div className="bg-white p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                            {item.response}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Capabilities */}
              {activeTab === "capabilities" && (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center">
                    What our AI can help you with
                  </h2>
                  {aiCapabilities ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-3">
                        <h3 className="text-base sm:text-lg font-medium text-purple-600">
                          Capabilities
                        </h3>
                        <ul className="space-y-2">
                          {aiCapabilities.capabilities?.map(
                            (capability, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-sm sm:text-base"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                                <span className="text-gray-700">
                                  {capability}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base sm:text-lg font-medium text-blue-600">
                          Example Queries
                        </h3>
                        <ul className="space-y-2">
                          {aiCapabilities.examples?.map((example, idx) => (
                            <li
                              key={idx}
                              className="text-sm sm:text-base text-gray-600 italic"
                            >
                              "{example}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-pulse" />
                      <p className="text-sm sm:text-base">
                        Loading AI capabilities...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() =>
                    handleSampleQuestion("Show me today's attendance summary")
                  }
                  className="w-full text-left p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200 hover:border-green-300 touch-manipulation"
                >
                  <div className="text-sm font-medium text-green-800">
                    Today's Summary
                  </div>
                  <div className="text-xs text-green-600">
                    Get current attendance status
                  </div>
                </button>

                <button
                  onClick={() => handleSampleQuestion("Who was absent today?")}
                  className="w-full text-left p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg hover:from-red-100 hover:to-pink-100 transition-all border border-red-200 hover:border-red-300 touch-manipulation"
                >
                  <div className="text-sm font-medium text-red-800">
                    Absent Users
                  </div>
                  <div className="text-xs text-red-600">
                    Check who's missing today
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleSampleQuestion("Show me late arrivals today")
                  }
                  className="w-full text-left p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-all border border-yellow-200 hover:border-yellow-300 touch-manipulation"
                >
                  <div className="text-sm font-medium text-yellow-800">
                    Late Arrivals
                  </div>
                  <div className="text-xs text-yellow-600">
                    Find late employees
                  </div>
                </button>
              </div>
            </div>

            {/* Voice Features */}
            {speechSupported && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                  Voice Features
                </h3>
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">
                      AI responses read aloud
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">Voice input supported</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-700">
                      Enhanced accessibility
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs sm:text-sm text-blue-800">
                    <strong>Pro Tip:</strong> Use the microphone button to ask
                    questions with your voice!
                  </div>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                System Status
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI Engine</span>
                  <div
                    className={`flex items-center gap-2 ${
                      aiHealth?.status === "healthy"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {aiHealth?.status === "healthy" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {aiHealth?.status || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Voice Support</span>
                  <div
                    className={`flex items-center gap-2 ${
                      speechSupported ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {speechSupported ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {speechSupported ? "Available" : "Not Supported"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="text-blue-600 font-medium">~2-3s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
