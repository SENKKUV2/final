import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { FaPaperPlane, FaHistory, FaTimes } from "react-icons/fa";

// Modified props to include tourId for context-aware chats
const Chatbot = ({ user, isOpen, setIsOpen, tourId = null }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadChatHistory();
      startNewChat(user?.full_name || "Guest");
    }
    // If a tourId is provided, initialize with tour-specific context
    if (tourId) {
      fetchTourDetails(tourId);
    }
  }, [user, tourId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 1 && user) saveCurrentChat();
  }, [messages]);

  // New function to fetch tour details from Supabase
  const fetchTourDetails = async (tourId) => {
    try {
      const { data, error } = await supabase
        .from("tours")
        .select("title, price, duration, location, description, type, max_capacity, available")
        .eq("id", tourId)
        .single();
      if (error) throw error;
      if (data) {
        const welcomeMessage = {
          id: Date.now(),
          text: `Hello! You're inquiring about **${data.title}** in ${data.location}. It's a ${data.type} tour priced at ₱${data.price} for ${data.duration}. ${data.available ? `There are ${data.max_capacity} spots available.` : "This tour is currently unavailable."} How can I assist you with this tour?`,
          sender: "bot",
          timestamp: new Date(),
          preReadyQuestions: [
            `Tell me more about the ${data.title} tour.`,
            `What's the price for this tour?`,
            `How long is this tour?`
          ]
        };
        setMessages([welcomeMessage]);
      }
    } catch (e) {
      console.error("Failed to fetch tour details:", e.message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Sorry, I couldn't fetch details for this tour. Please try another or ask for general assistance!",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // New function to fetch user bookings
  const fetchUserBookings = async () => {
    try {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, tour_id, booking_date, status, number_of_people, total_price, tours(title)")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Failed to fetch bookings:", e.message);
      return [];
    }
  };

  // Load chat history from Supabase
  const loadChatHistory = async () => {
    try {
      if (!user) {
        setChatHistory([]);
        return;
      }
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(50);
      if (error) throw error;
      setChatHistory(data || []);
    } catch (e) {
      console.error("Failed to load chat history:", e.message);
    }
  };

  // Save current chat to Supabase
  const saveCurrentChat = async () => {
    const userMessage = messages.find((m) => m.sender === "user");
    if (!userMessage || !user) return;

    const title =
      userMessage.text.substring(0, 40) +
      (userMessage.text.length > 40 ? "..." : "");
    const idToSave = currentChatId || Date.now();

    const chatEntry = {
      id: idToSave,
      user_id: user.id,
      title,
      messages,
      timestamp: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("chats")
        .upsert([chatEntry], { onConflict: "id" });
      if (error) throw error;
      setChatHistory((prev) => {
        const existingIndex = prev.findIndex((chat) => chat.id === idToSave);
        let updatedHistory = [...prev];
        if (existingIndex > -1) {
          updatedHistory[existingIndex] = chatEntry;
        } else {
          updatedHistory.unshift(chatEntry);
        }
        updatedHistory.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        if (updatedHistory.length > 50) updatedHistory.pop();
        return updatedHistory;
      });
      if (!currentChatId) setCurrentChatId(idToSave);
    } catch (e) {
      console.error("Failed to save chat:", e.message);
    }
  };

  // Start a new chat
  const startNewChat = (userName = "Guest") => {
    setCurrentChatId(null);
    const welcomeMessage = {
      id: 1,
      text: `Hello ${userName}! 👋\nI'm here to help you explore tours, check bookings, or answer any questions. What would you like to do?`,
      sender: "bot",
      timestamp: new Date(),
      preReadyQuestions: [
        "What tours are available?",
        "Can you show me my upcoming bookings?",
        "How do I book a tour?"
      ]
    };
    setMessages([welcomeMessage]);
    setIsHistoryVisible(false);
  };

  // Load a chat from history
  const loadChatFromHistory = (chat) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setIsHistoryVisible(false);
  };

  // Delete a chat from Supabase
  const deleteChat = async (chatId) => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatId)
        .eq("user_id", user.id);
      if (error) throw error;
      setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) startNewChat(user?.full_name || "Guest");
    } catch (e) {
      console.error("Failed to delete chat:", e.message);
    }
  };

  // Modified Gemini AI API call to align with tour booking context
  const getAIResponse = async (userMessageText, conversationHistory) => {
    const apiKey = "AIzaSyBl_OV_7upAcm1FBlj4CHJe7QVocNlNJf0"; // Move to env variable in production
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const userName = user?.full_name || "the user";
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Fetch user bookings for context
    const bookings = await fetchUserBookings();
    const bookingsContext = bookings.length
      ? bookings
          .map(
            (b) =>
              `- Tour: ${b.tours.title}, Date: ${b.booking_date}, Status: ${b.status}, People: ${b.number_of_people}, Total: ₱${b.total_price}`
          )
          .join("\n")
      : "No bookings found.";

    // Fetch available tours for context
    const { data: tours, error: toursError } = await supabase
      .from("tours")
      .select("title, price, duration, location, type, max_capacity, available")
      .eq("available", true)
      .limit(5);
    const toursContext = toursError
      ? "Unable to fetch tour details."
      : tours
          .map(
            (t) =>
              `- **${t.title}**: ${t.type} tour in ${t.location}, ₱${t.price}, ${t.duration}, ${t.max_capacity} spots`
          )
          .join("\n");

    const historyString = conversationHistory
      .slice(-5)
      .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text || ""}`)
      .join("\n");

    const prompt = `
You are **TourGuide AI**, an expert assistant for a tour booking platform. Provide accurate, helpful, and concise responses using Markdown (e.g., **bold**, - lists). Use the provided database schema and context to answer queries about tours, bookings, or user profiles.

**Directives:**
- Answer accurately based on schema and context. If unsure, say so politely.
- Decline harmful or unethical requests politely.
- Assist with tour inquiries, booking status, or profile updates.
- For booking requests, confirm details (tour, date, number of people) and suggest next steps.
- Use schema fields (e.g., tours.title, bookings.status) for precise responses.

**Database Schema:**
- **tours**: id (uuid), title (text), price (integer), duration (text), location (text), type (regular/combo), max_capacity (integer), available (boolean)
- **bookings**: id (uuid), user_id (uuid), tour_id (uuid), booking_date (date), number_of_people (integer), total_price (integer), status (pending/confirmed/cancelled/completed)
- **profiles**: id (uuid), email (text), full_name (text), phone (text), role (text)

**Context:**
- User: ${userName}
- Date: ${currentDate}
- User Bookings:
${bookingsContext}
- Available Tours (sample):
${toursContext}
- Conversation History:
${historyString}

**User Query:**
${userMessageText}

**Response:**
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API error occurred");
      }

      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
      }

      if (result.promptFeedback?.blockReason) {
        throw new Error("I can’t respond to that request. Please try asking something else.");
      }

      throw new Error("No valid response from the AI.");
    } catch (error) {
      console.error("Gemini API error:", error.message);
      throw error;
    }
  };

  // Send message and get Gemini AI response
  const sendMessage = async (messageText = message) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessage("");
    setIsBotTyping(true);

    try {
      const botResponseText = await getAIResponse(messageText.trim(), updatedMessages);
      const botMessage = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Send message error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-[500px] bg-white rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-[#00355f] text-white rounded-t-lg">
        <h3 className="font-bold">TourGuide AI</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsHistoryVisible(true)}
            className="hover:bg-gray-200 hover:bg-opacity-20 p-1 rounded"
          >
            <FaHistory />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-gray-200 hover:bg-opacity-20 p-1 rounded"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Chat History */}
      {isHistoryVisible && (
        <div className="absolute inset-0 bg-white rounded-lg p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold">Recent Chats</h4>
            <button onClick={() => setIsHistoryVisible(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-center">No recent chats found.</p>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="flex justify-between items-center p-2 border-b border-gray-200"
                >
                  <button
                    onClick={() => loadChatFromHistory(chat)}
                    className="text-left flex-1 truncate"
                  >
                    {chat.title}
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => startNewChat(user?.full_name || "Guest")}
            className="mt-4 bg-[#00355f] text-white py-2 rounded-lg"
          >
            Start New Chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.sender === "user"
                  ? "bg-[#E91E63] text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ))}

        {isBotTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 p-3 rounded-lg">Typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pre-ready questions */}
      {messages.length > 0 && messages[messages.length - 1].preReadyQuestions && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 mb-2">Try asking:</div>
          <div className="space-y-2">
            {messages[messages.length - 1].preReadyQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => sendMessage(q)}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00355f]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about tours or bookings..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00355f]"
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={() => sendMessage()}
            className={`p-2 rounded-lg ${
              message.trim()
                ? "bg-[#E91E63] text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!message.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;