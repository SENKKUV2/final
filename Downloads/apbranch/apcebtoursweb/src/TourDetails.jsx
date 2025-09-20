import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import BookingModal from "./BookingModal";

function TourDetails({ onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const [bookingDetails, setBookingDetails] = useState({
    date: "",
    numberOfPeople: 1,
    specialRequests: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData?.user || null);
        if (userData?.user?.email) {
          setBookingDetails((prev) => ({
            ...prev,
            contactEmail: userData.user.email,
          }));
        }

        const { data, error } = await supabase
          .from("tours")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setTour(data);
      } catch (err) {
        setError("Failed to load tour details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [id]);

  const handleBookNow = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowBookingModal(true);
  };

  const handlePromptSignIn = () => {
    setShowLoginPrompt(false);
    if (onLoginClick) onLoginClick();
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div
            className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-t-2"
            style={{ borderColor: "#00355f" }}
          ></div>
          <h3
            className="mt-6 text-xl font-semibold"
            style={{ color: "#00355f" }}
          >
            Loading Tour Details
          </h3>
          <p className="text-gray-600 mt-2">
            Please wait while we fetch the amazing details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen pt-24 px-6">
        <div className="max-w-6xl mx-auto text-center py-20">
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            {error || "Tour not found"}
          </h3>
          <button
            onClick={() => navigate("/tours")}
            className="px-6 py-3 rounded-lg font-semibold"
            style={{ backgroundColor: "#00355f", color: "white" }}
          >
            Browse All Tours
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Booking Modal */}
      <BookingModal
        showBookingModal={showBookingModal}
        setShowBookingModal={setShowBookingModal}
        selectedTour={tour}
        bookingDetails={bookingDetails}
        setBookingDetails={setBookingDetails}
        handleBookingSubmit={() => {}}
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-3" style={{ color: "#00355f" }}>
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to book this tour and continue your adventure.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handlePromptSignIn}
                className="px-5 py-2 rounded-lg font-medium"
                style={{ backgroundColor: "#00355f", color: "white" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN UI CONTENT */}
      <div className="relative pt-24 pb-12">
        <div className="relative max-w-6xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm mb-8">
            <button
              onClick={() => navigate("/tours")}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Tours
            </button>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-gray-700 font-medium truncate">
              {tour.title}
            </span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Image Section */}
            <div className="space-y-6">
              <div className="relative group overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src={tour.image || "/src/assets/placeholder.jpg"}
                  alt={tour.title}
                  className="w-full h-96 lg:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#00355f" }}
                  >
                    Duration
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{tour.duration}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#00355f" }}
                  >
                    Location
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{tour.location}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#00355f" }}
                  >
                    Group Size
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Small Groups</p>
                </div>
              </div>
            </div>

            {/* Tour Info */}
            <div className="space-y-8">
              <h1
                className="text-4xl lg:text-5xl font-bold leading-tight mb-3"
                style={{ color: "#00355f" }}
              >
                {tour.title}
              </h1>
              <div className="flex items-center space-x-2 text-gray-600 mb-4">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-lg">{tour.location}</span>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <span
                  className="text-4xl font-bold"
                  style={{ color: "#00355f" }}
                >
                  ₱{tour.price?.toLocaleString()}
                </span>
                <span className="text-gray-500 text-lg ml-2">per person</span>
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ color: "#00355f" }}
                >
                  About This Tour
                </h2>
                <div
                  className="w-16 h-1 mb-6"
                  style={{ backgroundColor: "#eec218" }}
                ></div>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {tour.description || "No description available for this tour."}
                </p>
              </div>

              {/* Book Now */}
              <div className="bg-gradient-to-r from-blue-50 to-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                <div className="text-center mb-6">
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: "#00355f" }}
                  >
                    Ready for an Adventure?
                  </h3>
                  <p className="text-gray-600">
                    Book now and create unforgettable memories in the
                    Philippines!
                  </p>
                </div>

                <button
                  onClick={handleBookNow}
                  className="w-full py-4 px-8 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1"
                  style={{ backgroundColor: "#00355f", color: "white" }}
                >
                  Book This Tour Now
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Secure booking • Instant confirmation • Best price guaranteed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TourDetails;
