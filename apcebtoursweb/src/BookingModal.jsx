// components/BookingModal.jsx
export default function BookingModal({
  showBookingModal,
  setShowBookingModal,
  selectedTour,
  bookingDetails,
  setBookingDetails,
  handleBookingSubmit, 
  bookingLoading
    }) {
    if (!showBookingModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "#00355f" }}>
            Book {selectedTour?.title}
          </h2>
          <button
            onClick={() => setShowBookingModal(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleBookingSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={bookingDetails.date}
              onChange={(e) =>
                setBookingDetails({ ...bookingDetails, date: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Number of People */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of People
            </label>
            <input
              type="number"
              min="1"
              value={bookingDetails.numberOfPeople}
              onChange={(e) =>
                setBookingDetails({
                  ...bookingDetails,
                  numberOfPeople: parseInt(e.target.value)
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={bookingDetails.contactEmail}
              onChange={(e) =>
                setBookingDetails({
                  ...bookingDetails,
                  contactEmail: e.target.value
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={bookingDetails.contactPhone}
              onChange={(e) =>
                setBookingDetails({
                  ...bookingDetails,
                  contactPhone: e.target.value
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Requests
            </label>
            <textarea
              value={bookingDetails.specialRequests}
              onChange={(e) =>
                setBookingDetails({
                  ...bookingDetails,
                  specialRequests: e.target.value
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="3"
            />
          </div>

          <button
            type="submit"
            disabled={bookingLoading}
            className="w-full py-3 text-white font-semibold rounded-lg"
            style={{
              backgroundColor: bookingLoading ? "#ccc" : "#00355f"
            }}
          >
            {bookingLoading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
