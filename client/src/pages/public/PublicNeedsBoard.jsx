import React, { useState, useEffect } from 'react';
import needService from '../../services/needService.js';
import { CATEGORIES } from '../../config/categories.js';
import NeedCard from '../../components/cards/NeedCard.jsx';
import NeedsBoardMap from '../../components/needs/NeedsBoardMap.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Search, Filter, ShieldCheck, ArrowUpDown, Sparkles, LayoutGrid, Map as MapIcon } from 'lucide-react';

export function PublicNeedsBoard() {
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency', 'deadline', 'remaining'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'

  const loadNeeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await needService.getPublicNeeds({ search, category, urgency });
      setNeeds(data || []);
    } catch (err) {
      console.error('Failed to load public needs:', err);
      setError(err.message || 'Failed to load community needs from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNeeds();
  }, [search, category, urgency]);

  // Sort logic (purely objective parameters: urgency, deadline, unfulfilled deficit)
  const sortedNeeds = [...needs].sort((a, b) => {
    if (sortBy === 'urgency') {
      const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (order[b.urgency] || 0) - (order[a.urgency] || 0);
    }
    if (sortBy === 'deadline') {
      return new Date(a.deadline || '2099-01-01') - new Date(b.deadline || '2099-01-01');
    }
    if (sortBy === 'remaining') {
      return (b.remainingNeed || 0) - (a.remainingNeed || 0);
    }
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200">
            Open Community Needs Board
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 tracking-tight">
          Live Needs Board
        </h1>
        <p className="mt-2 text-sm sm:text-base text-charcoal-600 leading-relaxed">
          Open deficits from verified orphanages and old-age homes. Quantities are calculated in real time:
          <span className="font-mono text-xs bg-sand-100 text-charcoal-800 px-1.5 py-0.5 rounded ml-1.5 border border-sand-200">
            Remaining = max(0, required - usable stock - reserved)
          </span>
        </p>
      </div>

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Unable to Load Live Needs"
          message={error}
          onRetry={loadNeeds}
        />
      )}

      {/* Search, Category, Urgency, & Sorting Filter Bar */}
      {!error && (
        <div className="p-4 sm:p-5 bg-white/90 rounded-3xl border border-sand-200 shadow-soft-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search items, homes, or descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>

            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-2xl bg-sand-50 border border-sand-300 text-charcoal-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 transition"
              >
                <option value="all">All Permitted Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full h-11 px-3.5 rounded-2xl bg-sand-50 border border-sand-300 text-charcoal-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 transition"
              >
                <option value="all">Any Urgency Level</option>
                <option value="Critical">{"Critical (< 48h Deficit)"}</option>
                <option value="High">High Urgency</option>
                <option value="Medium">Medium Urgency</option>
                <option value="Low">Low Urgency</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sand-200/70 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-charcoal-500" />
                <span className="font-semibold text-charcoal-700">Sort By:</span>
              </div>
              <button
                type="button"
                onClick={() => setSortBy('urgency')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center ${
                  sortBy === 'urgency'
                    ? 'bg-sage-600 text-white shadow-soft-sm'
                    : 'bg-sand-100 text-charcoal-700 hover:bg-sand-200'
                }`}
              >
                Highest Urgency
              </button>
              <button
                type="button"
                onClick={() => setSortBy('remaining')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center ${
                  sortBy === 'remaining'
                    ? 'bg-sage-600 text-white shadow-soft-sm'
                    : 'bg-sand-100 text-charcoal-700 hover:bg-sand-200'
                }`}
              >
                Largest Remaining Deficit
              </button>
              <button
                type="button"
                onClick={() => setSortBy('deadline')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center ${
                  sortBy === 'deadline'
                    ? 'bg-sage-600 text-white shadow-soft-sm'
                    : 'bg-sand-100 text-charcoal-700 hover:bg-sand-200'
                }`}
              >
                Closest Deadline
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-charcoal-500">
                Showing <strong>{sortedNeeds.length}</strong> verified needs
              </span>

              {/* View Switcher: Grid vs Map */}
              <div className="flex items-center p-0.5 bg-sand-200/70 rounded-xl border border-sand-300/80">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-charcoal-900 shadow-soft-sm'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'map'
                      ? 'bg-white text-sage-800 shadow-soft-sm'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                  title="Map View"
                >
                  <MapIcon className="w-3.5 h-3.5 text-sage-600" />
                  <span>Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content: Map View or Grid View */}
      {!error && (
        viewMode === 'map' ? (
          loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-charcoal-500">Loading map markers...</p>
            </div>
          ) : (
            <NeedsBoardMap needs={sortedNeeds} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-charcoal-500">Fetching live community needs...</p>
              </div>
            ) : sortedNeeds.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-3 shadow-soft-sm">
                <p className="font-serif text-xl font-bold text-charcoal-900">
                  No matching community needs found
                </p>
                <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
                  Try clearing your search query or choosing "All Permitted Categories".
                </p>
              </div>
            ) : (
              sortedNeeds.map((need) => <NeedCard key={need._id || need.id} need={need} />)
            )}
          </div>
        )
      )}

      {/* Anti-Bias Notice Footer */}
      <div className="p-4 rounded-2xl bg-sand-100/70 border border-sand-200 text-xs text-charcoal-600 text-center max-w-2xl mx-auto leading-relaxed">
        <strong>Fair Giving Policy:</strong> Samanvitha ranks items exclusively by urgency, remaining unfulfilled demand, and deadlines. Homes are never prioritized based on donor popularity, celebrity patronage, or institutional wealth.
      </div>
    </div>
  );
}

export default PublicNeedsBoard;
