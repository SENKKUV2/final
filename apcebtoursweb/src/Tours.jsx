import { useEffect, useState, useRef } from "react";
import BookingModal from "./BookingModal";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Tours() {
  const { user, setUser } = useAuth();
  const [loadingUser, setLoadingUser] = useState(true);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ date: "", numberOfPeople: 1, specialRequests: "", contactPhone: "", contactEmail: "" });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showTourDetailsModal, setShowTourDetailsModal] = useState(false);
  const [selectedTourDetails, setSelectedTourDetails] = useState(null);
  const navigate = useNavigate();

  // Auth states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "", firstName: "", lastName: "", middleInitial: "", confirmPassword: "" });

  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetAuthForm = () => setAuthForm({ email: "", password: "", firstName: "", lastName: "", middleInitial: "", confirmPassword: "" });

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
        if (error) throw error;
        setSuccessMessage("Login successful!");
        setShowSuccessModal(true);
        setShowAuthModal(false);
        resetAuthForm();
      } else {
        if (authForm.password !== authForm.confirmPassword) throw new Error("Passwords do not match");
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { first_name: authForm.firstName, last_name: authForm.lastName, middle_initial: authForm.middleInitial } }
        });
        if (error) throw error;
        setSuccessMessage("Registration successful! Please check your email to verify your account.");
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

  const handleLoginClick = () => { setIsLogin(true); setShowAuthModal(true); };
  const handleSignupClick = () => { setIsLogin(false); setShowAuthModal(true); };

  useEffect(() => {
    getUser();
    fetchTours();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setBookingDetails(prev => ({ ...prev, contactEmail: session?.user?.email || "" }));
      setLoadingUser(false);
    });
    return () => subscription.unsubscribe();
  }, [setUser]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setBookingDetails(prev => ({ ...prev, contactEmail: user?.email || "" }));
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
        .select("id, title, description, price, duration, location, rating, highlights, features, image, sub_images, max_capacity, available, created_at")
        .eq("available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const toursWithImageUrls = data.map(tour => {
        console.log("Processing tour:", tour.title, "Image:", tour.image, "Sub-images:", tour.sub_images, "Features:", tour.features); // Debug log
        return {
          ...tour,
          image: getImageUrl(tour.image),
          sub_images: tour.sub_images?.map(img => getImageUrl(img)) || [],
          features: tour.features?.map(feature => 
            typeof feature === 'object' && feature.text ? feature.text : feature
          ) || [],
          formattedPrice: `₱${tour.price.toLocaleString()}`
        };
      });
      console.log("Fetched tours:", toursWithImageUrls); // Debug log
      setTours(toursWithImageUrls || []);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.warn("Image path is empty or null, using fallback");
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
    }
    if (imagePath.startsWith("http")) {
      console.log("Using direct URL:", imagePath);
      return imagePath;
    }
    try {
      const { data } = supabase.storage.from("tours").getPublicUrl(imagePath);
      console.log("Generated public URL for", imagePath, ":", data.publicUrl); // Debug log
      return data.publicUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
    } catch (err) {
      console.error("Error generating image URL:", err);
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
    }
  };

  const handleBookNow = (tour) => {
    if (!user) { handleLoginClick(); return; }
    setSelectedTour(tour);
    setBookingDetails({ date: "", numberOfPeople: 1, specialRequests: "", contactPhone: "", contactEmail: user.email || "" });
    setShowBookingModal(true);
  };

  const handleImageClick = (tour) => {
    if (!tour) {
      console.error("No tour data provided to handleImageClick");
      return;
    }
    console.log("Image clicked for tour:", tour.title, tour); // Debug log
    setSelectedTourDetails(tour);
    setShowTourDetailsModal(true);
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
      const { data, error } = await supabase.from("bookings").insert([{
        user_id: user.id,
        tour_id: selectedTour.id,
        booking_date: bookingDetails.date,
        number_of_people: bookingDetails.numberOfPeople,
        total_price: totalPrice,
        special_requests: bookingDetails.specialRequests,
        contact_phone: bookingDetails.contactPhone,
        contact_email: bookingDetails.contactEmail,
      }]).select();
      if (error) throw error;
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

  if (loadingUser) return <div className="p-6">Loading...</div>;

  const tourCategories = [
    { icon: "🏝️", title: "Island Adventures", description: "Explore pristine islands and hidden beaches across the Philippine archipelago.", count: `${tours.filter(t => t.type === "regular" && t.location.toLowerCase().includes("island")).length} Tours` },
    { icon: "🏛️", title: "Cultural Heritage", description: "Discover rich Filipino history and traditional cultural sites.", count: `${tours.filter(t => t.location.toLowerCase().includes("city")).length} Tours` },
    { icon: "🤿", title: "Underwater Experiences", description: "Dive into crystal-clear waters and encounter marine life.", count: `${tours.filter(t => t.highlights?.some(h => h.toLowerCase().includes("snorkel") || h.toLowerCase().includes("diving"))).length} Tours` },
    { icon: "⛰️", title: "Adventure Sports", description: "Adrenaline-pumping activities for thrill-seekers.", count: `${tours.filter(t => t.highlights?.some(h => h.toLowerCase().includes("adventure") || h.toLowerCase().includes("canyoneering"))).length} Tours` }
  ];

  const stats = [
    { value: `${tours.length}+`, label: "Tour Options" },
    { value: "1000+", label: "Happy Travelers" },
    { value: "5★", label: "Average Rating" },
    { value: "Expert", label: "Local Guides" }
  ];

  const whyBookItems = [
    { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", title: "Local Expertise", desc: "Born and raised guides who know every hidden gem and secret spot in the Philippines." },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "Best Prices", desc: "Competitive pricing with no hidden fees. Get the best value for your money." },
    { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", title: "Customer Care", desc: "24/7 support and personalized service to ensure your trip exceeds expectations." }
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Navbar user={user} onLogout={() => setShowLogoutModal(true)} onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)} />
      
      <BookingModal showBookingModal={showBookingModal} setShowBookingModal={setShowBookingModal} selectedTour={selectedTour} bookingDetails={bookingDetails} setBookingDetails={setBookingDetails} handleBookingSubmit={handleBookingSubmit} bookingLoading={bookingLoading} />
      <TourDetailsModal showTourDetailsModal={showTourDetailsModal} setShowTourDetailsModal={setShowTourDetailsModal} tour={selectedTourDetails} handleBookNow={handleBookNow} user={user} />
      <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />
      <button onClick={() => setIsChatbotOpen(!isChatbotOpen)} className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] transition-colors z-40"><FaRobot size={24} /></button>

      <Modals showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} isLogin={isLogin} setIsLogin={setIsLogin} authLoading={authLoading} handleAuth={handleAuth} authForm={authForm} setAuthForm={setAuthForm} resetAuthForm={resetAuthForm} 
              showLogoutModal={showLogoutModal} setShowLogoutModal={setShowLogoutModal} handleLogout={handleLogout}
              showSuccessModal={showSuccessModal} setShowSuccessModal={setShowSuccessModal} successMessage={successMessage}
              showErrorModal={showErrorModal} setShowErrorModal={setShowErrorModal} errorMessage={errorMessage} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3')" }}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0, 53, 95, 0.75)" }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/60 to-slate-900/80"></div>
        </div>
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <span className="inline-block px-5 py-2 border rounded-full text-sm font-medium tracking-wide text-white" style={{ backgroundColor: "#eec218", color: "#00355f", border: "none" }}>TOUR PACKAGES</span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal text-white mb-8 leading-tight">
            Explore<span className="block font-semibold" style={{ color: "#eec218" }}>Cebu</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto font-normal leading-relaxed text-white/95">Discover the beauty of the Philippines with our carefully curated tour packages. From pristine beaches to cultural heritage sites.</p>
          
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/20">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-semibold" style={{ color: "#eec218" }}>{stat.value}</div>
                <div className="text-white/90 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Tours Grid */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>All Tour Packages</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">Handpicked experiences that showcase the best of Cebu and surrounding islands</p>
          </div>
          {loading && <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#00355f" }}></div></div>}
          {error && <div className="text-center py-20"><p className="text-red-600 mb-4">Error loading tours: {error}</p><button onClick={fetchTours} className="px-6 py-3 rounded-lg text-white font-semibold" style={{ backgroundColor: "#00355f" }}>Try Again</button></div>}
          {!loading && !error && (
            <>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {tours.map(tour => (
                  <div key={tour.id} className="group">
                    <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                      <div className="relative overflow-hidden">
                        <img 
                          src={tour.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3"} 
                          alt={tour.title || "Tour Image"} 
                          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" 
                          onError={e => {
                            console.warn(`Image failed to load for tour: ${tour.title}, using fallback`);
                            e.target.src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
                          }} 
                          onClick={() => handleImageClick(tour)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg pointer-events-none"><span className="text-sm font-medium" style={{ color: "#00355f" }}>⭐ {tour.rating || 4.5}</span></div>
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-lg pointer-events-none" style={{ backgroundColor: "#eec218" }}><span className="text-sm font-semibold" style={{ color: "#00355f" }}>{tour.formattedPrice}</span></div>
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-semibold group-hover:opacity-80 transition-opacity" style={{ color: "#00355f" }}>{tour.title}</h3>
                          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg font-medium">{tour.duration}</span>
                        </div>
                        <p className="text-gray-600 mb-4 leading-relaxed font-normal">{tour.description}</p>
                        <div className="mb-4">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-600">{tour.location}</span>
                          </div>
                        </div>
                        {tour.highlights?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {tour.highlights.slice(0, 3).map((h, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-lg border" style={{ backgroundColor: "#f8f9fa", color: "#00355f", borderColor: "#e9ecef" }}>{h}</span>
                            ))}
                            {tour.highlights.length > 3 && <span className="text-xs px-2 py-1 rounded-lg border text-gray-500" style={{ backgroundColor: "#f8f9fa", borderColor: "#e9ecef" }}>+{tour.highlights.length - 3} more</span>}
                          </div>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Max Capacity: {tour.max_capacity || 20} people</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${tour.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {tour.available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                        </div>
                        <button className="w-full py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: "#00355f" }} disabled={!tour.available} onClick={() => handleBookNow(tour)}>
                          {tour.available ? (user ? "Book Now" : "Sign In to Book") : "Currently Unavailable"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!loading && !error && tours.length === 0 && <div className="text-center py-20"><p className="text-gray-600 text-lg">No tours available at the moment.</p><p className="text-gray-500">Please check back later for new tour packages.</p></div>}
            </>
          )}
        </div>
      </section>

            {/* Tour Categories */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>Tour Categories</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">Choose from our diverse range of tour experiences tailored to every type of traveler</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tourCategories.map((category, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>{category.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-normal mb-4">{category.description}</p>
                  <span className="text-sm font-medium px-3 py-1 rounded-lg" style={{ backgroundColor: "#f8f9fa", color: "#00355f" }}>{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Book With Us */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: "#00355f" }}>Why Book With Us</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">Experience the difference with our professional service and local expertise</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {whyBookItems.map((item, i) => (
              <div key={i} className="text-center group">
                <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: "#00355f" }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: "#00355f" }}>{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6" style={{ backgroundColor: "#00355f" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-normal text-white mb-6">Ready for Your Adventure?</h2>
          <p className="text-xl text-white/90 mb-12 font-normal">Contact us today to customize your perfect Philippine getaway. Our experienced guides are ready to make your trip unforgettable.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
      <button
        onClick={() => navigate("/contact")}
        className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 shadow-lg"
        style={{ backgroundColor: "#eec218", color: "#00355f" }}
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
    </div>
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
              <li>info@explorecebu.com</li>
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

// Combined Modals Component
const Modals = ({ showAuthModal, setShowAuthModal, isLogin, setIsLogin, authLoading, handleAuth, authForm, setAuthForm, resetAuthForm, showLogoutModal, setShowLogoutModal, handleLogout, showSuccessModal, setShowSuccessModal, successMessage, showErrorModal, setShowErrorModal, errorMessage }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const ModalBase = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className={`bg-white rounded-xl ${title.includes("Auth") ? "max-w-md w-full max-h-[90vh] overflow-y-auto" : "max-w-sm w-full"} p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "#00355f" }}>{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );

  if (!showAuthModal && !showLogoutModal && !showSuccessModal && !showErrorModal) return null;

  const handleCloseAuth = () => {
    setShowAuthModal(false);
    resetAuthForm();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const PasswordInput = ({ value, onChange, placeholder, show, setShow }) => (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={placeholder} minLength={6} />
      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700" aria-label="Toggle password visibility">
        {show ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8s3.582-8 8-8c1.675 0 3.245.516 4.575 1.41M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.75 0h.008v.008h-.008V12zm-18 0h-.008v.008h.008V12z" /></svg> : 
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
      </button>
    </div>
  );

  return (
    <>
      {showAuthModal && (
        <ModalBase title={isLogin ? "Sign In" : "Create Account"} onClose={handleCloseAuth}>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" value={authForm.firstName} onChange={e => setAuthForm({...authForm, firstName: e.target.value})} required={!isLogin} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="First Name" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" value={authForm.lastName} onChange={e => setAuthForm({...authForm, lastName: e.target.value})} required={!isLogin} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Last Name" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">M.I. (Optional)</label><input type="text" value={authForm.middleInitial} onChange={e => setAuthForm({...authForm, middleInitial: e.target.value})} maxLength={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="M.I." /></div>
              </div>
            )}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><PasswordInput value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} placeholder="Enter your password" show={showPassword} setShow={setShowPassword} /></div>
            {!isLogin && <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><PasswordInput value={authForm.confirmPassword} onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})} placeholder="Confirm your password" show={showConfirmPassword} setShow={setShowConfirmPassword} /></div>}
            <button type="submit" disabled={authLoading} className="w-full py-3 font-semibold rounded-lg transition-colors" style={{ backgroundColor: authLoading ? "#ccc" : "#00355f", color: "white" }}>
              {authLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
          <div className="mt-4 text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium hover:underline" style={{ color: "#00355f" }}>{isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}</button></div>
        </ModalBase>
      )}
      {showLogoutModal && (
        <ModalBase title="Confirm Logout" onClose={() => setShowLogoutModal(false)}>
          <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
          <div className="flex justify-end space-x-4">
            <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg">Cancel</button>
            <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: "#00355f", color: "white" }}>Logout</button>
          </div>
        </ModalBase>
      )}
      {showSuccessModal && (
        <ModalBase title="Success" onClose={() => setShowSuccessModal(false)}>
          <p className="text-gray-600 mb-6">{successMessage}</p>
          <div className="flex justify-end"><button onClick={() => setShowSuccessModal(false)} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: "#00355f", color: "white" }}>OK</button></div>
        </ModalBase>
      )}
      {showErrorModal && (
        <ModalBase title="Error" onClose={() => setShowErrorModal(false)}>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="flex justify-end"><button onClick={() => setShowErrorModal(false)} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: "#00355f", color: "white" }}>OK</button></div>
        </ModalBase>
      )}
    </>
  );
};

// Tour Details Modal Component
// Tour Details Modal Component with Enhanced UI
const TourDetailsModal = ({ showTourDetailsModal, setShowTourDetailsModal, tour, handleBookNow, user }) => {
  const [activeImage, setActiveImage] = useState(tour?.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3");
  const [activeTab, setActiveTab] = useState('overview');
  const [imageLoading, setImageLoading] = useState(false);
  const modalRef = useRef(null);

  // Smooth scroll effect for modal content
  useEffect(() => {
    if (modalRef.current && showTourDetailsModal) {
      modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showTourDetailsModal]);

  // Reset active image when tour changes
  useEffect(() => {
    if (tour?.image) {
      setActiveImage(tour.image);
    }
  }, [tour]);

  if (!showTourDetailsModal || !tour) return null;

  // Handle image click to update main image
  const handleSubImageClick = (img) => {
    if (img && img !== activeImage) {
      setImageLoading(true);
      setActiveImage(img);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'features', label: 'Features', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6 animate-fadeIn"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      onClick={() => setShowTourDetailsModal(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl transform animate-slideUp"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Enhanced Gradient Background */}
        <div className="relative bg-gradient-to-r from-[#00355f] via-[#004a7c] to-[#00355f] px-6 py-5 sm:px-8 sm:py-6 border-b border-[#6b7280]/20">
          <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
            <div>
              <h2 id="tour-modal-title" className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 tracking-tight leading-tight">
                {tour.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-white/90 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{tour.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#eec218]">★</span>
                  <span>{tour.rating || 4.5}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowTourDetailsModal(false)}
              className="bg-white text-[#00355f] px-3 py-2 rounded-full hover:bg-[#f9fafb] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6b7280]"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Price Badge */}
        <div className="absolute -bottom-5 left-6 sm:left-8">
          <div className="bg-[#eec218] text-[#00355f] px-5 sm:px-7 py-2 sm:py-3 rounded-xl font-semibold text-base sm:text-lg shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300">
            {tour.formattedPrice}
          </div>
        </div>

        {/* Content Container */}
        <div className="overflow-y-auto max-h-[calc(90vh-136px)]" ref={modalRef}>
          <div className="p-6 sm:p-8 pt-10 sm:pt-12">
            {/* Image Gallery Section */}
            <div className="mb-8">
              {/* Main Image with Loading State */}
              <div className="relative mb-6 group">
                <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-500 ${imageLoading ? 'opacity-60' : 'opacity-100'}`}>
                  <img
                    src={activeImage}
                    alt={tour.title}
                    className="w-full h-80 sm:h-96 object-cover transition-transform duration-500 group-hover:scale-102"
                    onError={(e) => {
                      console.warn(`Modal image failed to load for tour: ${tour.title}, using fallback`);
                      e.target.src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
                    }}
                    onLoad={handleImageLoad}
                  />
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#00355f]"></div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-md ${
                      tour.available 
                        ? "bg-green-500 text-white" 
                        : "bg-red-500 text-white"
                    }`}>
                      {tour.available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Capacity Badge */}
                  <div className="absolute bottom-4 left-4 bg-[#f9fafb] backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-[#6b7280]/20">
                    <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-3a3 3 0 00-3-3h-1m-2-3a3 3 0 11-6 0m0 0a3 3 0 00-3 3v3h5" />
                      </svg>
                      <span>Max: {tour.max_capacity || 20}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {tour.sub_images?.length > 0 && (
                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-2 scrollbar-thin scrollbar-thumb-[#6b7280]/50 scrollbar-track-[#f9fafb]">
                  {/* Main image thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={tour.image}
                      alt="Main"
                      className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                        activeImage === tour.image ? "border-[#eec218] shadow-md" : "border-transparent hover:border-[#6b7280]/30"
                      }`}
                      onClick={() => handleSubImageClick(tour.image)}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80?text=Main";
                      }}
                    />
                  </div>
                  
                  {/* Sub-image thumbnails */}
                  {tour.sub_images.map((img, i) => (
                    <div key={i} className="flex-shrink-0">
                      <img
                        src={img || "https://via.placeholder.com/80?text=Image"}
                        alt={`Gallery ${i + 1}`}
                        className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                          activeImage === img ? "border-[#eec218] shadow-md" : "border-transparent hover:border-[#6b7280]/30"
                        }`}
                        onClick={() => handleSubImageClick(img)}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/80?text=Error";
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="mb-6 sm:mb-8">
              <div className="flex border-b border-[#6b7280]/20">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 font-medium text-sm sm:text-base transition-all duration-300 border-b-2 ${
                      activeTab === tab.id
                        ? "border-[#00355f] text-[#00355f] bg-[#f9fafb]"
                        : "border-transparent text-[#6b7280] hover:text-[#00355f] hover:bg-[#f9fafb]/50"
                    } focus:outline-none focus:ring-2 focus:ring-[#6b7280]/50`}
                  >
                    <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
              {activeTab === 'overview' && (
                <div className="animate-fadeIn space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-[#00355f] mb-4">Tour Overview</h3>
                    <p className="text-[#6b7280] leading-relaxed text-base sm:text-lg">
                      {tour.description || "Experience an unforgettable journey with our expertly crafted tour package."}
                    </p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-[#f9fafb] p-4 sm:p-6 rounded-xl border border-[#6b7280]/20 shadow-sm">
                      <h4 className="font-semibold text-[#00355f] mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-[#00355f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Quick Details
                      </h4>
                      <ul className="space-y-2 text-sm sm:text-base">
                        <li className="flex justify-between">
                          <span className="text-[#6b7280]">Duration:</span>
                          <span className="font-medium text-[#00355f]">{tour.duration}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-[#6b7280]">Price:</span>
                          <span className="font-medium text-[#00355f]">{tour.formattedPrice}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-[#6b7280]">Capacity:</span>
                          <span className="font-medium text-[#00355f]">{tour.max_capacity || 20}</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-[#f9fafb] p-4 sm:p-6 rounded-xl border border-[#6b7280]/20 shadow-sm">
                      <h4 className="font-semibold text-[#00355f] mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-[#eec218]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Location Info
                      </h4>
                      <p className="text-[#6b7280] mb-2">Starting Point:</p>
                      <p className="font-medium text-[#00355f]">{tour.location}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'highlights' && tour.highlights?.length > 0 && (
                <div className="animate-fadeIn">
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#00355f] mb-4">Tour Highlights</h3>
                  <div className="grid gap-4">
                    {tour.highlights.map((highlight, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-[#f9fafb] rounded-xl border border-[#6b7280]/20 hover:shadow-md transition-shadow duration-300">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-[#6b7280] text-sm sm:text-base">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'features' && tour.features?.length > 0 && (
                <div className="animate-fadeIn">
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#00355f] mb-4">What's Included</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tour.features.map((feature, i) => {
                      const featureText = typeof feature === 'object' && feature.text 
                        ? feature.text 
                        : typeof feature === 'string' 
                        ? feature 
                        : 'Feature information';
                      
                      return (
                        <div key={i} className="flex items-start gap-3 p-4 bg-[#f9fafb] rounded-xl border border-[#6b7280]/20 hover:shadow-md hover:border-[#00355f]/20 transition-all duration-300">
                          <div className="flex-shrink-0 w-6 h-6 bg-[#f9fafb] rounded-full flex items-center justify-center border border-[#00355f]">
                            <svg className="w-4 h-4 text-[#00355f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-[#6b7280] text-sm sm:text-base">{featureText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="sticky  bottom-0 bg-white pt-4 pb-6 sm:pb-8 px-6 sm:px-8 border-t border-[#6b7280]/20">
              <button
                className={`w-full  py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/50 ${
                  tour.available
                    ? "bg-[#002b4c] text-white hover:bg-[#002b4c] hover:shadow-lg"
                    : "bg-[#f9fafb] text-[#6b7280] cursor-not-allowed"
                }`}
                disabled={!tour.available}
                onClick={() => handleBookNow(tour)}
              >
                <div className="flex items-center justify-center gap-2 ">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{tour.available ? (user ? "Book This Tour Now" : "Sign In to Book Tour") : "Currently Unavailable"}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-thumb-[#6b7280]/50::-webkit-scrollbar-thumb {
          background-color: rgba(107, 114, 128, 0.5);
          border-radius: 6px;
        }
        
        .scrollbar-track-[#f9fafb]::-webkit-scrollbar-track {
          background-color: #f9fafb;
          border-radius: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
      `}</style>
    </div>
  );
};
export default Tours;