import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plane, Calendar, Clock, Ticket, CheckCircle, XCircle, AlertCircle, RefreshCw, Printer } from 'lucide-react';
import { AIRLINE_INFO } from '../utils/airlineData';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/history');
      setBookings(res.data.history || []);
    } catch (err) {
      setError('Failed to fetch your booking history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm(`Are you sure you want to cancel Booking #${bookingId}? Your seats will be returned to inventory.`)) {
      return;
    }

    setCancellingId(bookingId);
    setActionMessage('');

    try {
      const res = await api.post('/cancel', { bookingId });
      setActionMessage(`✅ Booking #${bookingId} successfully cancelled! Seats restored.`);
      // Refresh history to reflect updated status
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold">Loading your flight reservations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Flight Bookings</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your tickets, view boarding details or cancel</p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length > 0 ? (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isCancelled = booking.status === 'CANCELLED';
            const airlineMeta = AIRLINE_INFO[booking.airline] || {
              code: 'FL',
              color: 'bg-blue-600 text-white'
            };

            const bookDate = booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-IN') : '';
            const travelDate = booking.departure_time ? new Date(booking.departure_time).toLocaleDateString('en-IN') : '';
            const travelTime = booking.departure_time ? booking.departure_time.substring(11, 16) : '';

            return (
              <div 
                key={booking.booking_id}
                className={`bg-white rounded-3xl border transition overflow-hidden shadow-sm hover:shadow-md ${
                  isCancelled ? 'border-slate-200 opacity-80' : 'border-slate-200/90'
                }`}
              >
                {/* Header Bar */}
                <div className={`px-6 py-3.5 flex justify-between items-center text-xs font-bold ${
                  isCancelled ? 'bg-slate-100 text-slate-500' : 'bg-blue-50/70 text-blue-900 border-b border-blue-100/50'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-4 h-4 text-blue-600" />
                    <span>Booking Reference: #{booking.booking_id}</span>
                    <span className="text-slate-400 font-normal">• Booked on {bookDate}</span>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center space-x-1.5">
                    {isCancelled ? (
                      <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>CANCELLED</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>CONFIRMED</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* Airline & Route */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${airlineMeta.color}`}>
                      {airlineMeta.code}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{booking.airline}</h3>
                      <p className="text-xs text-slate-400 font-bold tracking-wider">{booking.flight_number}</p>
                      <div className="flex items-center space-x-3 text-xs text-slate-600 mt-2 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{travelDate}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{travelTime}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Origin to Destination */}
                  <div className="text-left md:text-center">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-black text-slate-800">{booking.departure_city}</span>
                      <div className="w-12 h-[2px] bg-slate-300 relative">
                        <Plane className="w-3.5 h-3.5 text-blue-600 absolute -top-1.5 left-1/2 transform -translate-x-1/2 rotate-90" />
                      </div>
                      <span className="text-xl font-black text-slate-800">{booking.arrival_city}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {booking.seats_booked} Passenger{booking.seats_booked > 1 ? 's' : ''} Reserved
                    </p>
                  </div>

                  {/* Actions (Print / Cancel) */}
                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Pass</span>
                    </button>

                    {!isCancelled ? (
                      <button
                        onClick={() => handleCancel(booking.booking_id)}
                        disabled={cancellingId === booking.booking_id}
                        className="px-5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        {cancellingId === booking.booking_id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {booking.cancelled_at ? `Cancelled on ${new Date(booking.cancelled_at).toLocaleDateString()}` : 'Booking Cancelled'}
                      </span>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No flight bookings found</h3>
          <p className="text-xs text-slate-400 mt-1">Book your first flight from the Search tab to see it here!</p>
        </div>
      )}

    </div>
  );
}