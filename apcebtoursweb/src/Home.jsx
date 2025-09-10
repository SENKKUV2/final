// Home.js
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function Home({ user, onLoginClick }) {
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    numberOfPeople: 1,
    specialRequests: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  const featuredContent = [
    {
      id: 1,
      type: "Travel Guide",
      title: "Best Time to Visit Cebu",
      description: "Essential information about weather, seasons, and peak travel times for your perfect Cebu vacation.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
      readTime: "5 min read"
    },
    {
      id: 2,
      type: "Local Tips",
      title: "Filipino Cuisine Must-Try",
      description: "Discover authentic local dishes and the best restaurants to experience Philippine flavors.",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
      readTime: "7 min read"
    },
    {
      id: 3,
      type: "Adventure",
      title: "Safety Tips for Island Hopping",
      description: "Important safety guidelines and what to expect during your island hopping adventures.",
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400",
      readTime: "4 min read"
    },
    {
      id: 4,
      type: "Culture",
      title: "Philippine Festivals & Events",
      description: "Plan your visit around vibrant local festivals and cultural celebrations throughout the year.",
      image: "https://images.unsplash.com/photo-1533094602577-198d32995651?w=400",
      readTime: "6 min read"
    }
  ];

  const services = [
    {
      icon: "🚐",
      title: "Airport Transfers",
      description: "Comfortable and reliable transportation from Cebu Airport to your hotel or destination."
    },
    {
      icon: "🏝️",
      title: "Island Tours",
      description: "Expertly guided tours to the most beautiful islands and beaches in the region."
    },
    {
      icon: "🎯",
      title: "Custom Packages",
      description: "Tailored itineraries designed around your interests and travel preferences."
    },
    {
      icon: "🏨",
      title: "Hotel Booking",
      description: "Assistance with accommodation booking at the best rates and locations."
    }
  ];

  // Fetch tours from Supabase
  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        throw error;
      }

      // Convert image filenames to full URLs from storage
      const toursWithImageUrls = data.map(tour => ({
        ...tour,
        image: getImageUrl(tour.image),
        formattedPrice: `₱${tour.price.toLocaleString()}`
      }));

      setFeaturedTours(toursWithImageUrls || []);
    } catch (error) {
      console.error('Error fetching tours:', error);
      setFeaturedTours([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const { data } = supabase.storage
      .from('tours')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  const handleBookNow = (tour = null) => {
    if (!user) {
      // Trigger the global auth modal
      onLoginClick();
      return;
    }
    
    // If user is logged in, show the booking modal
    if (tour) {
      setSelectedTour(tour);
      setBookingDetails({
        date: '',
        numberOfPeople: 1,
        specialRequests: '',
        contactPhone: '',
        contactEmail: user.email || '',
      });
      setShowBookingModal(true);
    } else {
      // General booking from hero section
      alert('Please select a specific tour to book.');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);

    if (!user) {
      alert("You must be logged in to book a tour.");
      setBookingLoading(false);
      return;
    }

    try {
      const totalPrice = selectedTour.price * bookingDetails.numberOfPeople;
      
      const { data, error } = await supabase
        .from('bookings')
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
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      alert('Booking successful! We will contact you shortly to confirm.');
      setShowBookingModal(false);
    } catch (error) {
      console.error('Booking error:', error);
      alert(`Booking failed: ${error.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3')"
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 53, 95, 0.75)' }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/60 to-slate-900/80"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <div className="mb-6">
            <span 
              className="inline-block px-5 py-2 border rounded-full text-sm font-medium tracking-wide text-white"
              style={{ 
                backgroundColor: '#eec218', 
                color: '#00355f',
                border: 'none'
              }}
            >
              DISCOVER THE PHILIPPINES
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal text-white mb-8 leading-tight">
            Explore Cebu's
            <span 
              className="block font-semibold"
              style={{ color: '#eec218' }}
            >
              Hidden Paradise
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto font-normal leading-relaxed text-white/95">
            Professional tours and transportation services that showcase the breathtaking beauty of Cebu Islands. 
            From pristine beaches to cultural treasures, create memories that last a lifetime.
          </p>
          
          <div className="flex justify-center items-center">
            <button 
              onClick={() => handleBookNow()}
              className="px-12 py-5 font-semibold text-lg rounded-lg hover:scale-105 transition-all duration-300 shadow-xl text-white border-0"
              style={{ 
                backgroundColor: '#eec218',
                color: '#00355f'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#d4a617';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#eec218';
              }}
            >
              Book Now
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/20">
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: '#eec218' }}>1000+</div>
              <div className="text-white/90 text-sm font-medium">Happy Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: '#eec218' }}>15+</div>
              <div className="text-white/90 text-sm font-medium">Tour Packages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: '#eec218' }}>5★</div>
              <div className="text-white/90 text-sm font-medium">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold" style={{ color: '#eec218' }}>24/7</div>
              <div className="text-white/90 text-sm font-medium">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: '#00355f' }}>
              Our Services
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Comprehensive travel solutions for your perfect Philippine adventure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: '#00355f' }}>
                    {service.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-normal">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tours */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: '#00355f' }}>
              Featured Tours
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Handpicked experiences that showcase the best of Cebu and surrounding islands
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-lg text-gray-600">Loading tours...</div>
            </div>
          ) : featuredTours.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-gray-600 mb-4">No tours available at the moment.</p>
              <p className="text-gray-500">Please check back later or contact us directly.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredTours.map((tour) => (
                <div key={tour.id} className="group">
                  <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                    <div className="relative overflow-hidden">
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium" style={{ color: '#00355f' }}>
                          ⭐ {tour.rating}
                        </span>
                      </div>
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-lg" style={{ backgroundColor: '#eec218' }}>
                        <span className="text-sm font-semibold" style={{ color: '#00355f' }}>
                          {tour.formattedPrice}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold group-hover:opacity-80 transition-opacity" style={{ color: '#00355f' }}>
                          {tour.title}
                        </h3>
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg font-medium">
                          {tour.duration}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed font-normal">
                        {tour.description}
                      </p>

                      {tour.highlights && tour.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {tour.highlights.map((highlight, index) => (
                            <span 
                              key={index} 
                              className="text-xs px-2 py-1 rounded-lg border"
                              style={{ 
                                backgroundColor: '#f8f9fa',
                                color: '#00355f',
                                borderColor: '#e9ecef'
                              }}
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => handleBookNow(tour)}
                        className="w-full py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300"
                        style={{ backgroundColor: '#00355f' }}
                      >
                        {user ? 'Book Now' : 'Sign In to Book'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <button 
              className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 border-2"
              style={{ 
                backgroundColor: 'transparent',
                color: '#00355f',
                borderColor: '#00355f'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#00355f';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#00355f';
              }}
            >
              View All Tours
            </button>
          </div>
        </div>
      </section>

      {/* Featured Content Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: '#00355f' }}>
              Travel Insights
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-normal">
              Expert guides and local insights to help you make the most of your Philippine adventure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredContent.map((content) => (
              <article key={content.id} className="group cursor-pointer">
                <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                  <div className="relative overflow-hidden">
                    <img
                      src={content.image}
                      alt={content.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div 
                      className="absolute top-3 left-3 text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ 
                        backgroundColor: '#00355f',
                        color: 'white'
                      }}
                    >
                      {content.type}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-3 group-hover:opacity-80 transition-opacity" style={{ color: '#00355f' }}>
                      {content.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 font-normal">
                      {content.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{content.readTime}</span>
                      <span 
                        className="text-sm font-medium group-hover:translate-x-1 transition-transform"
                        style={{ color: '#00355f' }}
                      >
                        Read More →
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal mb-4" style={{ color: '#00355f' }}>
              Why Choose Us
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
                  style={{ backgroundColor: '#00355f' }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#00355f' }}>
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
                  style={{ backgroundColor: '#00355f' }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m-6 4h6m2 2h4a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#00355f' }}>
                  Customized Itineraries
                </h3>
                <p className="text-gray-600 leading-relaxed font-normal">
                  Tailor-made tours to fit your interests, pace, and budget for a truly personal experience.
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: '#00355f' }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#00355f' }}>
                  24/7 Support
                </h3>
                <p className="text-gray-600 leading-relaxed font-normal">
                  Our team is available around the clock to assist you with any questions or needs.
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
    </div>
  );
}

// Booking Modal Component
const BookingModal = ({ 
  showBookingModal, 
  setShowBookingModal, 
  selectedTour, 
  bookingDetails, 
  setBookingDetails, 
  handleBookingSubmit, 
  bookingLoading 
}) => {
  if (!showBookingModal || !selectedTour) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#00355f' }}>
              Book {selectedTour.title}
            </h2>
            <button
              onClick={() => setShowBookingModal(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="text-lg font-semibold" style={{ color: '#00355f' }}>
              Price: {selectedTour.formattedPrice} per person
            </p>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tour Date
              </label>
              <input
                type="date"
                value={bookingDetails.date}
                onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of People
              </label>
              <input
                type="number"
                value={bookingDetails.numberOfPeople}
                onChange={(e) => setBookingDetails({ ...bookingDetails, numberOfPeople: parseInt(e.target.value) || 1 })}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={bookingDetails.contactPhone}
                onChange={(e) => setBookingDetails({ ...bookingDetails, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <textarea
                value={bookingDetails.specialRequests}
                onChange={(e) => setBookingDetails({ ...bookingDetails, specialRequests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special requests or needs? (e.g., dietary restrictions, mobility assistance)"
                rows="3"
              ></textarea>
            </div>

            <div className="text-lg font-bold" style={{ color: '#00355f' }}>
              Total Price: ₱{(selectedTour.price * bookingDetails.numberOfPeople).toLocaleString()}
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full py-3 font-semibold rounded-lg transition-colors"
              style={{
                backgroundColor: bookingLoading ? '#ccc' : '#00355f',
                color: 'white'
              }}
            >
              {bookingLoading ? 'Submitting...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home;