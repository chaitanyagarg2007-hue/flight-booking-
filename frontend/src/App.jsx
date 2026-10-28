import React, { useState, useEffect } from 'react';
import api from './api/axios';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import SearchForm from './components/SearchForm';
import FlightCard from './components/FlightCard';
import BookingModal from './components/BookingModal';
import DestinationCards from './components/DestinationCards';
import MyBookings from './components/MyBookings';
import AdminPortal from './components/AdminPortal';
import { Plane, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { isAuthenticated, isAdmin } = useAuth();

  // Initial search on load (Delhi -> Mumbai)
  useEffect(() => {
    handleSearch({ departure: 'Delhi', arrival: 'Mumbai', date: '' });
  }, []);

  const handleSearch = async ({ departure, arrival, date }) => {
    setLoading(true);
    setSearchMessage('');
    try {
      const res = await api.post('/search', { departure, arrival, date });
      setFlights(res.data.flights || []);
      setSearchMessage(res.data.message || '');
    } catch (err) {
      setSearchMessage('Failed to search flights. Please ensure backend is running.');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  // Click on featured destination card (Goa, Mumbai, etc.)
  const handleSelectFeaturedRoute = (fromCity, toCity) => {
    handleSearch({ departure: fromCity, arrival: toCity, date: '' });
    const resultsElement = document.getElementById('results-section');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookClick = (flight) => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedFlight(flight);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setIsAuthOpen={setIsAuthOpen} 
      />

      {/* Main App Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* --- TAB 1: FLIGHT SEARCH & BOOKING --- */}
        {activeTab === 'search' && (
          <div>
            {/* Hero Header */}
            <div className="text-center py-6 mb-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                India's Trusted Flight Booking Engine
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mt-3">
                Where to next, Explorer? ✈️
              </h1>
              <p className="mt-2 text-slate-500 font-medium text-base sm:text-lg">
                Book direct domestic flights with instant ticket confirmation
              </p>
            </div>

            {/* Flight Search Bar */}
            <SearchForm onSearch={handleSearch} loading={loading} />

            {/* Clickable Destination Cards Grid */}
            <DestinationCards onSelectRoute={handleSelectFeaturedRoute} />

            {/* Search Results Section */}
            <div className="max-w-5xl mx-auto mt-6" id="results-section">
              <div className="flex justify-between items-center mb-6 px-2">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Available Flights</h2>
                  <p className="text-xs text-slate-500 font-medium">{searchMessage || 'Showing direct flights'}</p>
                </div>
                <span className="text-xs font-bold bg-slate-200/70 text-slate-700 px-3 py-1 rounded-full">
                  {flights.length} Flights Available
                </span>
              </div>

              {/* Flights List */}
              {loading ? (
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <Plane className="w-10 h-10 text-blue-600 animate-bounce mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">Connecting to flight inventory...</p>
                </div>
              ) : flights.length > 0 ? (
                <div className="space-y-4">
                  {flights.map((flight) => (
                    <FlightCard 
                      key={flight.id} 
                      flight={flight} 
                      onBookClick={handleBookClick} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">No flights found for this route.</p>
                  <p className="text-xs text-slate-400 mt-1">Try clicking on Goa or Mumbai destination cards above!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: MY BOOKINGS (Real User Dashboard) --- */}
        {activeTab === 'history' && (
          <MyBookings />
        )}

        {/* --- TAB 3: ADMIN COMMAND CENTER (Real Admin Portal) --- */}
        {activeTab === 'admin' && isAdmin && (
          <AdminPortal />
        )}

      </main>

      {/* Global Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />

      {/* Booking Modal */}
      <BookingModal
        flight={selectedFlight}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingSuccess={() => {
          handleSearch({ departure: selectedFlight.departure_city, arrival: selectedFlight.arrival_city, date: '' });
        }}
      />
    </div>
  );
}