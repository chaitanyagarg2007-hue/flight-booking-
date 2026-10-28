import React from 'react';
import { FEATURED_DESTINATIONS } from '../utils/airlineData';
import { ArrowRight, Compass } from 'lucide-react';

export default function DestinationCards({ onSelectRoute }) {
  return (
    <div className="max-w-5xl mx-auto my-12 px-2">
      <div className="flex items-center space-x-2 mb-6">
        <Compass className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl sm:text-2xl font-black text-slate-800">
          Popular Weekend Getaways 🔥
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURED_DESTINATIONS.map((dest) => (
          <div
            key={dest.city}
            onClick={() => onSelectRoute(dest.from, dest.to)}
            className="group relative h-72 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5"
          >
            {/* Background Image with Dark Gradient Overlay */}
            <img
              src={dest.image}
              alt={dest.city}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* Top Badge */}
            <div className="absolute top-4 left-4">
              <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {dest.from} → {dest.to}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-2xl font-black tracking-tight group-hover:text-amber-300 transition">
                {dest.city}
              </h3>
              <p className="text-xs text-slate-300 font-medium mb-3">{dest.state}</p>

              <div className="flex justify-between items-center pt-2 border-t border-white/20">
                <div>
                  <span className="text-[10px] text-slate-300 block">Fares starting</span>
                  <span className="text-lg font-black text-white">₹{dest.fromPrice}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-blue-600 backdrop-blur-sm flex items-center justify-center transition">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}