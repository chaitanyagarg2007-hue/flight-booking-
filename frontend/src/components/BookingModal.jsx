import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle, Ticket, AlertCircle } from 'lucide-react';

export default function BookingModal({ flight, isOpen, onClose, onBookingSuccess }) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  if (!isOpen || !flight) return null;

  const maxBookableSeats = Math.min(flight.available_seats, 5);
  const totalPrice = seats * parseFloat(flight.price);

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/book', {
        flightId: flight.id,
        customerName,
        email,
        seats: parseInt(seats),
      });

      setTicket(res.data.ticket);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Booking transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={() => {
            setTicket(null);
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- View 1: Confirmed Ticket View (After Booking) --- */}
        {ticket ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900">Booking Confirmed!</h2>
            <p className="text-sm text-slate-500 mb-6">Your flight ticket has been issued successfully.</p>

            {/* Boarding Pass Card */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 text-left mb-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                <span className="font-bold text-blue-600 text-lg">{ticket.airline}</span>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  {ticket.flight_number}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Passenger</p>
                  <p className="font-bold text-slate-800">{ticket.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Booking ID</p>
                  <p className="font-bold text-slate-800">#{ticket.booking_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Route</p>
                  <p className="font-bold text-slate-800">{ticket.departure_city} → {ticket.arrival_city}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Seats Booked</p>
                  <p className="font-bold text-slate-800">{ticket.seats_booked} Seat(s)</p>
                </div>
              </div>
              <div className="border-t border-slate-200 mt-4 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Paid</span>
                <span className="text-xl font-black text-emerald-600">₹{ticket.price_paid}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setTicket(null);
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition"
            >
              Done & Close
            </button>
          </div>
        ) : (
          /* --- View 2: Booking Form --- */
          <div className="p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Confirm Reservation</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {flight.airline} ({flight.flight_number}) • {flight.departure_city} to {flight.arrival_city}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Passenger Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email for Ticket Receipt</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Number of Passengers (Seats)</label>
                <select
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                >
                  {[...Array(maxBookableSeats).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} Passenger{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Calculation Box */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex justify-between items-center my-4">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Total Fare</p>
                  <p className="text-xs text-slate-500">₹{flight.price} × {seats} Seat{seats > 1 ? 's' : ''}</p>
                </div>
                <p className="text-2xl font-black text-blue-700">₹{totalPrice.toLocaleString('en-IN')}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? 'Processing Transaction...' : `Confirm & Pay ₹${totalPrice.toLocaleString('en-IN')}`}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
