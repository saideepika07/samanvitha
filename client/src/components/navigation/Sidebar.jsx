import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { BRAND } from '../../config/brand.js';
import { ROLES, ROLE_LABELS } from '../../config/roles.js';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Sparkles,
  Bell,
  User,
  ClipboardList,
  Inbox,
  ShieldCheck,
  Users,
  AlertOctagon,
  LogOut,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile collapsible menu whenever the location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  // Donor links
  const donorNavItems = [
    { label: 'Overview', to: '/donor/dashboard', icon: LayoutDashboard },
    { label: 'Create Donation', to: '/donor/create-donation', icon: PlusCircle },
    { label: 'My Donations', to: '/donor/my-donations', icon: Package },
    { label: 'Match Suggestions', to: '/donor/matches', icon: Sparkles },
    { label: 'Notifications', to: '/donor/notifications', icon: Bell },
    { label: 'Profile', to: '/donor/profile', icon: User },
  ];

  // Institution links
  const institutionNavItems = [
    { label: 'Overview', to: '/institution/dashboard', icon: LayoutDashboard },
    { label: 'Create Need', to: '/institution/needs/new', icon: PlusCircle },
    { label: 'My Needs', to: '/institution/my-needs', icon: ClipboardList },
    { label: 'Incoming Requests', to: '/institution/incoming-requests', icon: Inbox },
    { label: 'Received Donations', to: '/institution/received-donations', icon: Package },
    { label: 'Verification Status', to: '/institution/verification-status', icon: ShieldCheck },
    { label: 'Notifications', to: '/institution/notifications', icon: Bell },
    { label: 'Profile', to: '/institution/profile', icon: User },
  ];

  // Admin links
  const adminNavItems = [
    { label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Institution Reviews', to: '/admin/verifications', icon: ShieldCheck },
    { label: 'Users Directory', to: '/admin/users', icon: Users },
    { label: 'Disputes & Issues', to: '/admin/disputes', icon: AlertOctagon },
  ];

  const navItems =
    user.role === ROLES.DONOR
      ? donorNavItems
      : user.role === ROLES.INSTITUTION
      ? institutionNavItems
      : adminNavItems;

  const currentItem = navItems.find((item) => item.to === location.pathname) || navItems[0];
  const CurrentIcon = currentItem?.icon || LayoutDashboard;

  return (
    <>
      {/* Mobile Collapsible Sidebar Menu (Small screens: 360px, 390px, 768px below lg) */}
      <div className="lg:hidden w-full bg-white border-b border-sand-200 shadow-soft-xs sticky top-0 z-30">
        <div className="p-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-sand-50 border border-sand-200 text-charcoal-800 text-xs font-semibold min-h-[44px] cursor-pointer hover:bg-sand-100 transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle workspace navigation menu"
          >
            <div className="flex items-center gap-2.5 truncate">
              <CurrentIcon className="w-4 h-4 text-sage-600 flex-shrink-0" />
              <span className="truncate">{currentItem?.label || 'Menu'}</span>
              <span className="text-[10px] text-charcoal-400 font-normal uppercase tracking-wider ml-1">
                • {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-charcoal-600 flex-shrink-0 ml-2">
              <span className="text-[11px] font-medium">{mobileMenuOpen ? 'Hide Menu' : 'Workspace Menu'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {mobileMenuOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-sand-200 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-sage-600 text-white shadow-soft-sm'
                          : 'text-charcoal-700 hover:bg-sand-100 hover:text-charcoal-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </NavLink>
                );
              })}

              <div className="pt-2 border-t border-sand-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-red-700 hover:bg-red-50/60 transition-colors min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-sand-200/80 bg-sand-50 min-h-[calc(100vh-5rem)] flex-col justify-between p-4">
        <div className="space-y-6">
          {/* User Card */}
          <div className="p-3.5 bg-white/70 rounded-2xl border border-sand-200 shadow-soft-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-100 border border-sage-200 flex items-center justify-center text-sage-800 font-serif font-bold text-lg">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-900 truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-500" />
                  <p className="text-xs text-charcoal-500 font-medium">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1" aria-label="Role Navigation">
            <p className="px-3 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-sage-600 text-white shadow-soft-sm'
                        : 'text-charcoal-700 hover:bg-sand-100 hover:text-charcoal-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-sand-200 space-y-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-600 hover:text-red-700 hover:bg-red-50/60 transition-colors cursor-pointer min-h-[44px]"
          >
            <LogOut className="w-4 h-4 text-charcoal-400 group-hover:text-red-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
