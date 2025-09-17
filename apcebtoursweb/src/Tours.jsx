import { useEffect, useState } from "react";
import BookingModal from "./BookingModal";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot } from "react-icons/fa";

function Tours() {
  const { user, setUser } = useAuth(); // Use global user state from AuthContext
  const [loadingUser, setLoadingUser] = useState(true);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    date: "",
    numberOfPeople: 1,
    specialRequests: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);
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
    getUser();
    fetchTours();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setBookingDetails((prev) => ({
          ...prev,
          contactEmail: session?.user?.email || "",
        }));
        setLoadingUser(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setBookingDetails((prev) => ({
        ...prev,
        contactEmail: user?.email || "",
      }));
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchTours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const toursWithImageUrls = data.map((tour) => ({
        ...tour,
        image: getImageUrl(tour.image),
        formattedPrice: `₱${tour.price.toLocaleString()}`,
      }));

      setTours(toursWithImageUrls || []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    const { data } = supabase.storage
      .from("tours")
      .getPublicUrl(imagePath);

    return data.publicUrl;
  };

  const handleBookNow = (tour) => {
    if (!user) {
      setIsLogin(true);
      setShowAuthModal(true);
      return;
    }

    setSelectedTour(tour);
    setBookingDetails({
      date: "",
      numberOfPeople: 1,
      specialRequests: "",
      contactPhone: "",
      contactEmail: user.email || "",
    });
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);

    if (!user) {
      setErrorMessage("You must be logged in to book a tour.");
      setShowErrorModal(true);
      setBookingLoading(false);
      return;
    }

    try {
      const totalPrice = selectedTour.price * bookingDetails.numberOfPeople;

      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            user_id: user.id,
            tour_id: selectedTour.id,
            booking_date: bookingDetails.date,
            number_of_people: bookingDetails.numberOfPeople,
            total_price: totalPrice,
            special_requests: bookingDetails.specialRequests,
            contact_phone: bookingDetails.contactPhone,
            contact_email: bookingDetails.contactEmail,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      setSuccessMessage("Booking successful! We will contact you shortly to confirm.");
      setShowSuccessModal(true);
      setShowBookingModal(false);
    } catch (error) {
      console.error("Booking error:", error);
      setErrorMessage(`Booking failed: ${error.message}`);
      setShowErrorModal(true);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loadingUser) {
    return <div className="p-6">Loading...</div>;
  }

  const tourCategories = [
    {
      icon: "🏝️",
      title: "Island Adventures",
      description: "Explore pristine islands and hidden beaches across the Philippine archipelago.",
      count: `${tours.filter((tour) => tour.type === "regular" && tour.location.toLowerCase().includes("island")).length} Tours`,
    },
    {
      icon: "🏛️",
      title: "Cultural Heritage",
      description: "Discover rich Filipino history and traditional cultural sites.",
      count: `${tours.filter((tour) => tour.location.toLowerCase().includes("city")).length} Tours`,
    },
    {
      icon: "🤿",
      title: "Underwater Experiences",
      description: "Dive into crystal-clear waters and encounter marine life.",
      count: `${tours.filter((tour) => tour.highlights && tour.highlights.some((h) => h.toLowerCase().includes("snorkel") || h.toLowerCase().includes("diving"))).length} Tours`,
    },
    {
      icon: "⛰️",
      title: "Adventure Sports",
      description: "Adrenaline-pumping activities for thrill-seekers.",
      count: `${tours.filter((tour) => tour.highlights && tour.highlights.some((h) => h.toLowerCase().includes("adventure") || h.toLowerCase().includes("canyoneering"))).length} Tours`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogoutClick}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)}
      />

      {/* Booking Modal */}
      <BookingModal
        showBookingModal={showBookingModal}
        setShowBookingModal={setShowBookingModal}
        selectedTour={selectedTour}
        bookingDetails={bookingDetails}
        setBookingDetails={setBookingDetails}
        handleBookingSubmit={handleBookingSubmit}
        bookingLoading={bookingLoading}
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

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3')",
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0, 53, 95, 0.75)" }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/60 to-slate-900/80"></div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <div className="mb-6">
            <span
              className="inline-block px-5 py-2 border rounded-full text-sm font-medium tracking-wide text-white"
              style={{
                backgroundColor: "#eec218",
                color: "#00355f",
                border: "none",
              }}
            >
              TOUR PACKAGES
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal text-white mb-8 leading-tight">
            Explore
            <span
              className="block font-semibold"
              style={{ color: "#eec218" }}
            >
              Cebu
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto font-normal leading-relaxed text-white/95">
            Discover the beauty of the Philippines with our carefully curated tour packages. From pristine beaches to cultural heritage sites.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              className="px-12 py-5 font-semibold text-lg rounded-lg hover:scale-105 transition-all duration-300 shadow-xl text-white border-0"
              style={{
                backgroundColor: "#eec218",
                color: "#00355f",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#d4a617";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#eec218";
              }}
            >
              Browse Tours
            </button>
            <button
              className="px-12 py-5 bg-transparent border-2 border-white/40 text-white font-semibold text-lg rounded-lg hover:bg-white/10 hover:scale-105 transition-all duration-300"
            >
              Custom Package
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/20">
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: "#eec218" }}>
                {tours.length}+
              </div>
              <div className="text-white/90 text-sm font-medium">Tour Options</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: "#eec218" }}>
                1000+
              </div>
              <div className="text-white/90 text-sm font-medium">Happy Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: "#eec218" }}>
                5★
              </div>
              <div className="text-white/90 text-sm font-medium">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: "#eec218" }}>
                Expert
              </div>
              <div className="text-white/90 text-sm font-medium">Local Guides</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tour Categories Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>
              Tour Categories
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Choose from our diverse range of tour experiences tailored to every type of traveler
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tourCategories.map((category, index) => (
              <div key={index} className="text-center group cursor-pointer">
                <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>
                    {category.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-normal mb-4">{category.description}</p>
                  <span
                    className="text-sm font-medium px-3 py-1 rounded-lg"
                    style={{
                      backgroundColor: "#f8f9fa",
                      color: "#00355f",
                    }}
                  >
                    {category.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Tours Grid */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>
              All Tour Packages
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Handpicked experiences that showcase the best of Cebu and surrounding islands
            </p>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#00355f" }}></div>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">Error loading tours: {error}</p>
              <button
                onClick={fetchTours}
                className="px-6 py-3 rounded-lg text-white font-semibold"
                style={{ backgroundColor: "#00355f" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <div key={tour.id} className="group">
                  <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                    <div className="relative overflow-hidden">
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium" style={{ color: "#00355f" }}>
                          ⭐ {tour.rating || 4.5}
                        </span>
                      </div>
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-lg" style={{ backgroundColor: "#eec218" }}>
                        <span className="text-sm font-semibold" style={{ color: "#00355f" }}>
                          {tour.formattedPrice}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold group-hover:opacity-80 transition-opacity" style={{ color: "#00355f" }}>
                          {tour.title}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg font-medium">
                          {tour.duration}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4 leading-relaxed font-normal">{tour.description}</p>

                      <div className="mb-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-600">{tour.location}</span>
                        </div>
                      </div>

                      {tour.highlights && tour.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {tour.highlights.slice(0, 3).map((highlight, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 rounded-lg border"
                              style={{
                                backgroundColor: "#f8f9fa",
                                color: "#00355f",
                                borderColor: "#e9ecef",
                              }}
                            >
                              {highlight}
                            </span>
                          ))}
                          {tour.highlights.length > 3 && (
                            <span
                              className="text-xs px-2 py-1 rounded-lg border text-gray-500"
                              style={{
                                backgroundColor: "#f8f9fa",
                                borderColor: "#e9ecef",
                              }}
                            >
                              +{tour.highlights.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Max Capacity: {tour.max_capacity || 20} people</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${tour.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {tour.available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </div>

                      <button
                        className="w-full py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#00355f" }}
                        disabled={!tour.available}
                        onClick={() => handleBookNow(tour)}
                      >
                        {tour.available ? (user ? "Book Now" : "Sign In to Book") : "Currently Unavailable"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && tours.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-600 text-lg">No tours available at the moment.</p>
              <p className="text-gray-500">Please check back later for new tour packages.</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Book With Us */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>
              Why Book With Us
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Experience the difference with our professional service and local expertise
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>
                  Local Expertise
                </h3>
                <p className="text-gray-600 leading-relaxed font-normal">
                  Born and raised guides who know every hidden gem and secret spot in the Philippines.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>
                  Best Prices
                </h3>
                <p className="text-gray-600 leading-relaxed font-normal">
                  Competitive pricing with no hidden fees. Get the best value for your money.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>
                  Customer Care
                </h3>
                <p className="text-gray-600 leading-relaxed font-normal">
                  24/7 support and personalized service to ensure your trip exceeds expectations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6" style={{ backgroundColor: "#00355f" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-normal text-white mb-6">
            Ready for Your Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-12 font-normal">
            Contact us today to customize your perfect Philippine getaway. Our experienced guides are ready to make your trip unforgettable.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 shadow-lg"
              style={{
                backgroundColor: "#eec218",
                color: "#00355f",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#d4a617";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#eec218";
                e.target.style.transform = "scale(1)";
              }}
            >
              Contact Us Now
            </button>
            <button
              className="px-8 py-4 bg-transparent border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 hover:scale-105 transition-all duration-300"
            >
              View Custom Tours
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6" style={{ backgroundColor: "#001a2e" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold text-white mb-4">
                AP Cebu Tours & Transport
              </h3>
              <p className="text-gray-300 mb-6 leading-relaxed font-normal">
                Your trusted partner for exploring the beautiful islands of Cebu and beyond. We specialize in creating personalized travel experiences that showcase the best of Philippine hospitality.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: "#00355f" }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#tours"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: "#a0aec0" }}
                    onMouseEnter={(e) => {
                      e.target.style.color = "#eec218";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = "#a0aec0";
                    }}
                  >
                    All Tours
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: "#a0aec0" }}
                    onMouseEnter={(e) => {
                      e.target.style.color = "#eec218";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = "#a0aec0";
                    }}
                  >
                    Book Online
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: "#a0aec0" }}
                    onMouseEnter={(e) => {
                      e.target.style.color = "#eec218";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = "#a0aec0";
                    }}
                  >
                    Custom Packages
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: "#a0aec0" }}
                    onMouseEnter={(e) => {
                      e.target.style.color = "#eec218";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = "#a0aec0";
                    }}
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Contact Info</h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "#eec218" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-normal" style={{ color: "#a0aec0" }}>Cebu City, Philippines</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "#eec218" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-normal" style={{ color: "#a0aec0" }}>+63 XXX XXX XXXX</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "#eec218" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-normal" style={{ color: "#a0aec0" }}>info@apcebutours.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400 font-normal">
              © 2025 AP Cebu Tours & Transport. All rights reserved.
            </p>
          </div>
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

export default Tours;