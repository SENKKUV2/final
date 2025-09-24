import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaQuestionCircle, FaRobot, FaUserTie, FaTimes, FaPaperPlane } from "react-icons/fa";

// Help Panel Component
const HelpPanel = ({ isOpen, onClose, onChatbotClick }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessages, setAdminMessages] = useState([]);

  const handleSendAdminMessage = () => {
    if (adminMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        text: adminMessage,
        timestamp: new Date().toLocaleTimeString(),
        sender: 'user'
      };
      setAdminMessages([...adminMessages, newMessage]);
      setAdminMessage("");
      
      // Simulate admin auto-reply (you can remove this in production)
      setTimeout(() => {
        const adminReply = {
          id: Date.now() + 1,
          text: "Thank you for your message! An admin will respond to you shortly.",
          timestamp: new Date().toLocaleTimeString(),
          sender: 'admin'
        };
        setAdminMessages(prev => [...prev, adminReply]);
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: "#00355f" }}>
          <h2 className="text-xl font-semibold text-white">Help Center</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 p-1"
            style={{ backgroundColor: "#00355f" }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Chat Options */}
        {!activeChat && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Choose how you'd like to get help:</h3>
            
            <div className="space-y-4">
              {/* AI Chat Option */}
              <div
                onClick={() => {
                  onChatbotClick();
                  onClose();
                }}
                className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
                  <FaRobot className="text-blue-600" size={24} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">AI Assistant</h4>
                  <p className="text-sm text-gray-600">Get instant answers from our AI chatbot</p>
                </div>
              </div>

              {/* Admin Chat Option */}
              <div
                onClick={() => setActiveChat('admin')}
                className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
                  <FaUserTie className="text-green-600" size={24} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Message Admin</h4>
                  <p className="text-sm text-gray-600">Send a direct message to our support team</p>
                </div>
              </div>
            </div>

            {/* Quick Help Section */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Help</h3>
              <div className="space-y-2">
                <details className="border border-gray-200 rounded-lg">
                  <summary className="p-3 cursor-pointer hover:bg-gray-50 font-medium text-gray-700">
                    How do I book a tour?
                  </summary>
                  <div className="p-3 pt-0 text-sm text-gray-600">
                    Browse our tours page, select your preferred tour, choose your date and number of guests, then complete the booking form.
                  </div>
                </details>
                
                <details className="border border-gray-200 rounded-lg">
                  <summary className="p-3 cursor-pointer hover:bg-gray-50 font-medium text-gray-700">
                    Can I cancel my booking?
                  </summary>
                  <div className="p-3 pt-0 text-sm text-gray-600">
                    Yes, you can request cancellation through your profile page. Cancellation policies may apply depending on the timing.
                  </div>
                </details>
                
                <details className="border border-gray-200 rounded-lg">
                  <summary className="p-3 cursor-pointer hover:bg-gray-50 font-medium text-gray-700">
                    What payment methods do you accept?
                  </summary>
                  <div className="p-3 pt-0 text-sm text-gray-600">
                    We accept major credit cards, PayPal, and bank transfers. Payment is required to confirm your booking.
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Admin Chat Interface */}
        {activeChat === 'admin' && (
          <div className="flex flex-col h-full">
            {/* Admin Chat Header */}
            <div className="flex items-center p-4 border-b border-gray-200 bg-green-50">
              <button
                onClick={() => setActiveChat(null)}
                className="mr-3 text-gray-600 hover:text-gray-800"
              >
                ←
              </button>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <FaUserTie className="text-green-600" size={16} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Admin Support</h4>
                  <p className="text-xs text-gray-600">We'll respond as soon as possible</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {adminMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <FaUserTie className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>Start a conversation with our admin team</p>
                </div>
              ) : (
                adminMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleSendAdminMessage}
                  disabled={!adminMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                >
                  <FaPaperPlane size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Navbar({ user, onLogout, onLoginClick, onSignupClick, onChatbotClick }) {
  const navigate = useNavigate();
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/src/assets/apcebulogo.png"
                alt="APCEBU Tours Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex flex-grow justify-center space-x-8">
            <Link to="/tours" className="text-gray-600 hover:text-gray-800 font-medium">
              Tours
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-800 font-medium">
              Contact
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-800 font-medium">
              About Us
            </Link>
          </div>

          {/* User Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsHelpPanelOpen(true)}
              className="text-gray-600 hover:text-[#00355f] p-2"
              title="Get Help"
            >
              <FaQuestionCircle size={20} />
            </button>
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 font-medium">
                  Hello, {user.user_metadata?.full_name || "Traveler"}
                </span>
                <button
                  onClick={onLogout}
                  className="px-6 py-2 rounded-full font-medium transition-colors"
                  style={{ backgroundColor: "#eec218", color: "#00355f" }}
                >
                  Logout
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "#00355f", color: "white" }}
                >
                  My Profile
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="text-gray-600 font-medium px-4 py-2"
                >
                  Sign In
                </button>
                <button
                  onClick={onSignupClick}
                  className="px-6 py-2 rounded-full font-medium transition-colors"
                  style={{ backgroundColor: "#00355f", color: "white" }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Help Panel */}
      <HelpPanel 
        isOpen={isHelpPanelOpen}
        onClose={() => setIsHelpPanelOpen(false)}
        onChatbotClick={onChatbotClick}
      />
    </>
  );
}

export default Navbar;