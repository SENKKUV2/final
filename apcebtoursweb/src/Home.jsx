import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase";
import { FaPlane, FaUmbrellaBeach, FaBullseye, FaHotel } from 'react-icons/fa';
import { useNavigate, Link } from "react-router-dom";

// Modal Component (from Tours.jsx)
const Modal = ({ show, setShow, title, children, footer, maxWidth = "max-w-md" }) =>
  show && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`bg-white/90 backdrop-blur-md rounded-2xl ${maxWidth} w-full shadow-xl border border-gray-100/50 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between p-6">
          <h2 id="modal-title" className="text-2xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={() => setShow(false)}
            className="text-gray-600 hover:text-gray-800 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 flex justify-end space-x-4">{footer}</div>}
      </div>
    </div>
  );

// SuccessModal Component (from Contact)
const SuccessModal = ({ showSuccessModal, setShowSuccessModal, message }) => (
  <Modal
    show={showSuccessModal}
    setShow={setShowSuccessModal}
    title="Success"
    maxWidth="max-w-sm"
  >
    <p className="text-gray-600 mb-6">{message}</p>
    <div className="flex justify-end">
      <button
        onClick={() => setShowSuccessModal(false)}
        className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
        style={{ backgroundColor: "#00355f" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#004a84")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#00355f")}
      >
        OK
      </button>
    </div>
  </Modal>
);

// TourDetailsModal Component (from Tours.jsx)
const TourDetailsModal = ({
  showTourDetailsModal,
  setShowTourDetailsModal,
  tour,
  handleBookNow,
  user,
  setShowBookingModal,
}) => {
  const [activeImage, setActiveImage] = useState(
    tour?.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3"
  );
  const [activeTab, setActiveTab] = useState("overview");
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
    {
      id: "overview",
      label: "Overview",
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      id: "features",
      label: "Features",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  // Handle button click to close TourDetailsModal and open BookingModal
  const handleBookButtonClick = () => {
    handleBookNow(tour);
    setShowTourDetailsModal(false);
    setShowBookingModal(true);
  };

  return (
    <Modal
      show={showTourDetailsModal}
      setShow={setShowTourDetailsModal}
      title={tour.title}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6" ref={modalRef}>
        {/* Price Badge */}
        <div className="flex justify-start">
          <span
            className="inline-block px-5 py-2 rounded-lg font-semibold text-base"
            style={{ backgroundColor: "#eec218", color: "#00355f" }}
          >
            {tour.formattedPrice}
          </span>
        </div>

        {/* Image Gallery Section */}
        <div>
          {/* Main Image with Loading State */}
          <div className="relative mb-6 group">
            <div
              className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-500 ${
                imageLoading ? "opacity-60" : "opacity-100"
              }`}
            >
              <img
                src={activeImage}
                alt={tour.title}
                className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-102"
                onError={(e) => {
                  console.warn(
                    `Modal image failed to load for tour: ${tour.title}, using fallback`
                  );
                  e.target.src =
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3";
                }}
                onLoad={handleImageLoad}
              />
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                  <div
                    className="animate-spin rounded-full h-10 w-10 border-t-2"
                    style={{ borderColor: "#00355f" }}
                  ></div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Availability Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-md ${
                    tour.available
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {tour.available ? "Available" : "Unavailable"}
                </span>
              </div>

              {/* Capacity Badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-100/50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-3a3 3 0 00-3-3h-1m-2-3a3 3 0 11-6 0m0 0a3 3 0 00-3 3v3h5"
                    />
                  </svg>
                  <span>Max: {tour.max_capacity || 20}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {tour.sub_images?.length > 0 && (
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {/* Main image thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={tour.image}
                  alt="Main"
                  className={`w-16 h-16 object-cover rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                    activeImage === tour.image
                      ? "border-[#eec218] shadow-md"
                      : "border-transparent hover:border-gray-300/50"
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
                    className={`w-16 h-16 object-cover rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                      activeImage === img
                        ? "border-[#eec218] shadow-md"
                        : "border-transparent hover:border-gray-300/50"
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
        <div className="mb-6">
          <div className="flex border-b border-gray-200/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#00355f] text-[#00355f] bg-white/50"
                    : "border-transparent text-gray-600 hover:text-[#00355f] hover:bg-white/30"
                } focus:outline-none focus:ring-2 focus:ring-gray-300/50`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={tab.icon}
                  />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Tour Overview
                </h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  {tour.description ||
                    "Experience an unforgettable journey with our expertly crafted tour package."}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-xl border border-gray-100/50 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-900"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Quick Details
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">
                        {tour.duration}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-gray-900">
                        {tour.formattedPrice}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium text-gray-900">
                        {tour.max_capacity || 20}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/50 p-4 rounded-xl border border-gray-100/50 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-900"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                    Location Info
                  </h4>
                  <p className="text-gray-600 mb-2">Starting Point:</p>
                  <p className="font-medium text-gray-900">{tour.location}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "features" && tour.features?.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                What's Included
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {tour.features.map((feature, i) => {
                  const featureText =
                    typeof feature === "object" && feature.text
                      ? feature.text
                      : typeof feature === "string"
                      ? feature
                      : "Feature information";
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 bg-white/50 rounded-xl border border-gray-100/50 hover:shadow-md hover:border-gray-200/50 transition-all duration-300"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center border border-gray-100/50">
                        <svg
                          className="w-4 h-4 text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-gray-600 text-sm">
                        {featureText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">{tour.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#eec218]">★</span>
            <span className="text-sm text-gray-600">{tour.rating || 4.5}</span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/90 pt-4 pb-6 px-6 border-t border-gray-100/50">
        <button
          className={`w-full py-3 px-6 rounded-lg font-semibold text-base transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#eec218]/50 shadow-lg ${
            tour.available
              ? "bg-[#eec218] text-[#00355f] hover:bg-[#d4a617] hover:shadow-xl"
              : "bg-gray-200 text-gray-600 cursor-not-allowed"
          }`}
          disabled={!tour.available}
          onClick={handleBookButtonClick}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              {tour.available
                ? user
                  ? "Book This Tour Now"
                  : "Sign In to Book Tour"
                : "Currently Unavailable"}
            </span>
          </div>
        </button>
      </div>
    </Modal>
  );
};

function Home({ user, onLoginClick }) {
  const [featuredTours, setFeaturedTours] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showTourDetailsModal, setShowTourDetailsModal] = useState(false);
  const [selectedTourDetails, setSelectedTourDetails] = useState(null);

  const services = [
    {
      icon: FaPlane,
      title: "Airport Transfers",
      description: "Comfortable and reliable transportation from Cebu Airport to your hotel or destination."
    },
    {
      icon: FaUmbrellaBeach,
      title: "Island Tours",
      description: "Expertly guided tours to the most beautiful islands and beaches in the region."
    },
    {
      icon: FaBullseye,
      title: "Custom Packages",
      description: "Tailored itineraries designed around your interests and travel preferences."
    },
    {
      icon: FaHotel,
      title: "Hotel Booking",
      description: "Assistance with accommodation booking at the best rates and locations."
    }
  ];
  const navigate = useNavigate();

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tours')
        .select('id, title, description, price, duration, location, rating, highlights, features, image, sub_images, max_capacity, available, created_at')
        .eq('available', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        throw error;
      }

      const toursWithImageUrls = data.map(tour => ({
        ...tour,
        image: getImageUrl(tour.image),
        sub_images: tour.sub_images?.map(img => getImageUrl(img)) || [],
        features: tour.features?.map(feature =>
          typeof feature === "object" && feature.text ? feature.text : feature
        ) || [],
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
    if (!imagePath) return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3';
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const { data } = supabase.storage
      .from('tours')
      .getPublicUrl(imagePath);
    
    return data.publicUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3';
  };

  const handleBookNow = (tour = null) => {
    if (!user) {
      onLoginClick();
      return;
    }
    
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
      alert('Please select a specific tour to book.');
    }
  };

  const handleImageClick = (e, tour) => {
    e.preventDefault();
    if (!tour) {
      console.error("No tour data provided to handleImageClick");
      return;
    }
    console.log('Image clicked for tour:', tour.title, tour);
    setSelectedTourDetails(tour);
    setShowTourDetailsModal(true);
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

      setSuccessMessage('Booking successful! We will contact you shortly to confirm.');
      setShowSuccessModal(true);
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3')"
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 53, 95, 0.75)' }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/60 to-slate-900/80"></div>
        </div>
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
              onClick={() => navigate("/tours")}
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
                  <div className="text-4xl mb-4">
                    <service.icon className="w-12 h-12 mx-auto text-gray-600 group-hover:text-[#00355f] transition-colors duration-300" />
                  </div>
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
                      <div
                        className="w-full h-56 cursor-pointer"
                        onClick={(e) => handleImageClick(e, tour)}
                      >
                        <img
                          src={tour.image}
                          alt={tour.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg pointer-events-none">
                          <span className="text-sm font-medium" style={{ color: '#00355f' }}>
                            ⭐ {tour.rating || 4.5}
                          </span>
                        </div>
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-lg pointer-events-none" style={{ backgroundColor: '#eec218' }}>
                          <span className="text-sm font-semibold" style={{ color: '#00355f' }}>
                            {tour.formattedPrice}
                          </span>
                        </div>
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
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#004a84')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00355f')}
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
              onClick={() => navigate("/tours")}
              className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 border-2"
              style={{
                backgroundColor: "transparent",
                color: "#00355f",
                borderColor: "#00355f",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#00355f";
                e.target.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#00355f";
              }}
            >
              View All Tours
            </button>
          </div>
        </div>
      </section>
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
            <Link
              to="/contact"
              className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 border-2"
              style={{
                backgroundColor: "transparent",
                color: "#00355f",
                borderColor: "#00355f",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#00355f";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#00355f";
              }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
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
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/tours" className="hover:text-white transition-colors">Tours</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
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
              <a href="https://facebook.com" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V22H12c5.523 0 10-4.477 10-10z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://instagram.com" className="text-gray-400 hover:text-white transition-colors">
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
      <BookingModal
        showBookingModal={showBookingModal}
        setShowBookingModal={setShowBookingModal}
        selectedTour={selectedTour}
        bookingDetails={bookingDetails}
        setBookingDetails={setBookingDetails}
        handleBookingSubmit={handleBookingSubmit}
        bookingLoading={bookingLoading}
      />
      <SuccessModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        message={successMessage}
      />
      <TourDetailsModal
        showTourDetailsModal={showTourDetailsModal}
        setShowTourDetailsModal={setShowTourDetailsModal}
        tour={selectedTourDetails}
        handleBookNow={handleBookNow}
        user={user}
        setShowBookingModal={setShowBookingModal}
      />
    </div>
  );
}

const BookingModal = ({ 
  showBookingModal, 
  setShowBookingModal, 
  selectedTour, 
  bookingDetails, 
  setBookingDetails, 
  handleBookingSubmit, 
  bookingLoading 
}) => (
  <Modal
    show={showBookingModal && !!selectedTour}
    setShow={setShowBookingModal}
    title={`Book ${selectedTour?.title || ''}`}
    maxWidth="max-w-md"
  >
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <p className="text-lg font-semibold" style={{ color: '#00355f' }}>
        Price: {selectedTour?.formattedPrice || ''} per person
      </p>
    </div>
    <form onSubmit={handleBookingSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tour Date</label>
        <input
          type="date"
          value={bookingDetails.date}
          onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })}
          required
          className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
        <input
          type="number"
          value={bookingDetails.numberOfPeople}
          onChange={(e) => setBookingDetails({ ...bookingDetails, numberOfPeople: parseInt(e.target.value) || 1 })}
          required
          min="1"
          className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone Number</label>
        <input
          type="tel"
          value={bookingDetails.contactPhone}
          onChange={(e) => setBookingDetails({ ...bookingDetails, contactPhone: e.target.value })}
          className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
          placeholder="Optional"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
        <textarea
          value={bookingDetails.specialRequests}
          onChange={(e) => setBookingDetails({ ...bookingDetails, specialRequests: e.target.value })}
          className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
          placeholder="Any special requests or needs? (e.g., dietary restrictions, mobility assistance)"
          rows="3"
        ></textarea>
      </div>
      <div className="text-lg font-bold" style={{ color: '#00355f' }}>
        Total Price: ₱{(selectedTour?.price * bookingDetails.numberOfPeople).toLocaleString()}
      </div>
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => setShowBookingModal(false)}
          className="px-5 py-2.5 text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-opacity-70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={bookingLoading}
          className="px-4 py-2.5 font-semibold rounded-lg transition-colors text-white"
          style={{
            backgroundColor: bookingLoading ? '#9ca3af' : '#00355f',
          }}
          onMouseEnter={(e) => !bookingLoading && (e.currentTarget.style.backgroundColor = '#004a84')}
          onMouseLeave={(e) => !bookingLoading && (e.currentTarget.style.backgroundColor = '#00355f')}
        >
          {bookingLoading ? 'Submitting...' : 'Confirm Booking'}
        </button>
      </div>
    </form>
  </Modal>
);

export default Home;