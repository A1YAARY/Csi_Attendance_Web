import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "react-toastify";

const AITestPage = () => {
  const { baseURL, token, user } = useAuth();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiCapabilities, setAiCapabilities] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("query");

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

  // Fetch AI capabilities and health on component mount
  useEffect(() => {
    fetchAICapabilities();
    checkAIHealth();
    loadQueryHistory();
  }, []);

  const fetchAICapabilities = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}/api/ai-analytics/capabilities`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAiCapabilities(data);
      } else {
        throw new Error("Failed to fetch capabilities");
      }
    } catch (error) {
      console.error("Failed to fetch AI capabilities:", error);
      toast.error("Could not load AI capabilities");
    }
  }, [baseURL, token]);

  const checkAIHealth = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}/api/ai-analytics/health`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAiHealth(data);
      } else {
        throw new Error("Failed to check AI health");
      }
    } catch (error) {
      console.error("Failed to check AI health:", error);
      setAiHealth({ status: "unhealthy", error: error.message });
    }
  }, [baseURL, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const response = await fetch(`${baseURL}/api/ai-analytics/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

        const newHistory = [historyItem, ...queryHistory.slice(0, 9)]; // Keep last 10
        setQueryHistory(newHistory);
        saveQueryHistory(newHistory);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Test your AI-powered attendance analytics system
                </p>
              </div>
            </div>

            {/* AI Health Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                  aiHealth?.status === "healthy"
                    ? "bg-green-100 text-green-800"
                    : aiHealth?.status === "initializing"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {aiHealth?.status === "healthy" ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : aiHealth?.status === "initializing" ? (
                  <Clock className="w-4 h-4 mr-1" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-1" />
                )}
                AI {aiHealth?.status || "Unknown"}
              </div>
              <button
                onClick={checkAIHealth}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh AI Status"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: "query", name: "AI Query", icon: MessageSquare },
                { id: "samples", name: "Sample Questions", icon: Zap },
                { id: "history", name: "Query History", icon: Clock },
                {
                  id: "capabilities",
                  name: "AI Capabilities",
                  icon: TrendingUp,
                },
              ].map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Query Tab */}
            {activeTab === "query" && (
              <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ask AI about attendance data:
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., Show me today's attendance summary or Who was absent yesterday?"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading || !question.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="animate-spin w-5 h-5 mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Ask AI
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={clearResponse}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Clear Input & Response"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </form>

                {/* Response Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-600" />
                      AI Response
                    </h3>

                    {response && (
                      <button
                        onClick={copyResponse}
                        className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        title="Copy Response"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 min-h-[200px] border-2 border-dashed border-gray-200">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                          <RefreshCw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-gray-600">
                            AI is processing your query...
                          </p>
                        </div>
                      </div>
                    ) : response ? (
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-800 font-medium">
                          {response}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>
                            AI response will appear here after you submit a
                            query.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sample Questions Tab */}
            {activeTab === "samples" && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Sample Questions
                  </h2>
                  <p className="text-gray-600">
                    Click on any question to try it out
                  </p>
                </div>

                {sampleQuestions.map((category, categoryIndex) => (
                  <div
                    key={categoryIndex}
                    className="bg-gray-50 rounded-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {category.category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.questions.map((q, qIndex) => (
                        <button
                          key={qIndex}
                          onClick={() => handleSampleQuestion(q)}
                          className="text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                        >
                          <div className="flex items-start">
                            <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-1 mr-3 flex-shrink-0" />
                            <span className="text-gray-700 group-hover:text-blue-700 font-medium">
                              {q}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Query History Tab */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Query History
                  </h2>
                  {queryHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="flex items-center px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear History
                    </button>
                  )}
                </div>

                {queryHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No queries yet</p>
                    <p className="text-gray-400">
                      Your AI queries will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queryHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-200 p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-1">
                              {item.question}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatTimestamp(item.timestamp)} • {item.user}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSampleQuestion(item.question)}
                            className="ml-4 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Use this question"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700">
                            {item.response}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Capabilities Tab */}
            {activeTab === "capabilities" && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    AI Capabilities
                  </h2>
                  <p className="text-gray-600">What our AI can help you with</p>
                </div>

                {aiCapabilities ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Capabilities
                      </h3>
                      <ul className="space-y-2">
                        {aiCapabilities.capabilities?.map(
                          (capability, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-3 flex-shrink-0" />
                              <span className="text-blue-800">
                                {capability}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Example Queries
                      </h3>
                      <div className="space-y-2">
                        {aiCapabilities.examples?.map((example, index) => (
                          <button
                            key={index}
                            onClick={() => handleSampleQuestion(example)}
                            className="w-full text-left p-3 bg-white rounded-lg border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
                          >
                            <span className="text-green-800 group-hover:text-green-900 font-medium">
                              "{example}"
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <RefreshCw className="animate-spin w-8 h-8 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading AI capabilities...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
