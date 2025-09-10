import { CheckCircle, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authDetails, setAuthDetails] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    middleInitial: '',
    confirmPassword: ''
  });

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
  }, []);

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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setFormData((prev) => ({
        ...prev,
        email: ''
      }));
      alert("Logged out successfully");
    } catch (err) {
      alert("Error logging out");
      console.error("Logout error:", err);
    }
  };

  const resetAuthForm = () => {
    setAuthDetails({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleInitial: '',
      confirmPassword: ''
    });
    setAuthError(null);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: authDetails.email,
          password: authDetails.password
        });

        if (error) {
          throw error;
        }

        alert("Login successful!");
        setShowAuthModal(false);
        resetAuthForm();
      } else {
        if (authDetails.password !== authDetails.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const { error } = await supabase.auth.signUp({
          email: authDetails.email,
          password: authDetails.password,
          options: {
            data: {
              first_name: authDetails.firstName,
              last_name: authDetails.lastName,
              middle_initial: authDetails.middleInitial
            }
          }
        });

        if (error) {
          throw error;
        }

        alert("Sign-up successful! Please check your email to confirm.");
        setShowAuthModal(false);
        resetAuthForm();
      }
    } catch (error) {
      console.error("Auth error:", error);
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
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
    if (!user) {
      setShowAuthModal(true);
      setIsLogin(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .insert([
          {
            user_id: user.id,
            full_name: formData.fullName,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
          }
        ]);

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      setFormData({
        fullName: '',
        email: user.email || '',
        subject: '',
        message: ''
      });

      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error("Contact form submission error:", error);
      alert(`Failed to send message: ${error.message}`);
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
    <div className="min-h-screen bg-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onLoginClick={() => {
          setShowAuthModal(true);
          setIsLogin(true);
        }}
        onSignupClick={() => {
          setShowAuthModal(true);
          setIsLogin(false);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        authLoading={authLoading}
        handleAuth={handleAuthSubmit}
        email={authDetails.email}
        setEmail={(value) => setAuthDetails(prev => ({ ...prev, email: value }))}
        password={authDetails.password}
        setPassword={(value) => setAuthDetails(prev => ({ ...prev, password: value }))}
        firstName={authDetails.firstName}
        setFirstName={(value) => setAuthDetails(prev => ({ ...prev, firstName: value }))}
        lastName={authDetails.lastName}
        setLastName={(value) => setAuthDetails(prev => ({ ...prev, lastName: value }))}
        middleInitial={authDetails.middleInitial}
        setMiddleInitial={(value) => setAuthDetails(prev => ({ ...prev, middleInitial: value }))}
        confirmPassword={authDetails.confirmPassword}
        setConfirmPassword={(value) => setAuthDetails(prev => ({ ...prev, confirmPassword: value }))}
        authError={authError}
      />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Contact <span className="text-yellow-400">Us</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            We're here to help. Reach out to us for inquiries, support, or bookings.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Message */}
        {isSubmitted && (
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">Message Sent Successfully!</h3>
                <p className="text-green-700">Your message has been sent. We'll get back to you soon!</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                <p className="text-gray-600">Fill out the form below and we'll respond as soon as possible.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors duration-300 hover:border-yellow-300"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors duration-300 hover:border-yellow-300"
                      placeholder="Enter your email address"
                      disabled={user}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors duration-300 hover:border-yellow-300"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors duration-300 hover:border-yellow-300 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold py-4 px-8 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 focus:outline-none focus:ring-4 focus:ring-yellow-200 ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-xl text-white p-8">
              <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>
              <p className="text-blue-100 mb-8 leading-relaxed">
                Ready to explore the Philippines? Contact us today and let's plan your perfect adventure together.
              </p>

              <div className="space-y-6">
                {contactInfo.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="bg-yellow-400 p-3 rounded-lg">
                        <IconComponent className="w-6 h-6 text-blue-900" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{item.label}</h4>
                        <p className="text-yellow-100 font-medium">{item.value}</p>
                        <p className="text-blue-200 text-sm">{item.subtext}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Response Promise */}
              <div className="mt-8 bg-blue-800 bg-opacity-50 rounded-lg p-6">
                <h4 className="font-semibold text-yellow-400 mb-2">Our Promise</h4>
                <p className="text-blue-100 text-sm leading-relaxed">
                  We respond to all inquiries within 24 hours. For urgent booking requests, call us directly for immediate assistance.
                </p>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-600 mb-1">Interactive Map</h4>
                  <p className="text-sm">Google Maps integration coming soon</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Location:</strong> Cebu City, Central Visayas, Philippines
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Quick answers to common questions about our tours and services.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How do I book a tour?</h4>
              <p className="text-gray-600 text-sm">
                You can book through our website, call us directly, or send us a message through this contact form.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What's included in tour packages?</h4>
              <p className="text-gray-600 text-sm">
                Each package includes transportation, professional guide, and entrance fees. Meals and accommodation vary by tour.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I customize my tour?</h4>
              <p className="text-gray-600 text-sm">
                Absolutely! We specialize in creating personalized experiences. Contact us to discuss your preferences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What's your cancellation policy?</h4>
              <p className="text-gray-600 text-sm">
                Cancellations made 48+ hours in advance receive full refund. Contact us for specific policy details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated Auth Modal Component
const AuthModal = ({
  showAuthModal,
  setShowAuthModal,
  isLogin,
  setIsLogin,
  authLoading,
  handleAuth,
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  middleInitial,
  setMiddleInitial,
  confirmPassword,
  setConfirmPassword,
  authError
}) => {
  if (!showAuthModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#00355f' }}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              onClick={() => setShowAuthModal(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-lg font-semibold" style={{ color: '#00355f' }}>
                {authError}
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* First Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                  {/* Last Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                  {/* Middle Initial Field (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      M.I. (Optional)
                    </label>
                    <input
                      type="text"
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value)}
                      maxLength={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="M.I."
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 font-semibold rounded-lg transition-colors"
              style={{
                backgroundColor: authLoading ? '#ccc' : '#00355f',
                color: 'white'
              }}
            >
              {authLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium hover:underline"
              style={{ color: '#00355f' }}
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;