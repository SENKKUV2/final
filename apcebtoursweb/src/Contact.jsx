import { CheckCircle, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot } from "react-icons/fa";

// Modal Component (from Profile/Tours)
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

const Contact = () => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    middleInitial: "",
    confirmPassword: ""
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetAuthForm = () =>
    setAuthForm({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      middleInitial: "",
      confirmPassword: ""
    });

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (error) throw error;
        setSuccessMessage("Login successful!");
        setShowSuccessModal(true);
        setShowAuthModal(false);
        resetAuthForm();
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              first_name: authForm.firstName,
              last_name: authForm.lastName,
              middle_initial: authForm.middleInitial,
            },
          },
        });
        if (error) throw error;
        setSuccessMessage(
          "Registration successful! Please check your email to verify your account."
        );
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
      setFormData((prev) => ({
        ...prev,
        email: ''
      }));
      setShowLogoutModal(false);
      setSuccessMessage("Logged out successfully");
      setShowSuccessModal(true);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLoginClick = () => {
    setIsLogin(true);
    setShowAuthModal(true);
  };

  const handleSignupClick = () => {
    setIsLogin(false);
    setShowAuthModal(true);
  };

  useEffect(() => {
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setFormData((prev) => ({
          ...prev,
          email: session?.user?.email || ''
        }));
        setLoadingUser(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [setUser]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setFormData((prev) => ({
        ...prev,
        email: user?.email || ''
      }));
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error: dbError } = await supabase
      .from("contacts")
      .insert([
        {
          user_id: user?.id || null,
          full_name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
      ]);

    if (dbError) {
      console.error("DB Insert Error:", dbError.message);
      setErrorMessage("Failed to save your message. Please try again.");
      setShowErrorModal(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Your message has been sent to the admin 🎉");
        setShowSuccessModal(true);
        setFormData({ fullName: "", email: "", subject: "", message: "" });
      } else {
        console.error("Email Error:", data.error);
        setErrorMessage("Saved, but failed to send email.");
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error("Function Error:", err);
      setErrorMessage("Something went wrong while sending email.");
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return <div className="p-6">Loading...</div>;
  }

  const contactInfo = [
    {
      icon: MapPin,
      label: 'Address',
      value: 'Cebu City, Philippines',
      subtext: 'Central Visayas Region'
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '+63 912 345 6789',
      subtext: 'Available during business hours'
    },
    {
      icon: Mail,
      label: 'Email',
      value: 'info@apcebuexperience.com',
      subtext: 'We respond within 24 hours'
    },
    {
      icon: Clock,
      label: 'Business Hours',
      value: 'Monday – Saturday',
      subtext: '8:00 AM – 6:00 PM (PHT)'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      <Navbar
        user={user}
        onLogout={handleLogoutClick}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)}
      />
      <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-4 right-4 text-white p-4 rounded-full shadow-lg hover:opacity-90 transition-all z-40"
        style={{ backgroundColor: '#00355f' }}
      >
        <FaRobot size={24} />
      </button>
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        authLoading={authLoading}
        handleAuth={handleAuth}
        authForm={authForm}
        setAuthForm={setAuthForm}
        resetAuthForm={resetAuthForm}
      />
      <LogoutModal
        showLogoutModal={showLogoutModal}
        setShowLogoutModal={setShowLogoutModal}
        handleLogout={handleLogout}
      />
      <SuccessModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        message={successMessage}
      />
      <ErrorModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        message={errorMessage}
      />
      <div className="text-white py-16" style={{ background: 'linear-gradient(to right, #00355f, #003d6b)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Contact <span style={{ color: '#eec218' }}>Us</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: '#f9fafb' }}>
            We're here to help. Reach out to us for inquiries, support, or bookings.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8" style={{ border: '1px solid #f9fafb' }}>
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: '#00355f' }}>Send us a Message</h2>
                <p style={{ color: '#6b7280' }}>Fill out the form below and we'll respond as soon as possible.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2" style={{ color: '#6b7280' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/50 border border-gray-300 focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-colors duration-300"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#6b7280' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/50 border border-gray-300 focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-colors duration-300"
                      placeholder="Enter your email address"
                      disabled={user}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2" style={{ color: '#6b7280' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/50 border border-gray-300 focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-colors duration-300"
                    placeholder="What's this about?"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2" style={{ color: '#6b7280' }}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/50 border border-gray-300 focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-colors duration-300 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-4 px-8 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 focus:outline-none focus:ring-4 ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                  style={{
                    backgroundColor: '#eec218',
                    color: '#00355f',
                    focusRingColor: 'rgba(238, 194, 24, 0.3)'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" style={{ color: '#00355f' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{user ? "Send Message" : "Sign In to Send Message"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-2xl shadow-xl text-white p-8" style={{ background: 'linear-gradient(to bottom right, #00355f, #003d6b)' }}>
              <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>
              <p className="mb-8 leading-relaxed" style={{ color: '#f9fafb' }}>
                Ready to explore the Philippines? Contact us today and let's plan your perfect adventure together.
              </p>
              <div className="space-y-6">
                {contactInfo.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: '#eec218' }}>
                        <IconComponent className="w-6 h-6" style={{ color: '#00355f' }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{item.label}</h4>
                        <p className="font-medium" style={{ color: '#eec218' }}>{item.value}</p>
                        <p className="text-sm" style={{ color: '#f9fafb' }}>{item.subtext}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 rounded-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <h4 className="font-semibold mb-2" style={{ color: '#eec218' }}>Our Promise</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#f9fafb' }}>
                  We respond to all inquiries within 24 hours. For urgent booking requests, call us directly for immediate assistance.
                </p>
              </div>
            </div>
            <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden" style={{ border: '1px solid #f9fafb' }}>
              <div className="h-64 relative">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125290.46903486244!2d123.80677597159772!3d10.315708154478!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a999258ddd0d1d%3A0x4c34cf8f05fd0d0!2sCebu%20City%2C%20Cebu%2C%20Philippines!5e0!3m2!1sen!2sph!4v1635000000000!5m2!1sen!2sph"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Cebu City Location Map"
                  className="absolute inset-0"
                />
              </div>
              <div className="p-4" style={{ backgroundColor: '#f9fafb' }}>
                <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                  <strong>Location:</strong> Cebu City, Central Visayas, Philippines
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 rounded-2xl p-8" style={{ backgroundColor: '#f9fafb' }}>
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4" style={{ color: '#00355f' }}>Frequently Asked Questions</h3>
            <p className="max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
              Quick answers to common questions about our tours and services.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#00355f' }}>How do I book a tour?</h4>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                You can book through our website, call us directly, or send us a message through this contact form.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#00355f' }}>What's included in tour packages?</h4>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Each package includes transportation, professional guide, and entrance fees. Meals and accommodation vary by tour.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#00355f' }}>Can I customize my tour?</h4>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Absolutely! We specialize in creating personalized experiences. Contact us to discuss your preferences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#00355f' }}>What's your cancellation policy?</h4>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Cancellations made 48+ hours in advance receive full refund. Contact us for specific policy details.
              </p>
            </div>
          </div>
        </div>
      </div>
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
};

// AuthModal Component
const AuthModal = ({
  showAuthModal,
  setShowAuthModal,
  isLogin,
  setIsLogin,
  authLoading,
  handleAuth,
  authForm,
  setAuthForm,
  resetAuthForm
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PasswordInput = ({ value, onChange, placeholder, show, setShow }) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        required
        className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
        placeholder={placeholder}
        minLength={6}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
        aria-label="Toggle password visibility"
      >
        {show ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.418 0-8-3.582-8-8s3.582-8 8-8c1.675 0 3.245.516 4.575 1.41M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.75 0h.008v.008h-.008V12zm-18 0h-.008v.008h.008V12z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      show={showAuthModal}
      setShow={setShowAuthModal}
      title={isLogin ? "Sign In" : "Create Account"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={authForm.firstName}
                onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                required={!isLogin}
                className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={authForm.lastName}
                onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })}
                required={!isLogin}
                className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
                placeholder="Last Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M.I. (Optional)</label>
              <input
                type="text"
                value={authForm.middleInitial}
                onChange={(e) => setAuthForm({ ...authForm, middleInitial: e.target.value })}
                maxLength={1}
                className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
                placeholder="M.I."
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            required
            className="w-full px-4 py-2.5 bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eec218] focus:border-[#eec218] transition-all placeholder-gray-400"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <PasswordInput
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            placeholder="Enter your password"
            show={showPassword}
            setShow={setShowPassword}
          />
        </div>
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <PasswordInput
              value={authForm.confirmPassword}
              onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              show={showConfirmPassword}
              setShow={setShowConfirmPassword}
            />
          </div>
        )}
        <button
          type="submit"
          disabled={authLoading}
          className="w-full py-3 font-semibold rounded-lg transition-colors text-white"
          style={{
            backgroundColor: authLoading ? "#9ca3af" : "#00355f",
          }}
          onMouseEnter={(e) => !authLoading && (e.currentTarget.style.backgroundColor = "#004a84")}
          onMouseLeave={(e) => !authLoading && (e.currentTarget.style.backgroundColor = "#00355f")}
        >
          {authLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-medium hover:underline"
          style={{ color: "#00355f" }}
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </Modal>
  );
};

// LogoutModal Component
const LogoutModal = ({ showLogoutModal, setShowLogoutModal, handleLogout }) => (
  <Modal
    show={showLogoutModal}
    setShow={setShowLogoutModal}
    title="Confirm Logout"
    maxWidth="max-w-sm"
  >
    <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
    <div className="flex justify-end space-x-4">
      <button
        onClick={() => setShowLogoutModal(false)}
        className="px-5 py-2.5 text-gray-600 bg-white/50 border border-gray-300 rounded-lg hover:bg-opacity-70"
      >
        Cancel
      </button>
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
        style={{ backgroundColor: "#00355f" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#004a84")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#00355f")}
      >
        Logout
      </button>
    </div>
  </Modal>
);

// SuccessModal Component
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

// ErrorModal Component
const ErrorModal = ({ showErrorModal, setShowErrorModal, message }) => (
  <Modal
    show={showErrorModal}
    setShow={setShowErrorModal}
    title="Error"
    maxWidth="max-w-sm"
  >
    <p className="text-gray-600 mb-6">{message}</p>
    <div className="flex justify-end">
      <button
        onClick={() => setShowErrorModal(false)}
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

export default Contact;