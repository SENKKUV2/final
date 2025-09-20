import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar({ user, onLogout, onLoginClick, onSignupClick }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
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

        {/* Hamburger Menu for Mobile */}
        <button
          className="md:hidden flex items-center p-2 text-gray-600 hover:text-gray-800"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex flex-grow justify-center space-x-8">
          <Link
            to="/tours"
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Tours
          </Link>
          <Link
            to="/contact"
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Contact
          </Link>
          <Link
            to="/about"
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            About Us
          </Link>
        </div>

        {/* User Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 font-medium">
                Hello, {user.user_metadata?.full_name || "Traveler"}
              </span>
              <button
                onClick={onLogout}
                className="px-6 py-2 rounded-full font-medium transition-colors"
                style={{ backgroundColor: "#eec218", color: "#00355f" }}
                aria-label="Logout"
              >
                Logout
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="p-2 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: "#00355f", color: "white" }}
                aria-label="My Profile"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onLoginClick}
                className="text-gray-600 font-medium px-4 py-2 hover:text-gray-800 transition-colors"
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

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="flex flex-col items-center bg-white py-4 space-y-4 border-t border-gray-200">
          <Link
            to="/tours"
            className="text-gray-600 hover:text-gray-800 font-medium w-full text-center py-2"
            onClick={toggleMenu}
          >
            Tours
          </Link>
          <Link
            to="/contact"
            className="text-gray-600 hover:text-gray-800 font-medium w-full text-center py-2"
            onClick={toggleMenu}
          >
            Contact
          </Link>
          <Link
            to="/about"
            className="text-gray-600 hover:text-gray-800 font-medium w-full text-center py-2"
            onClick={toggleMenu}
          >
            About Us
          </Link>
          {user ? (
            <div className="flex flex-col items-center space-y-4 w-full">
              <span className="text-gray-600 font-medium py-2">
                Hello, {user.user_metadata?.full_name || "Traveler"}
              </span>
              <button
                onClick={() => {
                  toggleMenu();
                  navigate("/profile");
                }}
                className="p-2 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: "#00355f", color: "white" }}
                aria-label="My Profile"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <button
                onClick={() => {
                  toggleMenu();
                  onLogout();
                }}
                className="p-2 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: "#eec218", color: "#00355f" }}
                aria-label="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h3a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              <button
                onClick={() => {
                  toggleMenu();
                  onLoginClick();
                }}
                className="text-gray-600 font-medium py-2 w-full text-center hover:text-gray-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  toggleMenu();
                  onSignupClick();
                }}
                className="px-6 py-2 rounded-full font-medium transition-colors w-full text-center"
                style={{ backgroundColor: "#00355f", color: "white" }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;