import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Brain,
  Send,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const AITestPage = () => {
  const { BASE_URL } = useAuth();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiCapabilities, setAiCapabilities] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);

  // Pre-defined sample questions
  const sampleQuestions = [
    "Show me today's attendance summary",
    "Who was absent yesterday?",
    "Was john@example.com present on 2025-09-13?",
    "Generate weekly report for this week",
    "How many people attended work today?",
    "Show me absent users on 2025-09-12",
  ];

  // Fetch AI capabilities and health on component mount
  useEffect(() => {
    fetchAICapabilities();
    checkAIHealth();
  }, []);

  const fetchAICapabilities = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BASE_URL}/ai/capabilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiCapabilities(data);
      }
    } catch (error) {
      console.error("Failed to fetch AI capabilities:", error);
    }
  };

  const checkAIHealth = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BASE_URL}/ai/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiHealth(data);
      }
    } catch (error) {
      console.error("Failed to check AI health:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BASE_URL}/ai/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.response || "No response from AI");
      } else {
        const errorData = await res.json();
        setResponse(
          `Error: ${errorData.message || "Failed to get AI response"}`
        );
      }
    } catch (error) {
      console.error("AI query failed:", error);
      setResponse("Error: Could not connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuestion = (sampleQ) => {
    setQuestion(sampleQ);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
          <Brain className="mr-3 text-purple-600" size={32} />
          AI Analytics Testing
        </h1>
        <p className="text-gray-600">
          Test your AI-powered attendance analytics system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Health Status */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="mr-2 text-yellow-500" size={20} />
              AI Status
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Health:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                    aiHealth?.status === "healthy"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {aiHealth?.status === "healthy" ? (
                    <>
                      <CheckCircle size={12} className="mr-1" /> Healthy
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} className="mr-1" /> Unhealthy
                    </>
                  )}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                Last checked:{" "}
                {aiHealth?.timestamp
                  ? new Date(aiHealth.timestamp).toLocaleTimeString()
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Sample Questions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="mr-2 text-blue-500" size={20} />
              Sample Questions
            </h3>

            <div className="space-y-2">
              {sampleQuestions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuestion(q)}
                  className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Testing Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">AI Query Interface</h3>

            {/* Query Form */}
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ask AI about attendance data..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent mr-2"></div>
                  ) : (
                    <Send className="mr-2" size={16} />
                  )}
                  {loading ? "Processing..." : "Ask AI"}
                </button>
              </div>
            </form>

            {/* Response Area */}
            <div className="min-h-[300px]">
              <h4 className="font-semibold text-gray-700 mb-3">AI Response:</h4>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[250px] border border-gray-200">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-top-transparent"></div>
                    <span className="ml-3 text-gray-600">
                      AI is thinking...
                    </span>
                  </div>
                ) : response ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {response}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">
                    AI response will appear here after you submit a query.
                  </p>
                )}
              </div>
            </div>

            {/* AI Capabilities */}
            {aiCapabilities && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  AI Capabilities:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {aiCapabilities.capabilities?.map((capability, index) => (
                    <li key={index}>• {capability}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestPage;
