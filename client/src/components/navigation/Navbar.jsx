import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { BRAND } from '../../config/brand.js';
import { ROLES } from '../../config/roles.js';
import { Button } from '../common/Button.jsx';
import { getDashboardPathForRole } from '../../routes/RoleRoute.jsx';
import { LogOut, LayoutDashboard, Menu, X, HeartHandshake, ChevronRight } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      return hashId === 'roadmap' ? 'future-scope' : hashId;
    }
    return '';
  });

  const currentSection = location.pathname === '/' ? activeSection : '';

  // Track active section on landing page via IntersectionObserver and scroll position
  useEffect(() => {
    if (location.pathname !== '/') return;

    const sectionIds = ['how-it-works', 'why-samanvitha', 'future-scope'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -55% 0px',
        threshold: 0.05,
      }
    );

    elements.forEach((el) => observer.observe(el));

    const handleScroll = () => {
      if (window.scrollY < 180) {
        setActiveSection('');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, location.hash]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/';

  // Smooth scroll handler for section links (respects prefers-reduced-motion, works on / and across pages)
  const handleSectionClick = (e, sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      const targetId = sectionId === 'roadmap' ? 'future-scope' : sectionId;
      const element = document.getElementById(targetId);
      if (element) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        window.history.pushState(null, '', `/#${sectionId}`);
        setActiveSection(targetId);
      }
    } else {
      e.preventDefault();
      navigate(`/#${sectionId}`, { state: { fromNav: true } });
    }
  };

  const getNavLinkClass = (isActive) =>
    `text-sm font-medium transition-all whitespace-nowrap px-3 py-1.5 rounded-xl border ${
      isActive
        ? 'text-sage-900 bg-sage-100/90 font-semibold shadow-soft-sm border-sage-200/80'
        : 'text-charcoal-700 hover:text-sage-800 hover:bg-sand-100/70 border-transparent'
    }`;

  const getMobileNavLinkClass = (isActive) =>
    `text-sm font-medium py-2.5 px-3 rounded-xl transition-colors min-h-[44px] flex items-center justify-between border ${
      isActive
        ? 'text-sage-900 font-semibold bg-sage-100 border-sage-200 shadow-soft-sm'
        : 'text-charcoal-700 hover:text-sage-700 hover:bg-sand-100/70 border-transparent'
    }`;

  // Role-specific navigation links for mobile drawer
  const roleNavItems = user?.role === ROLES.DONOR
    ? [
        { label: 'Donor Overview', to: '/donor/dashboard' },
        { label: 'Create Donation', to: '/donor/create-donation' },
        { label: 'My Listed Donations', to: '/donor/my-donations' },
        { label: 'Match Suggestions', to: '/donor/matches' },
        { label: 'Notifications', to: '/donor/notifications' },
        { label: 'Donor Profile', to: '/donor/profile' },
      ]
    : user?.role === ROLES.INSTITUTION
    ? [
        { label: 'Institution Overview', to: '/institution/dashboard' },
        { label: 'Post New Need', to: '/institution/needs/new' },
        { label: 'Needs Directory', to: '/institution/my-needs' },
        { label: 'Incoming Requests', to: '/institution/incoming-requests' },
        { label: 'Received History', to: '/institution/received-donations' },
        { label: 'Verification Standing', to: '/institution/verification-status' },
        { label: 'Alerts', to: '/institution/notifications' },
        { label: 'Care Home Profile', to: '/institution/profile' },
      ]
    : user?.role === ROLES.ADMIN
    ? [
        { label: 'Admin Overview', to: '/admin/dashboard' },
        { label: 'Verification Reviews', to: '/admin/verifications' },
        { label: 'Users Directory', to: '/admin/users' },
        { label: 'Disputes & Exceptions', to: '/admin/disputes' },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sand-200/80 bg-sand-50/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo & Name - Strictly non-overlapping */}
          <Link
            to="/"
            state={{ fromNav: true }}
            className="flex items-center gap-2.5 sm:gap-3.5 group focus-visible:outline-sage-600 rounded-lg p-1 shrink-0"
          >
            {!imageError ? (
              <img
                src={BRAND.logo}
                alt={`${BRAND.name} emblem`}
                onError={() => setImageError(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain group-hover:scale-105 transition-transform shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-sage-100 border border-sage-300 flex items-center justify-center text-sage-700 shrink-0"
                title="Logo asset missing placeholder"
              >
                <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="flex flex-col shrink-0">
              <span className="font-cinzel text-lg sm:text-2xl font-bold tracking-[0.06em] text-[#313B24] group-hover:text-sage-700 transition-colors whitespace-nowrap">
                {BRAND.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-charcoal-500 tracking-wider uppercase -mt-0.5 whitespace-nowrap">
                Community Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on xl: 1280px and above, no overlap) */}
          <nav className="hidden xl:flex items-center gap-2 lg:gap-3 2xl:gap-4 shrink-0" aria-label="Main Navigation">
            <Link
              to="/#how-it-works"
              onClick={(e) => handleSectionClick(e, 'how-it-works')}
              className={getNavLinkClass(currentSection === 'how-it-works')}
            >
              How it works
            </Link>
            <Link
              to="/#why-samanvitha"
              onClick={(e) => handleSectionClick(e, 'why-samanvitha')}
              className={getNavLinkClass(currentSection === 'why-samanvitha')}
            >
              Why Samanvitha
            </Link>
            <Link
              to="/public-needs"
              className={getNavLinkClass(location.pathname === '/public-needs')}
            >
              Public Needs Board
            </Link>
            <Link
              to="/#future-scope"
              onClick={(e) => handleSectionClick(e, 'future-scope')}
              className={getNavLinkClass(
                currentSection === 'future-scope' || currentSection === 'roadmap'
              )}
            >
              Future Scope
            </Link>
          </nav>

          {/* Desktop Auth Actions (Visible on xl: 1280px and above) */}
          <div className="hidden xl:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(dashboardPath)}
                  icon={LayoutDashboard}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  icon={LogOut}
                  title="Sign out of account"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile / Narrow Screen Menu Button (Visible below 1280px) */}
          <div className="flex xl:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-charcoal-700 hover:bg-sand-100 focus-visible:outline-sage-600 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-sand-200 bg-sand-50 px-4 sm:px-6 pt-3 pb-6 space-y-5 shadow-soft-sm max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Public Network Navigation */}
          <div>
            <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2">
              Explore Community Network
            </p>
            <nav className="flex flex-col gap-1">
              <Link
                to="/#how-it-works"
                onClick={(e) => handleSectionClick(e, 'how-it-works')}
                className={getMobileNavLinkClass(currentSection === 'how-it-works')}
              >
                <span>How it works</span>
                {currentSection === 'how-it-works' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                )}
              </Link>
              <Link
                to="/#why-samanvitha"
                onClick={(e) => handleSectionClick(e, 'why-samanvitha')}
                className={getMobileNavLinkClass(currentSection === 'why-samanvitha')}
              >
                <span>Why Samanvitha</span>
                {currentSection === 'why-samanvitha' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                )}
              </Link>
              <Link
                to="/public-needs"
                onClick={() => setMobileMenuOpen(false)}
                className={getMobileNavLinkClass(location.pathname === '/public-needs')}
              >
                <span>Public Needs Board</span>
                {location.pathname === '/public-needs' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                )}
              </Link>
              <Link
                to="/#future-scope"
                onClick={(e) => handleSectionClick(e, 'future-scope')}
                className={getMobileNavLinkClass(
                  currentSection === 'future-scope' || currentSection === 'roadmap'
                )}
              >
                <span>Future Scope</span>
                {(currentSection === 'future-scope' || currentSection === 'roadmap') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                )}
              </Link>
            </nav>
          </div>

          {/* Role Dashboard Quick Navigation (when authenticated) */}
          {isAuthenticated && roleNavItems.length > 0 && (
            <div className="pt-3 border-t border-sand-200">
              <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2">
                Your Portal Workspace
              </p>
              <div className="flex flex-col gap-1">
                {roleNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-sm font-medium text-charcoal-800 hover:text-sage-800 py-2.5 px-3 rounded-xl hover:bg-sand-100/70 transition-colors min-h-[44px]"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-sand-200 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    navigate(dashboardPath);
                    setMobileMenuOpen(false);
                  }}
                  icon={LayoutDashboard}
                >
                  My Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-center text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                  icon={LogOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full justify-center">
                    Log in
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
