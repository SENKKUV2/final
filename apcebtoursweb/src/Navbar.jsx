// Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaQuestionCircle } from "react-icons/fa";
import HelpPanel from "./HelpPanel";
import Chatbot from "./AI/Chatbot";
import logo from "./assets/apcebulogo.png"; // Import logo for optimization

function Navbar({ user, onLogout, onLoginClick, onSignupClick, onChatbotClick }) {
  const navigate = useNavigate();
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const openHelpPanel = () => {
    setIsHelpPanelOpen(true);
    setIsChatbotOpen(false);
    setResetKey((prev) => prev + 1);
  };

  const openChatbot = () => {
    setIsChatbotOpen(true);
    setIsHelpPanelOpen(false);
    setResetKey((prev) => prev + 1);
    onChatbotClick();
  };

  const closeHelpPanel = () => {
    setIsHelpPanelOpen(false);
  };

  const closeChatbot = () => {
    setIsChatbotOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={logo}
                alt="APCEBU Tours Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>
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
          <div className="flex items-center space-x-4">
            <button
              onClick={openHelpPanel}
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
      <HelpPanel
        isOpen={isHelpPanelOpen}
        onClose={closeHelpPanel}
        onChatbotClick={openChatbot}
        user={user}
        resetTrigger={resetKey}
      />
      <Chatbot
        user={user}
        isOpen={isChatbotOpen}
        setIsOpen={setIsChatbotOpen}
        resetTrigger={resetKey}
      />
    </>
  );
}

export default Navbar;