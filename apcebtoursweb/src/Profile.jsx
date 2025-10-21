import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot, FaStar, FaSpinner } from "react-icons/fa";

const Modal = ({ show, setShow, title, children, footer }) =>
  show && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl max-w-md w-full shadow-xl border border-gray-100/50">
        <div className="flex justify-between p-6">
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <button onClick={() => setShow(false)} className="text-gray-600 hover:text-gray-800 text-xl" aria-label="Close">×</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 flex justify-end space-x-4">{footer}</div>}
      </div>
    </div>
  );

const InputField = ({ label, type = "text", value, onChange, maxLength, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      maxLength={maxLength}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400"
    />
  </div>
);

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    profile: null,
    bookings: [],
    filteredBookings: [],
    searchQuery: "",
    feedbackSubmitted: new Set(),
    loading: false,
    isChatbotOpen: false,
    isEditingProfile: false,
    isChangingPassword: false,
    activeTab: "all",
    profileData: { full_name: "", first_name: "", last_name: "", middle_initial: "", phone: "", avatar_url: "" },
    passwordData: { oldPassword: "", newPassword: "", confirmPassword: "" },
    passwordError: "",
    updating: { profile: false, password: false },
    modals: { logout: false, success: false, error: false, feedback: false },
    messages: { success: "", error: "" },
    feedbackBookingId: null,
    feedbackData: { rating: 0, comments: "" },
    requestingCancel: null,
    bookingFlags: {},
  });

  const updateState = useCallback((updates) => setState((prev) => ({ ...prev, ...updates })), []);

  const loadData = async (userId) => {
    updateState({ loading: true });
    try {
      const [{ data: profile }, { data: bookings }, { data: feedback }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("bookings").select("*, tours(title, duration, image, price), profiles(full_name)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("feedback").select("booking_id").eq("user_id", userId),
      ]);
      if (profile) {
        updateState({
          profile,
          profileData: { ...profile, full_name: profile.full_name || "", first_name: profile.first_name || "", last_name: profile.last_name || "", middle_initial: profile.middle_initial || "", phone: profile.phone || "", avatar_url: profile.avatar_url || "" },
          bookings: bookings || [],
          filteredBookings: bookings || [],
          feedbackSubmitted: new Set(feedback?.map((f) => f.booking_id) || []),
        });
      } else {
        await createProfile(userId);
      }
    } catch (err) {
      updateState({ messages: { error: `Error loading data: ${err.message}` }, modals: { error: true } });
    } finally {
      updateState({ loading: false });
    }
  };

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }));
      return;
    }
    loadData(user.id);

    const subscription = supabase
      .channel("profile-bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          loadData(user.id);
        } else if (payload.eventType === "UPDATE") {
          const updatedBooking = { ...payload.new, tours: payload.new.tours || {}, profiles: payload.new.profiles || {} };
          updateState((prev) => ({
            bookings: prev.bookings.map((b) => (b.id === payload.new.id ? updatedBooking : b)),
            filteredBookings: prev.filteredBookings.map((b) => (b.id === payload.new.id ? updatedBooking : b)),
            bookingFlags: { ...prev.bookingFlags, ...(payload.old.status === "cancel-requested" && payload.new.status === "pending" ? { [payload.new.id]: { type: "rejected" } } : {}) },
          }));
        } else if (payload.eventType === "DELETE") {
          updateState((prev) => ({
            bookings: prev.bookings.filter((b) => b.id !== payload.old.id),
            filteredBookings: prev.filteredBookings.filter((b) => b.id !== payload.old.id),
          }));
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const createProfile = async (userId) => {
    try {
      const { data } = await supabase.from("profiles").insert([{ id: userId, email: user.email, full_name: user.user_metadata?.full_name || "" }]).select().single();
      updateState({ profile: data });
    } catch (err) {
      updateState({ messages: { error: `Error creating profile: ${err.message}` }, modals: { error: true } });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      updateState({ modals: { logout: false, success: true }, messages: { success: "Logged out successfully" } });
      navigate("/");
    } catch (err) {
      updateState({ messages: { error: `Error logging out: ${err.message}` }, modals: { error: true } });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      updateState({ updating: { profile: true } });
      await supabase.from("profiles").update({ ...state.profileData, updated_at: new Date().toISOString() }).eq("id", user.id);
      updateState({ modals: { success: true }, messages: { success: "Profile updated successfully!" }, isEditingProfile: false });
      loadData(user.id);
    } catch (err) {
      updateState({ messages: { error: `Error updating profile: ${err.message}` }, modals: { error: true } });
    } finally {
      updateState({ updating: { profile: false } });
    }
  };

  const handlePasswordChange = async () => {
    const { newPassword, confirmPassword } = state.passwordData;
    if (!newPassword || !confirmPassword) return updateState({ passwordError: "All password fields are required" });
    if (newPassword !== confirmPassword) return updateState({ passwordError: "New password and confirmation do not match" });
    if (newPassword.length < 6) return updateState({ passwordError: "New password must be at least 6 characters long" });
    
    try {
      updateState({ updating: { password: true }, passwordError: "" });
      
      // Update to new password - Supabase will handle authentication
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) {
        throw updateError;
      }
      
      updateState({ 
        modals: { success: true }, 
        messages: { success: "Password updated successfully!" }, 
        passwordData: { oldPassword: "", newPassword: "", confirmPassword: "" }, 
        isChangingPassword: false, 
        passwordError: "" 
      });
    } catch (err) {
      updateState({ 
        passwordError: err.message || "Error updating password"
      });
    } finally {
      updateState({ updating: { password: false } });
    }
  };

  const handleCancelRequest = async (bookingId) => {
    try {
      updateState({ requestingCancel: bookingId });
      const { error } = await supabase.from("bookings").update({ status: "cancel-requested" }).eq("id", bookingId);
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ bookingId, status: "cancel-requested" }),
      });
      const booking = state.bookings.find((b) => b.id === bookingId);
      updateState({
        bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status: "cancel-requested" } : b)),
        filteredBookings: state.filteredBookings.map((b) => (b.id === bookingId ? { ...b, status: "cancel-requested" } : b)),
        modals: { success: true },
        messages: { success: `Cancellation request for "${booking?.tours?.title || "your booking"}" submitted!` },
        requestingCancel: null,
      });
    } catch (error) {
      updateState({ messages: { error: error.message || "Error submitting cancellation request" }, modals: { error: true }, requestingCancel: null });
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!state.feedbackData.rating) return updateState({ messages: { error: "Please provide a rating" }, modals: { error: true } });
    try {
      const { data: existing } = await supabase.from("feedback").select("id").eq("booking_id", state.feedbackBookingId).eq("user_id", user.id).single();
      if (existing) return updateState({ messages: { error: "Feedback already submitted" }, modals: { error: true, feedback: false } });
      await supabase.from("feedback").insert({
        user_id: user.id,
        booking_id: state.feedbackBookingId,
        tour_id: state.bookings.find((b) => b.id === state.feedbackBookingId)?.tour_id,
        rating: state.feedbackData.rating,
        comments: state.feedbackData.comments || null,
      });
      updateState({
        feedbackSubmitted: new Set([...state.feedbackSubmitted, state.feedbackBookingId]),
        modals: { success: true, feedback: false },
        messages: { success: "Feedback submitted successfully!" },
        feedbackData: { rating: 0, comments: "" },
      });
    } catch (err) {
      updateState({ messages: { error: `Error submitting feedback: ${err.message}` }, modals: { error: true } });
    }
  };

  const handleSearch = useCallback((e) => {
    const query = e.target.value.toLowerCase();
    setState(prev => ({
      ...prev,
      searchQuery: query,
      filteredBookings: prev.bookings.filter(
        (b) => b.tours?.title.toLowerCase().includes(query) || b.contact_email?.toLowerCase().includes(query) || b.profiles?.full_name.toLowerCase().includes(query)
      ),
    }));
  }, []);

  const getFilteredBookings = () => {
    const now = new Date().toISOString().split("T")[0];
    const filters = {
      all: state.filteredBookings,
      status: state.filteredBookings.filter((b) => ["pending", "confirmed"].includes(b.status) && b.booking_date >= now),
      completed: state.filteredBookings.filter((b) => b.status === "completed" || (b.status === "confirmed" && b.booking_date < now)),
      cancellations: state.filteredBookings.filter((b) => ["cancel-requested", "cancelled"].includes(b.status)),
    };
    return filters[state.activeTab] || state.filteredBookings;
  };

  const statusConfig = {
    confirmed: { color: "text-green-600 bg-green-100 border-green-200", icon: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /> },
    pending: { color: "text-yellow-600 bg-yellow-100 border-yellow-200", icon: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /> },
    "cancel-requested": { color: "text-orange-600 bg-orange-100 border-orange-200", icon: <path fillRule="evenodd" d="M9 12l2 2 4-4m-6 8a9 9 0 100-18 9 9 0 000 18z" clipRule="evenodd" /> },
    cancelled: { color: "text-red-600 bg-red-100 border-red-200", icon: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /> },
    completed: { color: "text-blue-600 bg-blue-100 border-blue-200", icon: <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /> },
  };

  const formatDate = useCallback((date) => new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), []);

  const getBookingStats = () => {
    const now = new Date().toISOString().split("T")[0];
    return {
      all: state.filteredBookings.length,
      status: state.filteredBookings.filter((b) => ["pending", "confirmed"].includes(b.status) && b.booking_date >= now).length,
      completed: state.filteredBookings.filter((b) => b.status === "completed" || (b.status === "confirmed" && b.booking_date < now)).length,
      cancellations: state.filteredBookings.filter((b) => ["cancel-requested", "cancelled"].includes(b.status)).length,
    };
  };

  if (state.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><FaSpinner className="animate-spin h-12 w-12 text-blue-600" /></div>;

  if (!user) {
    return (
      <>
        <Navbar user={user} onLogout={() => updateState({ modals: { logout: true } })} onLoginClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))} onSignupClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: false } }))} onChatbotClick={() => updateState({ isChatbotOpen: !state.isChatbotOpen })} />
        <Chatbot user={user} isOpen={state.isChatbotOpen} setIsOpen={(val) => updateState({ isChatbotOpen: val })} />
        <button onClick={() => updateState({ isChatbotOpen: !state.isChatbotOpen })} className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] z-40"><FaRobot size={24} /></button>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
            <button onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))} className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700">Log In</button>
          </div>
        </div>
      </>
    );
  }

  const stats = getBookingStats();
  const displayName = state.profileData.full_name || `${state.profileData.first_name} ${state.profileData.last_name}`.trim() || "User";

  const statCards = [
    { icon: <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />, label: "Current Bookings", value: stats.status, color: "blue" },
    { icon: <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />, label: "Completed", value: stats.completed, color: "green" },
    { icon: <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />, label: "Cancellations", value: stats.cancellations, color: "red" },
  ];

  const profileFields = [
    { label: "Email", value: user.email },
    { label: "Phone", value: state.profileData.phone || "Not provided" },
    { label: "First Name", value: state.profileData.first_name || "Not provided" },
    { label: "Last Name", value: state.profileData.last_name || "Not provided" },
    { label: "Middle Initial", value: state.profileData.middle_initial || "Not provided" },
    { label: "Member Since", value: state.profile?.created_at ? formatDate(state.profile.created_at) : "Unknown" },
  ];

  const editFields = [
    { label: "User name", key: "full_name", type: "text", placeholder: "Enter your full name" },
    { label: "Phone Number", key: "phone", type: "tel", placeholder: "Enter your phone number" },
    { label: "First Name", key: "first_name", type: "text", placeholder: "Enter your first name" },
    { label: "Last Name", key: "last_name", type: "text", placeholder: "Enter your last name" },
    { label: "Middle Initial", key: "middle_initial", type: "text", maxLength: 1, placeholder: "Enter middle initial" },
    { label: "Avatar URL", key: "avatar_url", type: "url", placeholder: "Enter avatar URL" },
  ];

  const passwordFields = [
    { label: "New Password", key: "newPassword", placeholder: "Enter new password" },
    { label: "Confirm New Password", key: "confirmPassword", placeholder: "Confirm new password" },
  ];

  const tabs = [
    { key: "all", label: `All (${stats.all})` },
    { key: "status", label: `Current (${stats.status})` },
    { key: "completed", label: `Completed (${stats.completed})` },
    { key: "cancellations", label: `Cancellations (${stats.cancellations})` },
  ];

  const statusGuide = [
    { status: "pending", label: "Pending", desc: "Awaiting confirmation", color: "yellow" },
    { status: "confirmed", label: "Confirmed", desc: "Booking confirmed", color: "green" },
    { status: "cancel-requested", label: "Cancel Requested", desc: "Awaiting cancellation approval", color: "orange" },
    { status: "cancelled", label: "Cancelled", desc: "Cancellation approved", color: "red" },
  ];

  const Button = ({ children, onClick, disabled, loading, className = "" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-white px-4 py-1.5 rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 ${className}`}
      style={{ backgroundColor: disabled || loading ? "#9ca3af" : "#00355f" }}
      onMouseEnter={(e) => !disabled && !loading && (e.currentTarget.style.backgroundColor = "#004a84")}
      onMouseLeave={(e) => !disabled && !loading && (e.currentTarget.style.backgroundColor = "#00355f")}
    >
      {loading && <FaSpinner className="animate-spin h-4 w-4" />}
      {children}
    </button>
  );

  return (
    <>
      <Navbar
        user={user}
        onLogout={() => updateState({ modals: { logout: true } })}
        onLoginClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))}
        onSignupClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: false } }))}
        onChatbotClick={() => updateState({ isChatbotOpen: !state.isChatbotOpen })}
      />
      <Chatbot user={user} isOpen={state.isChatbotOpen} setIsOpen={(val) => updateState({ isChatbotOpen: val })} />
      <button onClick={() => updateState({ isChatbotOpen: !state.isChatbotOpen })} className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] z-40"><FaRobot size={24} /></button>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden ring-4 ring-blue-100">
                {state.profileData.avatar_url ? <img src={state.profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
                <p className="text-gray-600 mb-2">{user.email}</p>
                {state.profile?.role && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">{state.profile.role}</span>}
                <div className="flex gap-4">
                  <Button onClick={() => updateState({ isEditingProfile: true })}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Button>
                  <Button onClick={() => updateState({ isChangingPassword: true })}>Change Password</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {statCards.map(({ icon, label, value, color }, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center">
                  <div className={`w-10 h-10 bg-${color}-100 rounded-md flex items-center justify-center`}>
                    <svg className={`w-5 h-5 text-${color}-600`} fill="currentColor" viewBox="0 0 20 20">{icon}</svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Profile Information</h2>
            {state.loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded"></div>
                <div className="h-4 w-60 bg-gray-100 rounded"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profileFields.map(({ label, value }, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className="text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-semibold text-gray-800">My Bookings</h2>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <input type="text" placeholder="Search bookings..." value={state.searchQuery} onChange={handleSearch} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64" />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="text-sm text-gray-600">Total: {state.filteredBookings.length}</div>
              </div>
            </div>

            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              {tabs.map(({ key, label }) => (
                <button key={key} onClick={() => updateState({ activeTab: key })} className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${state.activeTab === key ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>{label}</button>
              ))}
            </div>

            {state.loading ? (
              <div className="flex justify-center py-8"><FaSpinner className="animate-spin h-8 w-8 text-blue-600" /></div>
            ) : getFilteredBookings().length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="text-gray-600">{state.activeTab === "all" ? "No bookings found." : `No ${state.activeTab} bookings found.`}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Tour", "Booking Info", "Status", "Total", "Actions"].map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredBookings().map((booking) => {
                      const isPastDate = new Date(booking.booking_date) < new Date();
                      const isCompleted = booking.status === "completed" || (booking.status === "confirmed" && isPastDate);
                      const config = statusConfig[booking.status] || { color: "text-gray-600 bg-gray-100 border-gray-200" };
                      const isRejection = state.bookingFlags[booking.id]?.type === "rejected";

                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {booking.tours?.image && <img src={booking.tours.image} alt={booking.tours.title} className="w-16 h-16 object-cover rounded-lg mr-4" />}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.tours?.title || "Tour Unavailable"}</div>
                                <div className="text-sm text-gray-500">{booking.tours?.duration}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {[
                              { label: "Full Name", value: booking.profiles?.full_name || "Not provided" },
                              { label: "Gmail", value: booking.contact_email || "Not provided" },
                              { label: "Booked Tour", value: booking.tours?.title || "Not provided" },
                              { label: "Date", value: formatDate(booking.booking_date) },
                              { label: "Booked Date", value: formatDate(booking.created_at) },
                            ].map(({ label, value }, i) => (
                              <div key={i} className="mb-1"><span className="font-medium">{label}:</span> {value}</div>
                            ))}
                            {booking.special_requests && <div className="mt-2 p-2 bg-gray-50 rounded text-xs"><span className="font-medium">Notes:</span> {booking.special_requests}</div>}
                            {booking.status === "confirmed" && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-green-700">
                                <div className="font-semibold mb-2">BOOKING CONFIRMED</div>
                                <div><span className="font-medium">Confirmation ID:</span> #{booking.id.slice(-8).toUpperCase()}</div>
                                <div><span className="font-medium">Tour Price:</span> ₱{booking.tours?.price?.toLocaleString() || "N/A"} per person</div>
                                <div><span className="font-medium">Total Guests:</span> {booking.number_of_people}</div>
                                <div><span className="font-medium">Final Amount:</span> ₱{booking.total_price.toLocaleString()}</div>
                                {booking.tours?.duration && <div><span className="font-medium">Duration:</span> {booking.tours.duration}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${config.color}`}>
                              {config.icon && <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">{config.icon}</svg>}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("-", " ")}
                            </span>
                            {booking.status === "pending" && <div className="mt-1 text-xs text-yellow-600">Awaiting confirmation</div>}
                            {booking.status === "confirmed" && isPastDate && state.activeTab === "completed" && <div className="mt-1 text-xs text-blue-600">Tour Completed</div>}
                            {booking.status === "confirmed" && !isPastDate && <div className="mt-1 text-xs text-green-600">Ready for tour</div>}
                            {booking.status === "cancel-requested" && <div className="mt-1 text-xs text-orange-600">Requested on {formatDate(booking.created_at)}</div>}
                            {booking.status === "cancelled" && <div className="mt-1 text-xs text-red-600">Approved on {formatDate(booking.created_at)}</div>}
                            {isRejection && <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Cancellation declined</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">₱{booking.total_price.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              {(state.activeTab === "status" || state.activeTab === "all") && booking.status === "pending" ? (
                                <Button onClick={() => handleCancelRequest(booking.id)} disabled={state.requestingCancel === booking.id} loading={state.requestingCancel === booking.id}>
                                  {state.requestingCancel === booking.id ? "Requesting..." : "Request Cancel"}
                                </Button>
                              ) : booking.status === "cancel-requested" ? (
                                <span className="text-xs text-orange-500">Cancellation Pending</span>
                              ) : null}
                              {(state.activeTab === "completed" || state.activeTab === "all") && isCompleted && (
                                state.feedbackSubmitted.has(booking.id) ? (
                                  <span className="text-xs text-gray-500">Feedback Submitted</span>
                                ) : (
                                  <Button onClick={() => updateState({ feedbackBookingId: booking.id, feedbackData: { rating: 0, comments: "" }, modals: { feedback: true } })}>Provide Feedback</Button>
                                )
                              )}
                              {booking.status === "confirmed" && (state.activeTab === "status" || state.activeTab === "all") && !isRejection && <div className="text-xs text-gray-500">Contact support for cancellation</div>}
                              {isRejection && <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Cancellation declined</div>}
                              {!isCompleted && booking.status === "confirmed" && isPastDate && (state.activeTab === "status" || state.activeTab === "all") && <span className="text-xs text-gray-500">Tour completed</span>}
                              {booking.status === "cancelled" && <span className="text-xs text-red-500">Cancellation approved</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Booking Status Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {statusGuide.map(({ status, label, desc, color }, i) => (
                  <div key={i} className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border text-${color}-600 bg-${color}-100 border-${color}-200 mr-2`}>
                      {statusConfig[status]?.icon && <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">{statusConfig[status].icon}</svg>}
                      {label}
                    </span>
                    <span className="text-xs text-gray-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal show={state.isEditingProfile} setShow={(val) => updateState({ isEditingProfile: val })} title="Edit Profile" children={
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Update your profile information below</p>
          {editFields.map(({ label, key, type, maxLength, placeholder }) => (
            <InputField key={key} label={label} type={type} value={state.profileData[key]} onChange={(e) => setState(prev => ({ ...prev, profileData: { ...prev.profileData, [key]: e.target.value } }))} maxLength={maxLength} placeholder={placeholder} />
          ))}
        </div>
      } footer={
        <>
          <button onClick={() => updateState({ isEditingProfile: false })} className="px-5 py-2.5 text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-opacity-70">Cancel</button>
          <Button onClick={handleProfileUpdate} disabled={state.updating.profile} loading={state.updating.profile}>{state.updating.profile ? "Saving..." : "Save Profile"}</Button>
        </>
      } />

      <Modal show={state.isChangingPassword} setShow={(val) => updateState({ isChangingPassword: val })} title="Change Password" children={
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Enter your current and new password below</p>
          {passwordFields.map(({ label, key, placeholder }) => (
            <InputField key={key} label={label} type="password" value={state.passwordData[key]} onChange={(e) => setState(prev => ({ ...prev, passwordData: { ...prev.passwordData, [key]: e.target.value } }))} placeholder={placeholder} />
          ))}
          {state.passwordError && <p className="text-red-500 text-sm bg-red-50/50 p-2 rounded">{state.passwordError}</p>}
        </div>
      } footer={
        <>
          <button onClick={() => updateState({ isChangingPassword: false, passwordData: { oldPassword: "", newPassword: "", confirmPassword: "" }, passwordError: "" })} className="px-5 py-2.5 text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-opacity-70">Cancel</button>
          <Button onClick={handlePasswordChange} disabled={state.updating.password} loading={state.updating.password}>{state.updating.password ? "Updating..." : "Change Password"}</Button>
        </>
      } />

      <Modal show={state.modals.logout} setShow={(val) => updateState({ modals: { logout: val } })} title="Confirm Logout" children={<p className="text-gray-600 mb-6">Are you sure you want to log out?</p>} footer={
        <>
          <button onClick={() => updateState({ modals: { logout: false } })} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <Button onClick={handleLogout}>Logout</Button>
        </>
      } />

      <Modal show={state.modals.success} setShow={(val) => updateState({ modals: { success: val } })} title="Success" children={<p className="text-gray-600 mb-6">{state.messages.success}</p>} footer={<Button onClick={() => updateState({ modals: { success: false } })}>OK</Button>} />

      <Modal show={state.modals.error} setShow={(val) => updateState({ modals: { error: val } })} title="Error" children={<p className="text-gray-600 mb-6">{state.messages.error}</p>} footer={<Button onClick={() => updateState({ modals: { error: false } })}>OK</Button>} />

      <Modal show={state.modals.feedback} setShow={(val) => updateState({ modals: { feedback: val } })} title={`Feedback for ${state.bookings.find((b) => b.id === state.feedbackBookingId)?.tours?.title || "Tour"}`} children={
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar key={star} className={`h-6 w-6 cursor-pointer ${state.feedbackData.rating >= star ? "text-yellow-400" : "text-gray-300"}`} onClick={() => setState(prev => ({ ...prev, feedbackData: { ...prev.feedbackData, rating: star } }))} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={state.feedbackData.comments} onChange={(e) => setState(prev => ({ ...prev, feedbackData: { ...prev.feedbackData, comments: e.target.value } }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="4" placeholder="Share your experience..." />
          </div>
        </div>
      } footer={
        <>
          <button onClick={() => updateState({ modals: { feedback: false } })} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <Button onClick={handleFeedbackSubmit}>Submit Feedback</Button>
        </>
      } />
    </>
  );
}

export default Profile;