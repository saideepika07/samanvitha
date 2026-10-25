import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar.jsx';
import { BRAND } from '../config/brand.js';
import { HeartHandshake } from 'lucide-react';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-sand-50 text-charcoal-900 selection:bg-sage-100">
      <Navbar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-sand-200/80 bg-sand-100/50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="w-9 h-9 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <p className="font-cinzel font-bold text-base text-[#313B24] tracking-wide">{BRAND.name}</p>
              <p className="text-xs text-charcoal-500">{BRAND.tagline1}</p>
            </div>
          </div>

          <p className="text-xs text-charcoal-500 text-center md:text-right max-w-md">
            Need-based community donation network. Matching verified orphanages & old-age homes with resources based on urgency and unfulfilled stock.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
