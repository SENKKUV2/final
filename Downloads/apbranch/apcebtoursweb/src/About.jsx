import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot, FaLeaf, FaHandshake, FaStar, FaShieldAlt } from "react-icons/fa";

export default function About() {
  const { user, setUser } = useAuth(); // Use global user state from AuthContext
  const [loadingUser, setLoadingUser] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false); // Chatbot state

  // Global auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Success and error modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setMiddleInitial("");
    setConfirmPassword("");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMessage("Login successful!");
        setShowSuccessModal(true);
        setShowAuthModal(false);
        resetAuthForm();
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              middle_initial: middleInitial,
            },
          },
        });
        if (error) throw error;
        setSuccessMessage(
          "Registration successful! Please check your email to verify your account."
        );
        setShowSuccessModal(true);
        setShowAuthModal(false);
        resetAuthForm();
      }
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage("Error logging out");
      setShowErrorModal(true);
    } else {
      setUser(null);
      setShowLogoutModal(false);
      setSuccessMessage("Logged out successfully");
      setShowSuccessModal(true);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLoginClick = () => {
    setIsLogin(true);
    setShowAuthModal(true);
  };

  const handleSignupClick = () => {
    setIsLogin(false);
    setShowAuthModal(true);
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user ?? null);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoadingUser(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, [setUser]);

  if (loadingUser) {
    return <div className="p-6">Loading...</div>;
  }

  const teamMembers = [
    {
      name: "Maria Santos",
      role: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400",
      description:
        "With over 15 years of experience in tourism, Maria founded Explore Cebu to share the beauty of the Philippines with the world.",
    },
    {
      name: "Carlos Rodriguez",
      role: "Head Tour Guide",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      description:
        "A Cebu native with encyclopedic knowledge of local history, culture, and hidden gems throughout the islands.",
    },
    {
      name: "Ana Delgado",
      role: "Operations Manager",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
      description:
        "Ensures every tour runs smoothly and every guest has an unforgettable experience from start to finish.",
    },
    {
      name: "Miguel Torres",
      role: "Marine Activities Specialist",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
      description:
        "Expert in water sports and marine safety, leading our island hopping and diving adventures.",
    },
  ];

  const values = [
    {
      icon: <FaLeaf className="text-4xl" style={{ color: "#00355f" }} />,
      title: "Sustainable Tourism",
      description:
        "We're committed to preserving the natural beauty of Cebu for future generations through responsible tourism practices.",
    },
    {
      icon: <FaHandshake className="text-4xl" style={{ color: "#00355f" }} />,
      title: "Community Partnership",
      description:
        "We work closely with local communities, ensuring tourism benefits everyone and preserves authentic culture.",
    },
    {
      icon: <FaStar className="text-4xl" style={{ color: "#00355f" }} />,
      title: "Excellence in Service",
      description:
        "Every guest deserves exceptional service. We go above and beyond to create memorable experiences.",
    },
    {
      icon: <FaShieldAlt className="text-4xl" style={{ color: "#00355f" }} />,
      title: "Safety First",
      description:
        "Your safety is our top priority. All our guides are certified and our equipment is regularly inspected.",
    },
  ];

  const stats = [
    { number: "2010", label: "Founded" },
    { number: "5000+", label: "Happy Travelers" },
    { number: "25+", label: "Tour Packages" },
    { number: "15", label: "Expert Guides" },
  ];

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <Navbar
        user={user}
        onLogout={handleLogoutClick}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)}
      />

      {/* Chatbot Modal */}
      <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />

      {/* Floating Chatbot Button */}
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] transition-colors z-40"
      >
        <FaRobot size={24} />
      </button>

      {/* Global Auth Modal */}
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        authLoading={authLoading}
        handleAuth={handleAuth}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        middleInitial={middleInitial}
        setMiddleInitial={setMiddleInitial}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        resetAuthForm={resetAuthForm}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        showLogoutModal={showLogoutModal}
        setShowLogoutModal={setShowLogoutModal}
        handleLogout={handleLogout}
      />

      {/* Success Modal */}
      <SuccessModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        message={errorMessage}
      />

      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden mt-20">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3')",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 53, 95, 0.75)" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/60 to-slate-900/80"></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <div className="mb-6">
            <span
              className="inline-block px-5 py-2 border rounded-full text-sm font-medium tracking-wide text-white"
              style={{
                backgroundColor: "#eec218",
                color: "#00355f",
                border: "none",
              }}
            >
              ABOUT US
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal text-white mb-8 leading-tight">
            Passionate About
            <span className="block font-semibold" style={{ color: "#eec218" }}>
              Philippine Adventures
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto font-normal leading-relaxed text-white/95">
            For over a decade, we've been crafting unforgettable experiences and
            sharing the incredible beauty of Cebu with travelers from around the
            world.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: "#eec218" }}
                >
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-4xl md:text-5xl font-normal mb-6"
                style={{ color: "#00355f" }}
              >
                Our Story
              </h2>
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  Explore Cebu was born from a simple passion: sharing the
                  breathtaking beauty and rich culture of the Philippines with
                  visitors from around the world. Founded in 2010 by Maria
                  Santos, a Cebu native with an infectious love for her
                  homeland, our company started as a small family business with
                  just one tour guide and a dream.
                </p>
                <p>
                  What began as weekend island hopping trips for friends and
                  family has grown into one of Cebu's most trusted tour
                  operators. We've guided thousands of travelers through
                  pristine waters, historic landmarks, and hidden gems that only
                  locals know about.
                </p>
                <p>
                  Today, we're proud to employ local guides, support community
                  initiatives, and continue our mission of sustainable tourism
                  that benefits both visitors and the beautiful islands we call
                  home.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600"
                  alt="Beautiful Cebu Islands"
                  className="w-full h-96 object-cover"
                />
              </div>
              <div
                className="absolute -bottom-6 -right-6 w-32 h-32 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: "#eec218" }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#00355f" }}>
                    15+
                  </div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: "#00355f" }}
                  >
                    Years
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-normal mb-4"
              style={{ color: "#00355f" }}
            >
              Mission & Vision
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: "#00355f" }}
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3
                className="text-2xl font-semibold mb-4"
                style={{ color: "#00355f" }}
              >
                Our Mission
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                To create authentic, sustainable, and unforgettable travel
                experiences that showcase the natural beauty and rich culture of
                the Philippines while supporting local communities and
                preserving our environment for future generations.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: "#eec218" }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: "#00355f" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h3
                className="text-2xl font-semibold mb-4"
                style={{ color: "#00355f" }}
              >
                Our Vision
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                To be the premier sustainable tourism company in the Philippines,
                recognized globally for our commitment to excellence,
                environmental stewardship, and authentic cultural experiences
                that connect people with the heart of Filipino hospitality.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-normal mb-4"
              style={{ color: "#00355f" }}
            >
              Our Values
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200 h-full">
                  <div className="mb-4 flex justify-center">{value.icon}</div>
                  <h3
                    className="text-xl font-semibold mb-4"
                    style={{ color: "#00355f" }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-normal">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=600"
                  alt="Sustainable Tourism"
                  className="w-full h-96 object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2
                className="text-4xl md:text-5xl font-normal mb-6"
                style={{ color: "#00355f" }}
              >
                Committed to Sustainability
              </h2>
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  We believe that tourism should leave a positive impact on the
                  places we visit. That's why sustainability isn't just a
                  buzzword for us—it's at the core of everything we do.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: "#eec218" }}
                    >
                      <span style={{ color: "#00355f" }}>🌊</span>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-1"
                        style={{ color: "#00355f" }}
                      >
                        Marine Conservation
                      </h4>
                      <p>
                        We partner with local marine sanctuaries and follow
                        strict guidelines to protect coral reefs and marine
                        life.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: "#eec218" }}
                    >
                      <span style={{ color: "#00355f" }}>👥</span>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-1"
                        style={{ color: "#00355f" }}
                      >
                        Community Support
                      </h4>
                      <p>
                        A portion of our profits goes directly to local
                        community projects and environmental conservation
                        efforts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: "#eec218" }}
                    >
                      <span style={{ color: "#00355f" }}>♻️</span>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-1"
                        style={{ color: "#00355f" }}
                      >
                        Eco-Friendly Practices
                      </h4>
                      <p>
                        From reusable water bottles to biodegradable sunscreen,
                        we promote eco-conscious choices for our travelers.
                      </p>
                    </div>
                  </div>
                </div>

                <p>
                  By choosing us, you're not just booking a tour—you're
                  supporting sustainable tourism that protects the Philippines'
                  natural treasures for generations to come.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200')",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 53, 95, 0.85)" }}
          ></div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-normal mb-8">
            Ready to Discover Cebu?
          </h2>
          <p className="text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Join us for an unforgettable journey through the heart of the
            Philippines. Whether you're seeking adventure, culture, or
            relaxation, we have the perfect experience for you.
          </p>
          <button
            className="px-8 py-4 text-lg rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            style={{ backgroundColor: "#eec218", color: "#00355f" }}
          >
            Explore Tours
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4" style={{ color: '#eec218' }}>Explore Cebu</h3>
            <p className="text-sm text-gray-400">
              Professional tours and transportation services to make your Cebu adventure unforgettable.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tours</a></li>
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Cebu City, Philippines</li>
              <li>+63 917 123 4567</li>
              <li>apcebutnt@gmail.com</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V22H12c5.523 0 10-4.477 10-10z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.01 3.715.051 2.91.124 4.388 1.583 4.596 4.583.071.975.086 1.306.086 3.715s-.015 2.74-.086 3.715c-.208 2.9-1.686 4.368-4.596 4.584-.93.07-1.27.087-3.715.087s-2.785-.017-3.715-.087c-2.91-.21-4.388-1.69-4.596-4.584-.07-.975-.086-1.306-.086-3.715s.016-2.74.086-3.715c.208-2.898 1.686-4.368 4.596-4.584.93-.07 1.27-.086 3.715-.086zm.002 3.033a8.966 8.966 0 100 17.932 8.966 8.966 0 000-17.932zM12 15.111a3.111 3.111 0 110-6.222 3.111 3.111 0 010 6.222z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-500">
          &copy; 2025 Explore Cebu. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// AuthModal Component
const AuthModal = ({
  showAuthModal,
  setShowAuthModal,
  isLogin,
  setIsLogin,
  authLoading,
  handleAuth,
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  middleInitial,
  setMiddleInitial,
  confirmPassword,
  setConfirmPassword,
  resetAuthForm,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!showAuthModal) return null;

  const handleCloseModal = () => {
    setShowAuthModal(false);
    resetAuthForm();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "#00355f" }}>
              {isLogin ? "Sign In" : "Create Account"}
            </h2>
            <button
              onClick={handleCloseModal}
              className="text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      M.I. (Optional)
                    </label>
                    <input
                      type="text"
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value)}
                      maxLength={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="M.I."
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8s3.582-8 8-8c1.675 0 3.245.516 4.575 1.41M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.75 0h.008v.008h-.008V12zm-18 0h-.008v.008h.008V12z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8s3.582-8 8-8c1.675 0 3.245.516 4.575 1.41M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.75 0h.008v.008h-.008V12zm-18 0h-.008v.008h.008V12z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 font-semibold rounded-lg transition-colors"
              style={{
                backgroundColor: authLoading ? "#ccc" : "#00355f",
                color: "white",
              }}
            >
              {authLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium hover:underline"
              style={{ color: "#00355f" }}
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Logout Confirmation Modal Component
const LogoutModal = ({ showLogoutModal, setShowLogoutModal, handleLogout }) => {
  if (!showLogoutModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "#00355f" }}>
            Confirm Logout
          </h2>
          <button
            onClick={() => setShowLogoutModal(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: "#00355f", color: "white" }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// Success Modal Component
const SuccessModal = ({ showSuccessModal, setShowSuccessModal, message }) => {
  if (!showSuccessModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "#00355f" }}>
            Success
          </h2>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowSuccessModal(false)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: "#00355f", color: "white" }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Modal Component
const ErrorModal = ({ showErrorModal, setShowErrorModal, message }) => {
  if (!showErrorModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "#00355f" }}>
            Error
          </h2>
          <button
            onClick={() => setShowErrorModal(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowErrorModal(false)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: "#00355f", color: "white" }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};