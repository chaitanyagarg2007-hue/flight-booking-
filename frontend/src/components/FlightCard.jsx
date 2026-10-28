import React, { useState } from 'react';
import { Plane, Clock, AlertTriangle, ChevronDown, ChevronUp, Luggage, Coffee, RefreshCcw } from 'lucide-react';
import { AIRLINE_INFO } from '../utils/airlineData';

export default function FlightCard({ flight, onBookClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSoldOut = flight.available_seats === 0;
  const isLowSeats = flight.available_seats > 0 && flight.available_seats < 10;
  const airlineMeta = AIRLINE_INFO[flight.airline] || {
    code: 'FL',
    color: 'bg-blue-600 text-white',
    tag: 'Standard Carrier',
    badgeBg: 'bg-slate-100 text-slate-700'
  };

  const depTime = flight.departure_time ? flight.departure_time.substring(11, 16) : '--:--';
  const depDate = flight.departure_time ? flight.departure_time.substring(0, 10) : '';

  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-200 border border-slate-200/90 overflow-hidden">
      
      {/* Main Flight Summary Row */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Airline Brand Section */}
        <div className="flex items-center space-x-3.5 min-w-[210px]">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${airlineMeta.color}`}>
            {airlineMeta.code}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-slate-900 text-base">{flight.airline}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${airlineMeta.badgeBg}`}>
                {airlineMeta.tag}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mt-0.5">
              Flight {flight.flight_number}
            </p>
          </div>
        </div>

        {/* Flight Route & Timings */}
        <div className="flex items-center space-x-6 flex-1 justify-center w-full md:w-auto">
          <div className="text-left">
            <p className="text-2xl font-black text-slate-900">{depTime}</p>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{flight.departure_city}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{depDate}</p>
          </div>

          <div className="flex flex-col items-center px-4 flex-1 max-w-[150px]">
            <span className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-blue-500" />
              <span>Direct Flight</span>
            </span>
            <div className="w-full h-[2px] bg-slate-200 relative">
              <Plane className="w-4 h-4 text-blue-600 absolute -top-2 left-1/2 transform -translate-x-1/2 rotate-90" />
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-black text-slate-900">Arrival</p>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{flight.arrival_city}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">On Schedule</p>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-left md:text-right">
            <p className="text-3xl font-black text-slate-900">₹{parseFloat(flight.price).toLocaleString('en-IN')}</p>
            
            {isLowSeats && (
              <p className="text-xs font-bold text-orange-600 flex items-center space-x-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Hurry! Only {flight.available_seats} seats left</span>
              </p>
            )}

            {!isLowSeats && !isSoldOut && (
              <p className="text-xs text-emerald-600 font-semibold">{flight.available_seats} seats available</p>
            )}

            {isSoldOut && (
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Sold Out</p>
            )}
          </div>

          <button
            onClick={() => onBookClick(flight)}
            disabled={isSoldOut}
            className={`mt-3 px-7 py-3 rounded-2xl font-black text-sm transition-all duration-150 shadow-md ${
              isSoldOut 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 transform hover:-translate-y-0.5'
            }`}
          >
            {isSoldOut ? 'Sold Out' : 'Book Flight'}
          </button>
        </div>

      </div>

      {/* Expandable Flight Details Bar */}
      <div className="bg-slate-50/80 px-6 py-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
        <div className="flex items-center space-x-4 text-slate-500">
          <span className="flex items-center space-x-1">
            <Luggage className="w-3.5 h-3.5 text-slate-400" />
            <span>15 kg Check-in</span>
          </span>
          <span className="flex items-center space-x-1">
            <Coffee className="w-3.5 h-3.5 text-slate-400" />
            <span>In-flight snack</span>
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition"
        >
          <span>{isExpanded ? 'Hide Details' : 'Flight & Baggage Details'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Accordion Drawer */}
      {isExpanded && (
        <div className="bg-slate-100/60 p-6 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
            <p className="font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
              <Luggage className="w-4 h-4 text-blue-600" />
              <span>Baggage Policy</span>
            </p>
            <p className="text-slate-500 leading-relaxed">Cabin Baggage: 7 kg per passenger. Check-in Baggage: 15 kg (1 piece only).</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
            <p className="font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
              <RefreshCcw className="w-4 h-4 text-emerald-600" />
              <span>Cancellation & Refunds</span>
            </p>
            <p className="text-slate-500 leading-relaxed">Instant soft-cancellation supported via dashboard. Seat restored to inventory instantly.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
            <p className="font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>Seat & Aircraft</span>
            </p>
            <p className="text-slate-500 leading-relaxed">Standard 3-3 configuration on modern Airbus A320neo / Boeing 737 aircraft.</p>
          </div>
        </div>
      )}

    </div>
  );
}