import { CheckCircle, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";
import Chatbot from "./AI/Chatbot";
import { FaRobot } from "react-icons/fa";

const Contact = () => {
  const { user, setUser } = useAuth(); // Use global user state from AuthContext
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false); // Chatbot state

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
      window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }));
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
        onLoginClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: true } }))}
        onSignupClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { isLogin: false } }))}
        onChatbotClick={() => setIsChatbotOpen(!isChatbotOpen)} // Chatbot toggle
      />

      {/* Chatbot Modal */}
      <Chatbot user={user} isOpen={isChatbotOpen} setIsOpen={setIsChatbotOpen} />

      {/* Floating Chatbot Button */}
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-4 right-4 bg-[#00355f] text-white p-4 rounded-full shadow-lg hover:bg-[#E91E63] transition-colors z-40"
      >
        <FaRobot size={24} />
      </button>

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

export default Contact;