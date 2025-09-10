import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

function Profile({ user, onLogout }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.user_metadata?.full_name || "Traveler",
    email: user?.email || "",
    phone: user?.user_metadata?.phone || "",
    address: user?.user_metadata?.address || ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // In a real app, send updated profile to backend API
    console.log("Saving profile:", profile);
    setIsEditing(false);
    // Example: Update user metadata via API (e.g., Supabase)
    // auth.updateUser({ data: profile });
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navbar */}
      <Navbar user={user} onLogout={onLogout} />

      {/* Header Section */}
      <section className="py-20 px-6" style={{ backgroundColor: '#00355f' }}>
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-normal text-white mb-6 leading-tight">
            My
            <span className="font-semibold ml-4" style={{ color: '#eec218' }}>
              Profile
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-normal">
            Manage your personal information and preferences
          </p>
        </div>
      </section>

      {/* Profile Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <h2 className="text-3xl font-semibold mb-6" style={{ color: '#00355f' }}>
              Personal Information
            </h2>
            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00355f]"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-800 font-normal">{profile.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00355f]"
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="text-gray-800 font-normal">{profile.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00355f]"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-800 font-normal">{profile.phone || "Not provided"}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    value={profile.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00355f]"
                    placeholder="Enter your address"
                  />
                ) : (
                  <p className="text-gray-800 font-normal">{profile.address || "Not provided"}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 px-4 font-semibold rounded-lg transition-all duration-300"
                    style={{ backgroundColor: '#00355f', color: 'white' }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#002a4a')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#00355f')}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 px-4 font-semibold rounded-lg border-2 transition-all duration-300"
                    style={{ backgroundColor: 'transparent', color: '#dc2626', borderColor: '#dc2626' }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#dc2626';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#dc2626';
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 px-4 font-semibold rounded-lg transition-all duration-300"
                  style={{ backgroundColor: '#eec218', color: '#00355f' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#d4a617';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#eec218';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6" style={{ backgroundColor: '#00355f' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-normal text-white mb-6">
            Ready for Your Next Trip?
          </h2>
          <p className="text-xl text-white/90 mb-12 font-normal">
            Explore our tours and book your next adventure today!
          </p>
          <button
            onClick={() => navigate("/tours")}
            className="px-8 py-4 font-semibold rounded-lg transition-all duration-300 shadow-lg"
            style={{ backgroundColor: '#eec218', color: '#00355f' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#d4a617';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#eec218';
              e.target.style.transform = 'scale(1)';
            }}
          >
            Browse Tours
          </button>
        </div>
      </section>

      {/* Footer (Reused from Bookings) */}
      <footer className="py-16 px-6" style={{ backgroundColor: '#001a2e' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold text-white mb-4">
                AP Cebu Tours & Transport
              </h3>
              <p className="text-gray-300 mb-6 leading-relaxed font-normal">
                Your trusted partner for exploring the beautiful islands of Cebu and beyond.
                We specialize in creating personalized travel experiences that showcase the best of Philippine hospitality.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#00355f' }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#00355f' }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                  style={{ backgroundColor: '#00355f' }}
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
                    style={{ color: '#a0aec0' }}
                    onMouseEnter={(e) => (e.target.style.color = '#eec218')}
                    onMouseLeave={(e) => (e.target.style.color = '#a0aec0')}
                  >
                    Popular Tours
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: '#a0aec0' }}
                    onMouseEnter={(e) => (e.target.style.color = '#eec218')}
                    onMouseLeave={(e) => (e.target.style.color = '#a0aec0')}
                  >
                    Book Online
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: '#a0aec0' }}
                    onMouseEnter={(e) => (e.target.style.color = '#eec218')}
                    onMouseLeave={(e) => (e.target.style.color = '#a0aec0')}
                  >
                    Travel Tips
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-300 transition-colors font-normal"
                    style={{ color: '#a0aec0' }}
                    onMouseEnter={(e) => (e.target.style.color = '#eec218')}
                    onMouseLeave={(e) => (e.target.style.color = '#a0aec0')}
                  >
                    Reviews
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
                    style={{ color: '#eec218' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-normal" style={{ color: '#a0aec0' }}>Cebu City, Philippines</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5"
                    style={{ color: '#eec218' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-normal" style={{ color: '#a0aec0' }}>+63 XXX XXX XXXX</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5"
                    style={{ color: '#eec218' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-normal" style={{ color: '#a0aec0' }}>info@apcebutours.com</span>
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

export default Profile;