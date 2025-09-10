import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot } from "react-icons/fa";

function Profile() {
  const { user, setUser } = useAuth(); // Use global user state from AuthContext
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false); // Chatbot state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const [profileData, setProfileData] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    middle_initial: '',
    phone: '',
    avatar_url: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user ?? null);
        setLoadingUser(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoadingUser(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoadingProfile(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
      fetchBookings();
    } else {
      window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }));
    }
  }, [user]);

  const fetchProfile = async (userId) => {
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setProfileData({
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_initial: data.middle_initial || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
      } else {
        await createProfile(userId);
      }
    } catch (err) {
      setErrorMessage("Error fetching profile: " + err.message);
      setShowErrorModal(true);
    } finally {
      setLoadingProfile(false);
    }
  };

  const createProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || ''
        }])
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setErrorMessage("Error creating profile: " + err.message);
      setShowErrorModal(true);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setShowLogoutModal(false);
      setSuccessMessage("Logged out successfully");
      setShowSuccessModal(true);
      navigate("/");
    } catch (err) {
      setErrorMessage("Error logging out");
      setShowErrorModal(true);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setUpdatingProfile(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          middle_initial: profileData.middle_initial,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setSuccessMessage("Profile updated successfully!");
      setShowSuccessModal(true);
      setIsEditingProfile(false);
      fetchProfile(user.id);
    } catch (err) {
      setErrorMessage("Error updating profile: " + err.message);
      setShowErrorModal(true);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleCancelBookingClick = (bookingId) => {
    setCancelBookingId(bookingId);
    setShowCancelModal(true);
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      setCancellingBooking(bookingId);
      const { error } = await supabase
        .from("bookings")
        .update({ status: 'cancelled' })
        .eq("id", bookingId);

      if (error) throw error;
      setSuccessMessage("Booking cancelled successfully");
      setShowSuccessModal(true);
      setShowCancelModal(false);
      fetchBookings();
    } catch (err) {
      setErrorMessage("Error cancelling booking: " + err.message);
      setShowErrorModal(true);
    } finally {
      setCancellingBooking(null);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          created_at,
          booking_date,
          number_of_people,
          total_price,
          status,
          special_requests,
          tours ( title, duration, image, price )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      setErrorMessage("Error fetching bookings: " + err.message);
      setShowErrorModal(true);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getFilteredBookings = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'status':
        // Show pending and confirmed bookings (current/future)
        return bookings.filter(booking => 
          (booking.status === 'pending' || booking.status === 'confirmed') && 
          booking.booking_date >= today
        );
      case 'history':
        // Show completed bookings (past confirmed bookings)
        return bookings.filter(booking => 
          booking.status === 'confirmed' && booking.booking_date < today
        );
      case 'cancel-request':
        // Show cancelled bookings
        return bookings.filter(booking => booking.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-200';
      case 'completed': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBookingStats = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return {
      status: bookings.filter(b => 
        (b.status === 'pending' || b.status === 'confirmed') && 
        b.booking_date >= today
      ).length,
      history: bookings.filter(b => 
        b.status === 'confirmed' && b.booking_date < today
      ).length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
  };

  if (loadingUser || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar
          user={user}
          onLogout={handleLogoutClick}
          onLoginClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))}
          onSignupClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: false } }))}
          onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)}
        />
        <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />
        <button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] transition-colors z-40"
        >
          <FaRobot size={24} />
        </button>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))}
              className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-300"
            >
              Log In
            </button>
          </div>
        </div>
      </>
    );
  }

  const stats = getBookingStats();
  const displayName = profileData.full_name || `${profileData.first_name} ${profileData.last_name}`.trim() || 'User';

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogoutClick}
        onLoginClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))}
        onSignupClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: false } }))}
        onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)}
      />
      <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] transition-colors z-40"
      >
        <FaRobot size={24} />
      </button>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                {profileData.avatar_url ? (
                  <img 
                    src={profileData.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {displayName}
                </h1>
                <p className="text-gray-600 mb-2">{user.email}</p>
                {profile?.role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
                    {profile.role}
                  </span>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Current Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.status}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.history}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Cancelled</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Profile Form */}
          {isEditingProfile && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User name</label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Middle Initial</label>
                  <input
                    type="text"
                    maxLength="1"
                    value={profileData.middle_initial}
                    onChange={(e) => setProfileData({...profileData, middle_initial: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                  <input
                    type="url"
                    value={profileData.avatar_url}
                    onChange={(e) => setProfileData({...profileData, avatar_url: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleProfileUpdate}
                  disabled={updatingProfile}
                  className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition duration-300 disabled:opacity-50"
                >
                  {updatingProfile ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-full hover:bg-gray-600 transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Profile Information Display */}
          {!isEditingProfile && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-700"><span className="font-medium">Email:</span> {user.email}</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">Phone:</span> {profileData.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">First Name:</span> {profileData.first_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">Last Name:</span> {profileData.last_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">Middle Initial:</span> {profileData.middle_initial || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-700"><span className="font-medium">Member Since:</span> {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}</p>
                </div>
              </div>
            </div>
          )}

          {/* My Bookings Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">My Bookings</h2>
              <div className="text-sm text-gray-600">
                Total Bookings: {bookings.length}
              </div>
            </div>

            {/* Booking Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('status')}
                className={`px-6 py-3 font-medium text-sm transition duration-300 whitespace-nowrap ${
                  activeTab === 'status'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Status ({stats.status})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium text-sm transition duration-300 whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                History ({stats.history})
              </button>
              <button
                onClick={() => setActiveTab('cancel-request')}
                className={`px-6 py-3 font-medium text-sm transition duration-300 whitespace-nowrap ${
                  activeTab === 'cancel-request'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cancel Request ({stats.cancelled})
              </button>
            </div>

            {/* Booking Content */}
            {loadingBookings ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-blue-600"></div>
              </div>
            ) : getFilteredBookings().length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600">
                  {activeTab === 'status' && 'No current bookings found.'}
                  {activeTab === 'history' && 'No completed bookings found.'}
                  {activeTab === 'cancel-request' && 'No cancelled bookings found.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      {activeTab === 'status' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredBookings().map((booking) => {
                      const isPastDate = new Date(booking.booking_date) < new Date();
                      const canCancel = (booking.status === 'confirmed' || booking.status === 'pending') && !isPastDate;
                      
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {booking.tours?.image && (
                                <img
                                  src={booking.tours.image}
                                  alt={booking.tours.title}
                                  className="w-16 h-16 object-cover rounded-lg mr-4"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.tours?.title || 'Tour Details Unavailable'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {booking.tours?.duration}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <div className="mb-1">
                                <span className="font-medium">Date:</span> 
                                <span className={isPastDate && booking.status === 'confirmed' ? 'text-blue-600 font-medium' : ''}>
                                  {formatDate(booking.booking_date)}
                                </span>
                              </div>
                              <div className="mb-1"><span className="font-medium">People:</span> {booking.number_of_people}</div>
                              <div className="mb-1"><span className="font-medium">Booked:</span> {formatDate(booking.created_at)}</div>
                              {booking.special_requests && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                  <span className="font-medium">Notes:</span> {booking.special_requests}
                                </div>
                              )}
                              
                              {/* Booking Details after confirmation - Show detailed info for confirmed bookings */}
                              {booking.status === 'confirmed' && (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xs font-semibold text-green-800 mb-2">BOOKING CONFIRMED</div>
                                  <div className="space-y-1 text-xs text-green-700">
                                    <div><span className="font-medium">Confirmation ID:</span> #{booking.id.slice(-8).toUpperCase()}</div>
                                    <div><span className="font-medium">Tour Price:</span> ₱{booking.tours?.price?.toLocaleString() || 'N/A'} per person</div>
                                    <div><span className="font-medium">Total Guests:</span> {booking.number_of_people}</div>
                                    <div><span className="font-medium">Final Amount:</span> ₱{booking.total_price.toLocaleString()}</div>
                                    {booking.tours?.duration && (
                                      <div><span className="font-medium">Duration:</span> {booking.tours.duration}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                            {booking.status === 'pending' && (
                              <div className="mt-1 text-xs text-yellow-600">
                                Awaiting confirmation
                              </div>
                            )}
                            {booking.status === 'confirmed' && isPastDate && activeTab === 'history' && (
                              <div className="mt-1 text-xs text-blue-600">
                                Tour Completed
                              </div>
                            )}
                            {booking.status === 'confirmed' && !isPastDate && (
                              <div className="mt-1 text-xs text-green-600">
                                Ready for tour
                              </div>
                            )}
                            {booking.status === 'cancelled' && (
                              <div className="mt-1 text-xs text-red-600">
                                Booking cancelled on {formatDate(booking.updated_at || booking.created_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            ₱{booking.total_price.toLocaleString()}
                          </td>
                          {activeTab === 'status' && (
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-2">
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancelBookingClick(booking.id)}
                                    disabled={cancellingBooking === booking.id}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 transition duration-200"
                                  >
                                    {cancellingBooking === booking.id ? (
                                      <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Cancelling...
                                      </span>
                                    ) : 'Cancel Booking'}
                                  </button>
                                )}
                                {booking.status === 'pending' && (
                                  <div className="text-xs text-gray-500">
                                    Contact support for changes
                                  </div>
                                )}
                                {!canCancel && isPastDate && booking.status === 'confirmed' && (
                                  <span className="text-xs text-gray-500">Tour completed</span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Booking Status Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Booking Status Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border text-yellow-600 bg-yellow-100 border-yellow-200 mr-2">
                    {getStatusIcon('pending')}
                    Pending
                  </span>
                  <span className="text-xs text-gray-600">Awaiting confirmation</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border text-green-600 bg-green-100 border-green-200 mr-2">
                    {getStatusIcon('confirmed')}
                    Confirmed
                  </span>
                  <span className="text-xs text-gray-600">Booking confirmed & ready</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border text-red-600 bg-red-100 border-red-200 mr-2">
                    {getStatusIcon('cancelled')}
                    Cancelled
                  </span>
                  <span className="text-xs text-gray-600">Booking cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Cancel Booking Confirmation Modal */}
      <ConfirmCancelModal
        showCancelModal={showCancelModal}
        setShowCancelModal={setShowCancelModal}
        handleCancelBooking={handleCancelBooking}
        cancelBookingId={cancelBookingId}
      />
    </>
  );
}

// Logout Confirmation Modal Component
const LogoutModal = ({ showLogoutModal, setShowLogoutModal, handleLogout }) => {
  if (!showLogoutModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>
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
        <p className="text-gray-600 mb-6">
          Are you sure you want to log out?
        </p>
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
            style={{ backgroundColor: '#00355f', color: 'white' }}
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
          <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>
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
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowSuccessModal(false)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#00355f', color: 'white' }}
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
          <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>
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
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowErrorModal(false)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#00355f', color: 'white' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Cancel Booking Confirmation Modal Component
const ConfirmCancelModal = ({ showCancelModal, setShowCancelModal, handleCancelBooking, cancelBookingId }) => {
  if (!showCancelModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>
            Confirm Cancellation
          </h2>
          <button
            onClick={() => setShowCancelModal(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to cancel this booking?
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setShowCancelModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => handleCancelBooking(cancelBookingId)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#00355f', color: 'white' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;