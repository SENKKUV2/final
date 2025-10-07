import { useState, useRef, useEffect } from "react";
import {
  FaRobot,
  FaUserTie,
  FaTimes,
  FaPaperPlane,
  FaUserCircle,
  FaComments,
} from "react-icons/fa";
import { supabase } from "./lib/supabase";

const HelpPanel = ({ isOpen, onClose, onChatbotClick, user, resetTrigger }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessages, setAdminMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messageInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Reset state and load data when panel opens or resetTrigger changes
  useEffect(() => {
    if (isOpen) {
      setActiveChat(null); // Reset to default state
      setShowHistory(false); // Hide chat history
      setAdminMessages([]); // Clear messages
      setAdminMessage(""); // Clear input
      if (user?.id) {
        loadMessages();
        loadChatHistory();
      }
    }
  }, [isOpen, user, resetTrigger]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [adminMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const subscription = supabase
      .channel("support_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.sender !== "user") {
            const newMessage = {
              id: payload.new.id,
              text: payload.new.message,
              timestamp: new Date(payload.new.created_at).toLocaleTimeString(),
              sender: payload.new.sender,
              seen: payload.new.sender === "user",
            };
            setAdminMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isOpen, user]);

  const loadMessages = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        timestamp: new Date(msg.created_at).toLocaleTimeString(),
        sender: msg.sender,
        seen: msg.sender === "user" || true,
      }));

      setAdminMessages(formattedMessages);
    } catch (err) {
      console.error("❌ Failed to load messages:", err.message);
    }
  };

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setChatHistory(data || []);
    } catch (err) {
      console.error("❌ Failed to load chat history:", err.message);
    }
  };

  const loadSupportChat = async (chatId) => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("support_messages")
        .eq("id", chatId)
        .single();

      if (error) throw error;

      if (data?.support_messages) {
        const formattedMessages = data.support_messages.map((msg) => ({
          id: msg.id,
          text: msg.message,
          timestamp: new Date(msg.created_at).toLocaleTimeString(),
          sender: msg.sender,
          seen: true,
        }));
        setAdminMessages(formattedMessages);
        setActiveChat("admin");
      }
    } catch (err) {
      console.error("❌ Failed to load support chat:", err.message);
    }
  };

  const saveSupportMessage = async (message) => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      const email = profile?.email || "unknown@example.com";

      const messageToSave = {
        user_id: user.id,
        sender: message.sender,
        message: message.text,
        email,
      };

      const { error } = await supabase
        .from("support_messages")
        .insert([messageToSave]);

      if (error) throw error;
    } catch (err) {
      console.error("❌ Failed to save support message:", err.message);
    }
  };

  const handleSendAdminMessage = async () => {
    if (!adminMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: adminMessage,
      timestamp: new Date().toLocaleTimeString(),
      sender: "user",
      seen: false,
    };

    setAdminMessages((prev) => [...prev, newMessage]);
    setAdminMessage("");
    await saveSupportMessage(newMessage);

    setTimeout(() => {
      const adminReply = {
        id: Date.now() + 1,
        text: "Thank you for your message! An admin will respond shortly.",
        timestamp: new Date().toLocaleTimeString(),
        sender: "admin",
        seen: false,
      };
      setAdminMessages((prev) => [...prev, adminReply]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-[#00355f] text-white rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <FaUserTie className="w-6 h-6" />
          <h3 className="font-semibold">Help Center</h3>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20"
          >
            <FaComments size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20"
          >
            <FaTimes size={20} />
          </button>
        </div>
      </div>

      {/* Chat history sidebar */}
      {showHistory && (
        <div className="absolute left-[-240px] top-0 w-60 h-full bg-gray-50 border-r shadow-md z-50 p-3 overflow-y-auto">
          <h4 className="font-semibold mb-3">Recent Chats</h4>
          {chatHistory.length ? (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  loadSupportChat(chat.id);
                  setShowHistory(false);
                }}
                className="p-3 mb-2 bg-white rounded-lg shadow cursor-pointer hover:bg-blue-50"
              >
                <p className="font-medium text-sm">{chat.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(chat.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No past chats</p>
          )}
        </div>
      )}

      {/* Options or Admin Chat */}
      {!activeChat ? (
        <div className="p-4 overflow-y-auto h-full">
          <div
            onClick={() => {
              onChatbotClick();
              onClose();
            }}
            className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-blue-50"
          >
            <FaRobot className="text-blue-600 mr-4" size={24} />
            <div>
              <h4 className="font-medium">AI Assistant</h4>
              <p className="text-sm text-gray-600">Get instant answers</p>
            </div>
          </div>
          <div
            onClick={() => {
              setActiveChat("admin");
              loadMessages();
            }}
            className="mt-4 flex items-center p-4 border rounded-lg cursor-pointer hover:bg-green-50"
          >
            <FaUserTie className="text-green-600 mr-4" size={24} />
            <div>
              <h4 className="font-medium">Message Admin</h4>
              <p className="text-sm text-gray-600">Talk to our support team</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100%-140px)]">
            {adminMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <FaUserTie className="mx-auto mb-2" size={32} />
                <p>Start a conversation</p>
              </div>
            ) : (
              adminMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-4 ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start max-w-[80%]">
                    {msg.sender === "admin" && (
                      <FaUserTie className="w-6 h-6 text-green-600 mr-2" />
                    )}
                    <div
                      className={`p-3 rounded-xl shadow-sm ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-tl-xl"
                          : "bg-gray-100 text-gray-800 rounded-tr-xl"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>{msg.timestamp}</span>
                        {msg.sender === "user" && (
                          <span>{msg.seen ? "✅" : "⏳"}</span>
                        )}
                      </div>
                    </div>
                    {msg.sender === "user" && (
                      <FaUserCircle className="w-6 h-6 text-gray-500 ml-2" />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t flex-shrink-0">
            <div className="flex items-center space-x-2 w-full">
              <input
                ref={messageInputRef}
                type="text"
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && handleSendAdminMessage()
                }
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[calc(100%-60px)]"
              />
              <button
                onClick={handleSendAdminMessage}
                disabled={!adminMessage.trim()}
                className={`p-2 rounded-full flex-shrink-0 ${
                  adminMessage.trim()
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                <FaPaperPlane size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPanel;