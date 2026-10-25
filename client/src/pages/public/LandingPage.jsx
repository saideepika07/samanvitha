import React, { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { BRAND } from '../../config/brand.js';
import { getDashboardPathForRole } from '../../routes/RoleRoute.jsx';
import { Button } from '../../components/common/Button.jsx';
import {
  ArrowRight,
  Scale,
  ShieldCheck,
  HeartHandshake,
  Users2,
  Building2,
} from 'lucide-react';

export function LandingPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Logged-in users are allowed to open the landing page when navigating to a section anchor
  // (#how-it-works, #why-samanvitha, #future-scope, #roadmap) or when coming from navbar section links.
  // Plain visits to "/" right after login without a hash or navigation intent redirect to the dashboard.
  const hasSectionHash = Boolean(
    location.hash &&
    ['#how-it-works', '#why-samanvitha', '#future-scope', '#roadmap'].includes(
      location.hash.toLowerCase()
    )
  );

  const allowLanding = hasSectionHash || location.state?.fromNav;

  // Smooth scroll to target section when hash is present (respecting prefers-reduced-motion)
  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace('#', '');
    const scrollToTarget = () => {
      const element = document.getElementById(targetId);
      if (element) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        return true;
      }
      return false;
    };

    scrollToTarget();
    const timer1 = setTimeout(scrollToTarget, 100);
    const timer2 = setTimeout(scrollToTarget, 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [location.pathname, location.hash]);

  if (!loading && isAuthenticated && user && !allowLanding) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sand-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Logo Emblem */}
          <div className="relative mb-4 sm:mb-6">
            <img
              src={BRAND.logo}
              alt={`${BRAND.name} official emblem`}
              className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain mx-auto select-none"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Brand Name Wordmark matching exact reference typography with custom leaf & swash */}
          <h1 className="flex items-center justify-center my-2 sm:my-3">
            <span className="sr-only">{BRAND.name}</span>
            <img
              src={BRAND.wordmark}
              alt={BRAND.name}
              className="h-14 sm:h-16 md:h-20 lg:h-22 w-auto max-w-[90vw] sm:max-w-xl md:max-w-2xl object-contain select-none"
            />
          </h1>

          {/* Decorative Divider: Muted Gold Lines with Center Circular Accent */}
          <div
            className="flex items-center justify-center w-full max-w-[280px] sm:max-w-[380px] md:max-w-[440px] my-5 sm:my-6 gap-3 sm:gap-3.5"
            aria-hidden="true"
          >
            <div className="flex-1 h-[1px] bg-[#B8A179]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#B8A179] flex-shrink-0" />
            <div className="flex-1 h-[1px] bg-[#B8A179]" />
          </div>

          {/* English Tagline */}
          <p className="text-base sm:text-lg md:text-xl text-[#313B24] font-normal tracking-[0.04em] text-center max-w-2xl">
            {BRAND.tagline1}
          </p>

          {/* Telugu Tagline in Roman Script */}
          <p className="text-xs sm:text-sm md:text-base text-[#313B24]/90 tracking-wide text-center max-w-2xl mt-3 sm:mt-3.5 font-normal leading-relaxed">
            {BRAND.tagline2}
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base shadow-soft-md"
                icon={ArrowRight}
              >
                Get Started
              </Button>
            </Link>
            <Link to="/public-needs" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-7 py-3.5 text-base"
              >
                View Public Needs Board
              </Button>
            </Link>
          </div>

          {/* Short Mission Snippet */}
          <p className="mt-8 text-xs sm:text-sm text-charcoal-500 max-w-lg leading-relaxed">
            A need-based community donation network connecting donors with verified orphanages
            and old-age homes. Matching donations to actual stock deficits, urgency, and deadlines.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="scroll-mt-24 sm:scroll-mt-28 py-16 md:py-24 bg-sand-100/60 border-y border-sand-200/80 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-sage-700 uppercase tracking-wider bg-sage-50 px-3 py-1 rounded-full border border-sage-200">
              Clear 4-Step Process
            </span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">
              How Samanvitha Works
            </h2>
            <p className="mt-3 text-sm text-charcoal-600">
              Eliminating excess and shortages by aligning donor contributions with real unfulfilled deficits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-sand-50 p-6 rounded-2xl border border-sand-200 shadow-soft-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center font-serif font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-semibold text-charcoal-900 mb-2">
                Institutions State Real Needs
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Verified orphanages and old-age homes record required quantities, usable stock, and deadlines.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-sand-50 p-6 rounded-2xl border border-sand-200 shadow-soft-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-terracotta-100 text-terracotta-800 flex items-center justify-center font-serif font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-semibold text-charcoal-900 mb-2">
                Donors List Useful Resources
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Individuals, shops, or businesses list clothes, educational supplies, or packaged grains.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-sand-50 p-6 rounded-2xl border border-sand-200 shadow-soft-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-sand-200 text-charcoal-800 flex items-center justify-center font-serif font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-semibold text-charcoal-900 mb-2">
                Algorithmic Matching
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Purely data-driven ranking weighted by Urgency (35%), Demand (30%), Time (20%), and Feasibility (15%).
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-sand-50 p-6 rounded-2xl border border-sand-200 shadow-soft-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-sage-200 text-sage-900 flex items-center justify-center font-serif font-bold text-lg mb-4">
                4
              </div>
              <h3 className="text-base font-semibold text-charcoal-900 mb-2">
                Reservation & Delivery
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Resources are reserved, delivered, verified, and remaining need counts update in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Samanvitha Section */}
      <section id="why-samanvitha" className="scroll-mt-24 sm:scroll-mt-28 py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-terracotta-600 uppercase tracking-wider bg-terracotta-50 px-3 py-1 rounded-full border border-terracotta-200">
              Guiding Principles
            </span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-charcoal-900">
              Why Samanvitha?
            </h2>
            <p className="mt-3 text-sm text-charcoal-600">
              Traditional donation drives often flood homes with surplus perishables while critical supplies go unaddressed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/70 border border-sand-200 shadow-soft-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Zero Wastage Through Need Alignment
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                We calculate <span className="font-mono text-xs bg-sand-100 px-1.5 py-0.5 rounded">Remaining Need = max(0, required - stock - reserved)</span> on every item, ensuring items are only sent where an active gap exists.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/70 border border-sand-200 shadow-soft-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-terracotta-100 flex items-center justify-center text-terracotta-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Unbiased, Fair Ranking
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Donations are never ranked by institutional popularity, celebrity endorsement, or donor wealth. Small, overlooked homes receive equal algorithmic visibility based on their verified deficits.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/70 border border-sand-200 shadow-soft-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sand-200 flex items-center justify-center text-charcoal-800">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Non-Perishable, Lasting Impact
              </h3>
              <p className="text-sm text-charcoal-600 leading-relaxed">
                Version 1 focuses strictly on stable essentials: educational supplies, wearable clothes (including sarees), and dry packaged staples like rice and pulses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Scope Roadmap Strip (Volunteers & NGOs text only - no fake screens) */}
      <section
        id="future-scope"
        className="scroll-mt-24 sm:scroll-mt-28 py-12 bg-charcoal-900 text-sand-50 px-4 sm:px-6 lg:px-8 rounded-3xl max-w-7xl mx-auto w-full my-8 relative"
      >
        {/* Supporting both #future-scope and legacy #roadmap IDs */}
        <div id="roadmap" className="scroll-mt-24 absolute -top-24 left-0" aria-hidden="true" />
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-charcoal-700">
            <div>
              <span className="text-xs font-semibold text-terracotta-400 uppercase tracking-wider">
                Future Scope & Expansion
              </span>
              <h3 className="font-serif text-2xl font-bold text-white mt-1">
                Evolving the Community Network
              </h3>
            </div>
            <span className="text-xs text-charcoal-400 bg-charcoal-800 px-3 py-1.5 rounded-lg border border-charcoal-700">
              Roadmap (Post-v1)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sage-300 font-semibold text-sm">
                <Users2 className="w-4 h-4" />
                <span>Volunteers Coordination</span>
              </div>
              <p className="text-xs text-charcoal-300 leading-relaxed">
                Future phases will integrate verified community volunteers for localized parcel pickups, route consolidation, and direct handovers to elder residents and children.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-terracotta-300 font-semibold text-sm">
                <Building2 className="w-4 h-4" />
                <span>Partner NGO Alliances</span>
              </div>
              <p className="text-xs text-charcoal-300 leading-relaxed">
                Regional non-governmental organizations will be onboarded to perform periodic field audits, provide regional buffer storage, and coordinate multi-institution distribution during seasonal emergencies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <section className="py-16 text-center px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-serif text-3xl font-bold text-charcoal-900">
            Join the Need-Based Giving Movement
          </h2>
          <p className="text-sm text-charcoal-600">
            Register as a donor or an institution today to eliminate supply imbalances in community care.
          </p>
          <div className="pt-2">
            <Link to="/register">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
