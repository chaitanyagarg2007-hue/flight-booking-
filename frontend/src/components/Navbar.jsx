import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Plane, User, LogOut, ShieldCheck, History, Search } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, setIsAuthOpen }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('search')} 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition"
          >
            <div className="bg-white p-2 rounded-xl text-blue-600">
              <Plane className="w-6 h-6 transform -rotate-45" />
            </div>
            <span className="text-2xl font-black tracking-tight">MyTrip</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === 'search' ? 'bg-blue-700 text-white' : 'hover:bg-blue-500/50 text-blue-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Flights</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === 'history' ? 'bg-blue-700 text-white' : 'hover:bg-blue-500/50 text-blue-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span>My Bookings</span>
              </button>
            )}

            {/* Admin Dashboard Tab (Only visible to Admins) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === 'admin' ? 'bg-amber-500 text-white' : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* User Profile & Auth Buttons */}
            <div className="pl-3 border-l border-blue-400/40 flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 text-sm bg-blue-700/60 px-3 py-1.5 rounded-full">
                    <User className="w-4 h-4 text-blue-200" />
                    <span className="font-medium text-blue-100">
                      {user?.name?.split(' ')[0]}
                    </span>
                    {isAdmin && (
                      <span className="bg-amber-400 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    title="Logout"
                    className="p-2 text-red-200 hover:text-white hover:bg-red-500/80 rounded-lg transition"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
}