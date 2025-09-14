import { Link, useNavigate } from "react-router-dom";

function Navbar({ user, onLogout, onLoginClick, onSignupClick }) {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-white shadow-md">
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
  );
}

export default Navbar;
