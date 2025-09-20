import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingModal from "./BookingModal";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";

export default function Tours() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTour, setSelectedTour] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: "",
    numberOfPeople: 1,
    specialRequests: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) setBookingDetails((d) => ({ ...d, contactEmail: user.email }));

      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setTours(data.map(t => ({
        ...t,
        image: t.image?.startsWith("http") 
          ? t.image 
          : supabase.storage.from("tours").getPublicUrl(t.image).data.publicUrl,
        formattedPrice: `₱${t.price.toLocaleString()}`
      })));

      setLoading(false);
    };

    init();
  }, []);

  const handleBookNow = (tour) => {
    if (!user) return alert("Please sign in to book.");
    setSelectedTour(tour);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const totalPrice = selectedTour.price * bookingDetails.numberOfPeople;

    const { error } = await supabase.from("bookings").insert([{
      user_id: user.id,
      tour_id: selectedTour.id,
      booking_date: bookingDetails.date,
      number_of_people: bookingDetails.numberOfPeople,
      total_price: totalPrice,
      special_requests: bookingDetails.specialRequests,
      contact_phone: bookingDetails.contactPhone,
      contact_email: bookingDetails.contactEmail,
    }]);

    if (error) return alert(`Booking failed: ${error.message}`);
    alert("Booking successful!");
    setShowBookingModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar user={user} />

      <BookingModal
        showBookingModal={showBookingModal}
        setShowBookingModal={setShowBookingModal}
        selectedTour={selectedTour}
        bookingDetails={bookingDetails}
        setBookingDetails={setBookingDetails}
        handleBookingSubmit={handleBookingSubmit}
      />

      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ backgroundColor: "#00355f" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Discover
            <span className="block" style={{ color: "#eec218" }}>Amazing Tours</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Experience the best of Cebu with our carefully curated tour packages. 
            From pristine beaches to cultural landmarks, create memories that last a lifetime.
          </p>
        </div>
      </section>

      {/* Tours Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#00355f" }}>
              Tour Packages
            </h2>
            <div className="w-24 h-1 mx-auto mb-6" style={{ backgroundColor: "#eec218" }}></div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Choose from our selection of expertly designed tours, each offering unique experiences 
              and unforgettable adventures in the beautiful Philippines.
            </p>
          </div>

          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#00355f" }}></div>
              <p className="mt-4 text-gray-600">Loading amazing tours...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 font-medium">Oops! Something went wrong</p>
                <p className="text-red-500 mt-2">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {tours.map((tour) => (
                <div 
                  key={tour.id} 
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100"
                >
                  <div className="relative overflow-hidden">
                    <div 
                      className="cursor-pointer"
                      onClick={() => navigate(`/tours/${tour.id}`)}
                    >
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span 
                        className="px-3 py-1 text-sm font-semibold text-white rounded-full shadow-lg"
                        style={{ backgroundColor: "#eec218" }}
                      >
                        {tour.duration}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 
                        className="text-xl font-bold mb-2 group-hover:text-blue-700 transition-colors cursor-pointer"
                        style={{ color: "#00355f" }}
                        onClick={() => navigate(`/tours/${tour.id}`)}
                      >
                        {tour.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed line-clamp-3">
                        {tour.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold" style={{ color: "#00355f" }}>
                          {tour.formattedPrice}
                        </span>
                        <span className="text-gray-500 text-sm">per person</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 fill-current" style={{ color: "#eec218" }} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="text-gray-600 text-sm">4.8</span>
                      </div>
                    </div>

                    <button
                      className="w-full py-3 px-6 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                      style={{ backgroundColor: "#00355f" }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#004080"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "#00355f"}
                      onClick={() => handleBookNow(tour)}
                    >
                      <span className="flex items-center justify-center space-x-2">
                        <span>Book Now</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && tours.length === 0 && (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f0f9ff" }}>
                  <svg className="w-12 h-12" style={{ color: "#00355f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: "#00355f" }}>No Tours Available</h3>
                <p className="text-gray-600">Check back soon for exciting new tour packages!</p>
              </div>
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

      {/* Call to Action Section */}
      <section className="bg-gray-200 py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-normal mb-2" style={{ color: '#00355f' }}>
              Ready to Explore?
            </h2>
            <p className="text-lg text-gray-700 font-normal">
              Contact us today to start planning your dream vacation in Cebu.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <button 
              className="px-8 py-4 font-semibold rounded-lg transition-colors duration-300"
              style={{ 
                backgroundColor: '#eec218',
                color: '#00355f'
              }}
            >
              Contact Us
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