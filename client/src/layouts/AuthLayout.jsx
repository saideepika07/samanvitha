import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BRAND } from '../config/brand.js';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header Logo */}
      <div className="max-w-md mx-auto w-full flex justify-center mb-6">
        <Link to="/" className="flex items-center gap-3 group focus-visible:outline-sage-600 rounded-lg p-1">
          <img
            src={BRAND.logo}
            alt={BRAND.name}
            className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <span className="font-cinzel text-2xl font-bold tracking-[0.06em] text-[#313B24] group-hover:text-sage-700 transition-colors">
              {BRAND.name}
            </span>
            <span className="text-[11px] font-medium text-charcoal-500 uppercase tracking-wider -mt-0.5">
              {BRAND.tagline1}
            </span>
          </div>
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md mx-auto w-full">
        <Outlet />
      </div>

      {/* Bottom Sub-brand */}
      <div className="mt-8 text-center">
        <p className="text-xs text-charcoal-400">
          {BRAND.name} • {BRAND.tagline1}
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
