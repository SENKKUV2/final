import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { FaPaperPlane, FaHistory, FaTimes, FaUserCircle, FaRobot, FaPlus } from "react-icons/fa";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper component for the typing animation
const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
        <div className="bg-gray-200 p-3 rounded-t-xl rounded-br-xl shadow-sm text-sm flex items-center space-x-1">
            <div className="typing-dot bg-[#00355f]"></div>
            <div className="typing-dot bg-[#00355f]"></div>
            <div className="typing-dot bg-[#00355f]"></div>
        </div>
        <style jsx>{`
            .typing-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                animation: typing-bounce 1.4s infinite ease-in-out;
            }
            .typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            .typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            @keyframes typing-bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-4px); }
            }
        `}</style>
    </div>
);

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
        if (tourId) {
            fetchTourDetails(tourId);
        }
    }, [user, tourId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isBotTyping]);

    useEffect(() => {
        if (messages.length > 1 && user) saveCurrentChat();
    }, [messages]);

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
                    text: `Hello there! 👋 I'm **TourGuide AI**, your personal assistant for the **${data.title}** tour. Here are the quick details:
- **Location**: ${data.location}
- **Type**: ${data.type}
- **Price**: ₱${data.price}
- **Duration**: ${data.duration}
- **Availability**: ${data.available ? `**${data.max_capacity}** spots available.` : "Currently unavailable."}
What else would you like to know about this amazing experience?`,
                    sender: "bot",
                    timestamp: new Date(),
                    preReadyQuestions: [
                        `Tell me more about the ${data.title} tour.`,
                        `Is this tour available for booking?`,
                        `How do I book this tour?`
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
                    text: "I couldn't find the details for this tour. Could you try asking about another one?",
                    sender: "bot",
                    timestamp: new Date(),
                },
            ]);
        }
    };

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

    const startNewChat = (userName = "Guest") => {
        setCurrentChatId(null);
        const welcomeMessage = {
            id: 1,
            text: `Hey there, **${userName}**! 👋\nI'm **TourGuide AI**, and I'm ready to help you with your next adventure. Just ask me anything about tours, your bookings, or how to get started!`,
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

    const loadChatFromHistory = (chat) => {
        setMessages(chat.messages);
        setCurrentChatId(chat.id);
        setIsHistoryVisible(false);
    };

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

    const getAIResponse = async (userMessageText, conversationHistory) => {
        const apiKey = "AIzaSyBl_OV_7upAcm1FBlj4CHJe7QVocNlNJf0"; // Use env variable in production
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const userName = user?.full_name || "the user";
        const currentDate = new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const bookings = await fetchUserBookings();
        const bookingsContext = bookings.length
            ? "📋 **Your Bookings:**\n" + bookings
                .map(
                    (b) =>
                        `- **Tour**: ${b.tours.title}\n - **Date**: ${b.booking_date}\n - **Status**: **${b.status}**\n - **People**: ${b.number_of_people}\n - **Total**: ₱${b.total_price}`
                )
                .join("\n")
            : "No bookings found.";

        const { data: tours, error: toursError } = await supabase
            .from("tours")
            .select("title, price, duration, location, type, max_capacity, available")
            .eq("available", true)
            .limit(5);

        const toursContext = toursError
            ? "Unable to fetch tour details."
            : "✈️ **Available Tours (Sample):**\n" + tours
                .map(
                    (t) =>
                        `- **${t.title}**: ${t.type} tour in ${t.location}, **₱${t.price}**, ${t.duration}, ${t.max_capacity} spots`
                )
                .join("\n");

        const historyString = conversationHistory
            .slice(-5)
            .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text || ""}`)
            .join("\n");

        const prompt = `
You are **TourGuide AI**, an expert assistant for a tour booking platform. Provide accurate, helpful, and concise responses using Markdown (e.g., **bold**, - lists, ## headings). Your tone is friendly, professional, and empathetic. Use the provided database schema and context to answer queries about tours, bookings, or user profiles.

**Directives:**
- Answer accurately based on schema and context. If unsure, admit it politely and offer to connect with a human.
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
                throw new Error("I can't respond to that request. Please try asking something else.");
            }

            throw new Error("No valid response from the AI.");
        } catch (error) {
            console.error("Gemini API error:", error.message);
            throw error;
        }
    };

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
                text: "I'm having a little trouble connecting right now. Please try again in a bit!",
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
        <div className="fixed bottom-4 right-4 w-96 max-h-[600px] h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col font-sans transition-all duration-300 border border-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-[#ffffff] text-white rounded-t-2xl shadow-md">
                <div className="flex items-center space-x-3">
                    <FaRobot className="w-6 h-6 text-[#00355f]" />
                    <h3 className="font-semibold text-[#00355f]">TourGuide AI</h3>
                </div>
                <div className="flex space-x-2">
                    <button
    onClick={() => setIsHistoryVisible(true)}
    className="p-2 rounded-full hover:bg-[#00355f] hover:bg-opacity-20 transition-colors duration-200"
    aria-label="View chat history"
>
    <FaHistory className="text-[#00355f]" />
</button>
<button
    onClick={() => setIsOpen(false)}
    className="p-2 rounded-full hover:bg-[#00355f] hover:bg-opacity-20 transition-colors duration-200"
    aria-label="Close chatbot"
>
    <FaTimes className="text-[#00355f]" />
</button>
                </div>
            </div>

            {/* Chat History */}
            {isHistoryVisible && (
                <div className="absolute inset-0 bg-white rounded-2xl p-4 flex flex-col z-10 shadow-2xl">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                        <h4 className="font-bold text-lg text-[#00355f]">Recent Chats</h4>
                        <button 
                            onClick={() => setIsHistoryVisible(false)} 
                            className="text-gray-500 hover:text-[#00355f] p-1 rounded transition-colors" 
                            aria-label="Close history"
                        >
                            <FaTimes className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {chatHistory.length === 0 ? (
                            <p className="text-gray-500 text-center text-sm pt-8">No recent chats found.</p>
                        ) : (
                            chatHistory.map((chat) => (
                                <div
                                    key={chat.id}
                                    className="group flex justify-between items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    <button
                                        onClick={() => loadChatFromHistory(chat)}
                                        className="text-left flex-1 truncate text-sm font-medium text-[#00355f] hover:text-blue-700"
                                    >
                                        {chat.title}
                                    </button>
                                    <button
                                        onClick={() => deleteChat(chat.id)}
                                        className="text-red-500 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-red-700"
                                        aria-label="Delete chat"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => startNewChat(user?.full_name || "Guest")}
                        className="mt-4 flex items-center justify-center space-x-2 bg-[#eec218] text-[#00355f] py-3 rounded-xl font-semibold shadow-md hover:bg-yellow-500 transition-colors duration-200"
                    >
                        <FaPlus className="w-4 h-4" />
                        <span>Start New Chat</span>
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`flex items-start max-w-[80%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                            {msg.sender === "bot" ? (
                                <FaRobot className="w-6 h-6 text-[#00355f] mr-2 flex-shrink-0 mt-1" />
                            ) : (
                                <FaUserCircle className="w-6 h-6 text-gray-500 ml-2 flex-shrink-0 mt-1" />
                            )}
                            <div
                                className={`p-3 rounded-xl shadow-sm text-sm ${
                                    msg.sender === "user"
                                        ? "bg-[#00355f] text-white rounded-br-sm"
                                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                                }`}
                            >
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                        strong: ({children}) => (
                                            <strong className={msg.sender === "user" ? "text-[#eec218]" : "text-[#00355f] font-semibold"}>
                                                {children}
                                            </strong>
                                        ),
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isBotTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* Pre-ready questions */}
            {messages.length > 0 && messages[messages.length - 1].preReadyQuestions && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600 mb-3 font-medium">Try asking:</div>
                    <div className="space-y-2">
                        {messages[messages.length - 1].preReadyQuestions.map((q, index) => (
                            <button
                                key={index}
                                onClick={() => sendMessage(q)}
                                className="w-full text-left px-3 py-2 rounded-lg border border-gray-300 bg-white text-[#00355f] text-sm hover:bg-gray-50 hover:border-[#eec218] transition-colors focus:outline-none focus:ring-2 focus:ring-[#eec218]"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex space-x-2 items-center">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask about tours or bookings..."
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eec218] focus:border-transparent transition-all text-sm"
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <button
                        onClick={() => sendMessage()}
                        className={`p-3 rounded-xl shadow-lg transition-all duration-200 ${
                            message.trim()
                                ? "bg-[#eec218] text-[#00355f] hover:bg-yellow-500"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={!message.trim()}
                        aria-label="Send message"
                    >
                        <FaPaperPlane className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default Chatbot;