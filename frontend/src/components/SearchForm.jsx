import React, { useState } from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

const POPULAR_CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Goa', 'Kolkata', 'Hyderabad', 'Chennai', 'Pune'];

export default function SearchForm({ onSearch, loading }) {
  const [departure, setDeparture] = useState('Delhi');
  const [arrival, setArrival] = useState('Mumbai');
  const [date, setDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ departure, arrival, date });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 max-w-5xl mx-auto -mt-6 relative z-10">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Departure City */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
          <div className="relative">
            <MapPin className="w-5 h-5 absolute left-3.5 top-3 text-blue-600" />
            <select
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              {POPULAR_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Arrival City */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
          <div className="relative">
            <MapPin className="w-5 h-5 absolute left-3.5 top-3 text-orange-500" />
            <select
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              {POPULAR_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Travel Date (Optional)</label>
          <div className="relative">
            <Calendar className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Search Submit Button */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition duration-150 shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
            <span>{loading ? 'Searching...' : 'Find Flights'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}