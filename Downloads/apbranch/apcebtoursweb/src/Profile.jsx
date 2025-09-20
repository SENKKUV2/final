import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";

function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState({ type: null, data: null });
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [profileData, setProfileData] = useState({
    full_name: '', first_name: '', last_name: '', middle_initial: '', phone: '', avatar_url: '', current_password: '', change_password: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      setIsLoading(true);
      if (session?.user) {
        await Promise.all([fetchProfile(session.user.id), fetchBookings(session.user.id)]);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProfile(data);
        setProfileData({
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_initial: data.middle_initial || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          current_password: '',
          change_password: ''
        });
      } else {
        const { data, error } = await supabase.from('profiles').insert([{
          id: userId,
          email: user?.email,
          full_name: user?.user_metadata?.full_name || '',
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || ''
        }]).select().single();
        if (error) throw error;
        setProfile(data);
      }
    } catch (err) {
      setShowModal({ type: 'error', data: "Error fetching profile: " + err.message });
    }
  };

  const fetchBookings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select('id, created_at, booking_date, number_of_people, total_price, status, special_requests, tours (title, duration, image, price)')
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      setShowModal({ type: 'error', data: "Error fetching bookings: " + err.message });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setShowModal({ type: 'success', data: "Logged out successfully" });
      navigate("/");
    } catch (err) {
      setShowModal({ type: 'error', data: "Error logging out" });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const updates = { 
        full_name: profileData.full_name,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        middle_initial: profileData.middle_initial,
        phone: profileData.phone,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString()
      };

      if (profileData.change_password) {
        // Verify current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: profileData.current_password
        });
        if (signInError) throw new Error("Current password is incorrect");

        // Update password if new password is provided
        const { error: passwordError } = await supabase.auth.updateUser({
          password: profileData.change_password
        });
        if (passwordError) throw passwordError;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      
      setShowModal({ type: 'success', data: "Profile updated successfully!" });
      setIsEditing(false);
      await fetchProfile(user.id);
    } catch (err) {
      setShowModal({ type: 'error', data: "Error updating profile: " + err.message });
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: 'cancelled' })
        .eq("id", bookingId);
      if (error) throw error;
      setShowModal({ type: 'success', data: "Booking cancelled successfully" });
      await fetchBookings(user.id);
    } catch (err) {
      setShowModal({ type: 'error', data: "Error cancelling booking: " + err.message });
    }
  };

  const getFilteredBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(b => {
      switch (activeTab) {
        case 'active': return b.status === 'confirmed' && b.booking_date >= today;
        case 'pending': return b.status === 'pending';
        case 'history': return b.status === 'confirmed' && b.booking_date < today;
        case 'cancelled': return b.status === 'cancelled';
        default: return true;
      }
    });
  };

  const getStatusColor = (status) => ({
    confirmed: 'text-green-600 bg-green-100 border-green-200',
    pending: 'text-yellow-600 bg-yellow-100 border-yellow-200',
    cancelled: 'text-red-600 bg-red-100 border-red-200',
    completed: 'text-blue-600 bg-blue-100 border-blue-200'
  }[status] || 'text-gray-600 bg-gray-100 border-gray-200');

  const getStatusIcon = (status) => {
    const icons = {
      confirmed: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />,
      pending: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />,
      cancelled: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />,
      completed: <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    };
    return icons[status] ? <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">{icons[status]}</svg> : null;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const getBookingStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      active: bookings.filter(b => b.status === 'confirmed' && b.booking_date >= today).length,
      pending: bookings.filter(b => b.status === 'pending').length,
      history: bookings.filter(b => b.status === 'confirmed' && b.booking_date < today).length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar user={user} onLogout={() => setShowModal({ type: 'logout' })} onLoginClick={() => setShowModal({ type: 'auth', data: true })} onSignupClick={() => setShowModal({ type: 'auth', data: false })} />
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
            <button onClick={() => setShowModal({ type: 'auth', data: true })} className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-300">
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
      <Navbar user={user} onLogout={() => setShowModal({ type: 'logout' })} onLoginClick={() => setShowModal({ type: 'auth', data: true })} onSignupClick={() => setShowModal({ type: 'auth', data: false })} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                {profileData.avatar_url ? <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
                <p className="text-gray-600 mb-2">{user.email}</p>
                {profile?.role && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">{profile.role}</span>}
                <button onClick={() => setIsEditing(!isEditing)} className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2" style={{ backgroundColor: "#00355f", color: "white" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {['active', 'pending', 'history', 'cancelled'].map(status => (
              <div key={status} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${getStatusColor(status).split(' ')[1]} rounded-md flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${getStatusColor(status).split(' ')[0]}`} fill="currentColor" viewBox="0 0 20 20">{getStatusIcon(status)}</svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{status.charAt(0).toUpperCase() + status.slice(1)}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats[status]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 mb-8 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #00355f 0%, #004080 100%)" }}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eec218" }}>
                    <svg className="w-6 h-6" style={{ color: "#00355f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Profile Information</h2>
                    <p className="text-blue-100 text-sm">Update your personal details and preferences</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: "#00355f" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Personal Information</span>
                  </h3>
                  <div className="w-16 h-1 mb-6" style={{ backgroundColor: "#eec218" }}></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'User Name', key: 'full_name', type: 'text', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />, placeholder: "Enter your full name" },
                      { label: 'Phone Number', key: 'phone', type: 'tel', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />, placeholder: "+63 917 123 4567" },
                      { label: 'First Name', key: 'first_name', type: 'text', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />, placeholder: "Enter first name" },
                      { label: 'Last Name', key: 'last_name', type: 'text', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />, placeholder: "Enter last name" },
                      { label: 'Middle Initial', key: 'middle_initial', type: 'text', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1-8l-1-1v1a4 4 0 01-4 4H6m1-5a4 4 0 014 4v1m0 0l1 1" />, placeholder: "M", maxLength: 1 },
                      { label: 'Avatar URL', key: 'avatar_url', type: 'url', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />, placeholder: "https://example.com/avatar.jpg" }
                    ].map(({ label, key, type, icon, placeholder, maxLength }) => (
                      <div key={key} className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                          <svg className="w-4 h-4" style={{ color: "#eec218" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                          <span>{label}</span>
                        </label>
                        <input
                          type={type}
                          value={profileData[key]}
                          onChange={(e) => setProfileData({ ...profileData, [key]: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-300"
                          style={{ '--tw-ring-color': '#eec218' }}
                          placeholder={placeholder}
                          maxLength={maxLength}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: "#00355f" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Security Settings</span>
                  </h3>
                  <div className="w-16 h-1 mb-6" style={{ backgroundColor: "#eec218" }}></div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <svg className="w-4 h-4" style={{ color: "#eec218" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Change Password</span>
                      </label>
                      <input
                        type="password"
                        value={profileData.change_password}
                        onChange={(e) => setProfileData({ ...profileData, change_password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-300"
                        style={{ '--tw-ring-color': '#eec218' }}
                        placeholder="Enter new password"
                      />
                    
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <svg className="w-4 h-4" style={{ color: "#eec218" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Current Password</span>
                      </label>
                      <input
                        type="password"
                        value={profileData.current_password}
                        onChange={(e) => setProfileData({ ...profileData, current_password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-300"
                        style={{ '--tw-ring-color': '#eec218' }}
                        placeholder="Enter current password"
                      />
                      <p className="text-xs text-gray-500 mt-1">Required to change password</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                  <button onClick={handleProfileUpdate} className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4" style={{ backgroundColor: "#00355f", color: "white", '--tw-ring-color': '#00355f40' }} onMouseEnter={(e) => (e.target.style.backgroundColor = "#004080")} onMouseLeave={(e) => (e.target.style.backgroundColor = "#00355f")}>
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </span>
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4" style={{ backgroundColor: "#dc2626", color: "white", '--tw-ring-color': '#dc262640' }} onMouseEnter={(e) => (e.target.style.backgroundColor = "#b91c1c")} onMouseLeave={(e) => (e.target.style.backgroundColor = "#dc2626")}>
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Email', value: user.email },
                  { label: 'Phone', value: profileData.phone || 'Not provided' },
                  { label: 'First Name', value: profileData.first_name || 'Not provided' },
                  { label: 'Last Name', value: profileData.last_name || 'Not provided' },
                  { label: 'Middle Initial', value: profileData.middle_initial || 'Not provided' },
                  { label: 'Member Since', value: profile?.created_at ? formatDate(profile.created_at) : 'Unknown' }
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-700"><span className="font-medium">{label}:</span> {value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">My Bookings</h2>
              <div className="text-sm text-gray-600">Total Bookings: {bookings.length}</div>
            </div>
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              {['active', 'pending', 'history', 'cancelled'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium text-sm transition duration-300 whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({stats[tab]})
                </button>
              ))}
            </div>
            {getFilteredBookings().length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600">No {activeTab} bookings found.</p>
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
                      {(activeTab === 'active' || activeTab === 'pending') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredBookings().map(booking => {
                      const isPastDate = new Date(booking.booking_date) < new Date();
                      const canCancel = (booking.status === 'confirmed' || booking.status === 'pending') && !isPastDate;
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {booking.tours?.image && <img src={booking.tours.image} alt={booking.tours.title} className="w-16 h-16 object-cover rounded-lg mr-4" />}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.tours?.title || 'Tour Details Unavailable'}</div>
                                <div className="text-sm text-gray-500">{booking.tours?.duration}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <div className="mb-1"><span className="font-medium">Date:</span> <span className={isPastDate && booking.status === 'confirmed' ? 'text-blue-600 font-medium' : ''}>{formatDate(booking.booking_date)}</span></div>
                              <div className="mb-1"><span className="font-medium">People:</span> {booking.number_of_people}</div>
                              <div className="mb-1"><span className="font-medium">Booked:</span> {formatDate(booking.created_at)}</div>
                              {booking.special_requests && <div className="mt-2 p-2 bg-gray-50 rounded text-xs"><span className="font-medium">Notes:</span> {booking.special_requests}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                            {booking.status === 'pending' && <div className="mt-1 text-xs text-yellow-600">Awaiting confirmation</div>}
                            {booking.status === 'confirmed' && isPastDate && <div className="mt-1 text-xs text-blue-600">Completed</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">₱{booking.total_price.toLocaleString()}</td>
                          {(activeTab === 'active' || activeTab === 'pending') && (
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-2">
                                {canCancel && <button onClick={() => setShowModal({ type: 'cancel', data: booking.id })} className="text-red-600 hover:text-red-800 text-sm font-medium transition duration-200">Cancel Booking</button>}
                                {booking.status === 'pending' && <div className="text-xs text-gray-500">Contact support for changes</div>}
                                {!canCancel && isPastDate && booking.status === 'confirmed' && <span className="text-xs text-gray-500">Tour completed</span>}
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
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Booking Status Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {['pending', 'confirmed', 'completed', 'cancelled'].map(status => (
                  <div key={status} className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)} mr-2`}>
                      {getStatusIcon(status)}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-600">{{
                      pending: 'Awaiting confirmation',
                      confirmed: 'Ready to go!',
                      completed: 'Tour finished',
                      cancelled: 'Booking cancelled'
                    }[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal.type === 'logout' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>Confirm Logout</h2>
              <button onClick={() => setShowModal({ type: null })} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close">×</button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowModal({ type: null })} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg">Cancel</button>
              <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: '#00355f', color: 'white' }}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {showModal.type === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>Success</h2>
              <button onClick={() => setShowModal({ type: null })} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close">×</button>
            </div>
            <p className="text-gray-600 mb-6">{showModal.data}</p>
            <div className="flex justify-end">
              <button onClick={() => setShowModal({ type: null })} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: '#00355f', color: 'white' }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showModal.type === 'error' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>Error</h2>
              <button onClick={() => setShowModal({ type: null })} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close">×</button>
            </div>
            <p className="text-gray-600 mb-6">{showModal.data}</p>
            <div className="flex justify-end">
              <button onClick={() => setShowModal({ type: null })} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: '#00355f', color: 'white' }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showModal.type === 'cancel' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#00355f' }}>Confirm Cancellation</h2>
              <button onClick={() => setShowModal({ type: null })} className="text-gray-500 hover:text-gray-700 text-xl" aria-label="Close">×</button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this booking?</p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowModal({ type: null })} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg">Cancel</button>
              <button onClick={() => handleCancelBooking(showModal.data)} className="px-4 py-2 rounded-lg font-medium transition-colors" style={{ backgroundColor: '#00355f', color: 'white' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;