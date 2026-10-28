import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  TrendingUp, Ticket, CheckCircle, XCircle, Users, Plus, 
  Plane, RefreshCw, AlertCircle, ShieldCheck, Calendar 
} from 'lucide-react';

export default function AdminPortal() {
  const [stats, setStats] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Schedule Flight Modal state
  const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);
  const [newFlight, setNewFlight] = useState({
    flight_number: '',
    airline_id: 1,
    departure_airport_id: 1,
    arrival_airport_id: 2,
    departure_time: '',
    arrival_time: '',
    price: '',
    available_seats: 100
  });
  const [flightSubmitLoading, setFlightSubmitLoading] = useState(false);
  const [flightSuccessMsg, setFlightSuccessMsg] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/bookings')
      ]);

      setStats(statsRes.data.overview);
      setAllBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin analytics. Ensure you are an Admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlight = async (e) => {
    e.preventDefault();
    setFlightSubmitLoading(true);
    setError('');

    try {
      const res = await api.post('/admin/flights', {
        ...newFlight,
        price: parseFloat(newFlight.price),
        available_seats: parseInt(newFlight.available_seats),
        airline_id: parseInt(newFlight.airline_id),
        departure_airport_id: parseInt(newFlight.departure_airport_id),
        arrival_airport_id: parseInt(newFlight.arrival_airport_id)
      });

      setFlightSuccessMsg(res.data.message || 'Flight scheduled successfully!');
      setIsAddFlightOpen(false);
      // Reset form
      setNewFlight({
        flight_number: '',
        airline_id: 1,
        departure_airport_id: 1,
        arrival_airport_id: 2,
        departure_time: '',
        arrival_time: '',
        price: '',
        available_seats: 100
      });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create flight.');
    } finally {
      setFlightSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold">Compiling administrative analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Restricted Operations Hub</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Flight Command Center</h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAdminData}
            className="flex items-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
          
          <button
            onClick={() => setIsAddFlightOpen(true)}
            className="flex items-center space-x-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Flight</span>
          </button>
        </div>
      </div>

      {flightSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{flightSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          
          {/* Revenue Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Gross Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{parseFloat(stats.totalRevenue).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">Realized confirmed fares</p>
            </div>
          </div>

          {/* Total Bookings Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
              <Ticket className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Total Reservations</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalBookings}</h3>
              <p className="text-[11px] text-blue-600 font-semibold">Across all routes</p>
            </div>
          </div>

          {/* Confirmed vs Cancelled */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Status Breakdown</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                <span className="text-emerald-600">{stats.confirmedBookings} Active</span> / <span className="text-rose-600">{stats.cancelledBookings} Canc.</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Soft-cancelled preservation</p>
            </div>
          </div>

          {/* Customers Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center space-x-4">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Registered Passengers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalCustomers}</h3>
              <p className="text-[11px] text-purple-600 font-semibold">Authenticated user accounts</p>
            </div>
          </div>

        </div>
      )}

      {/* Bookings Audit Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900">Passenger Reservations Ledger</h2>
            <p className="text-xs text-slate-400">Complete audit trail across all customers and routes</p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {allBookings.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Ref ID</th>
                <th className="py-3.5 px-6">Passenger Details</th>
                <th className="py-3.5 px-6">Flight</th>
                <th className="py-3.5 px-6">Route</th>
                <th className="py-3.5 px-6">Seats</th>
                <th className="py-3.5 px-6">Fare Paid</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Booked Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {allBookings.map((b) => (
                <tr key={b.booking_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">#{b.booking_id}</td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900">{b.customer_name}</p>
                    <p className="text-[11px] text-slate-400">{b.customer_email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-blue-600">{b.airline}</span>
                    <span className="text-slate-400 block text-[10px]">{b.flight_number}</span>
                  </td>
                  <td className="py-4 px-6 font-bold">
                    {b.departure_city} → {b.arrival_city}
                  </td>
                  <td className="py-4 px-6">{b.seats_booked}</td>
                  <td className="py-4 px-6 font-bold text-emerald-600">₹{b.total_price}</td>
                  <td className="py-4 px-6">
                    {b.status === 'CONFIRMED' ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        CONFIRMED
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        CANCELLED
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-400 text-[11px]">
                    {new Date(b.booking_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Schedule Flight Modal --- */}
      {isAddFlightOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Schedule New Flight</h2>
                  <p className="text-xs text-slate-400">Add a dynamic route to inventory</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddFlightOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFlight} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Flight Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI888"
                  value={newFlight.flight_number}
                  onChange={(e) => setNewFlight({ ...newFlight, flight_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Airline</label>
                <select
                  value={newFlight.airline_id}
                  onChange={(e) => setNewFlight({ ...newFlight, airline_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>Air India</option>
                  <option value={2}>IndiGo</option>
                  <option value={3}>Vistara</option>
                  <option value={4}>SpiceJet</option>
                  <option value={5}>Akasa Air</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Origin Airport</label>
                <select
                  value={newFlight.departure_airport_id}
                  onChange={(e) => setNewFlight({ ...newFlight, departure_airport_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>Delhi (DEL)</option>
                  <option value={2}>Mumbai (BOM)</option>
                  <option value={3}>Bangalore (BLR)</option>
                  <option value={6}>Kolkata (CCU)</option>
                  <option value={7}>Goa (GOI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Destination Airport</label>
                <select
                  value={newFlight.arrival_airport_id}
                  onChange={(e) => setNewFlight({ ...newFlight, arrival_airport_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>Delhi (DEL)</option>
                  <option value={2}>Mumbai (BOM)</option>
                  <option value={3}>Bangalore (BLR)</option>
                  <option value={6}>Kolkata (CCU)</option>
                  <option value={7}>Goa (GOI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Departure (YYYY-MM-DD HH:MM:SS)</label>
                <input
                  type="text"
                  required
                  placeholder="2026-11-05 10:00:00"
                  value={newFlight.departure_time}
                  onChange={(e) => setNewFlight({ ...newFlight, departure_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Arrival (YYYY-MM-DD HH:MM:SS)</label>
                <input
                  type="text"
                  required
                  placeholder="2026-11-05 12:30:00"
                  value={newFlight.arrival_time}
                  onChange={(e) => setNewFlight({ ...newFlight, arrival_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fare (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="5500"
                  value={newFlight.price}
                  onChange={(e) => setNewFlight({ ...newFlight, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Total Available Seats</label>
                <input
                  type="number"
                  required
                  value={newFlight.available_seats}
                  onChange={(e) => setNewFlight({ ...newFlight, available_seats: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2 pt-3">
                <button
                  type="submit"
                  disabled={flightSubmitLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {flightSubmitLoading ? 'Scheduling Flight...' : 'Confirm & Schedule Flight'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}