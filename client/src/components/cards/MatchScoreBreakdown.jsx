import React from 'react';
import { MATCHING_WEIGHT_PERCENTAGES } from '../../config/matching.js';
import { Sparkles, AlertCircle, Clock, Truck, TrendingUp } from 'lucide-react';

export function MatchScoreBreakdown({ matchResult, className = '' }) {
  const { finalScore, components } = matchResult;

  const componentList = [
    {
      id: 'urgency',
      title: 'Need Urgency',
      weightStr: MATCHING_WEIGHT_PERCENTAGES.urgency,
      data: components.urgency,
      icon: AlertCircle,
      barColor: 'bg-terracotta-500',
      description: `Need rated as ${components.urgency.label} priority`,
    },
    {
      id: 'unfulfilledDemand',
      title: 'Unfulfilled Demand',
      weightStr: MATCHING_WEIGHT_PERCENTAGES.unfulfilledDemand,
      data: components.unfulfilledDemand,
      icon: TrendingUp,
      barColor: 'bg-sage-600',
      description: `Offered ${components.unfulfilledDemand.offeredQuantity} units against ${components.unfulfilledDemand.remainingNeed} remaining need`,
    },
    {
      id: 'timeSensitivity',
      title: 'Time Sensitivity',
      weightStr: MATCHING_WEIGHT_PERCENTAGES.timeSensitivity,
      data: components.timeSensitivity,
      icon: Clock,
      barColor: 'bg-amber-500',
      description: `Target deadline: ${components.timeSensitivity.deadline || 'Flexible'}`,
    },
    {
      id: 'deliveryFeasibility',
      title: 'Delivery Feasibility',
      weightStr: MATCHING_WEIGHT_PERCENTAGES.deliveryFeasibility,
      data: components.deliveryFeasibility,
      icon: Truck,
      barColor: 'bg-charcoal-700',
      description: components.deliveryFeasibility.distanceText
        ? `${components.deliveryFeasibility.distanceText} • ${components.deliveryFeasibility.donorLocation || 'Donor'} ↔ ${components.deliveryFeasibility.institutionLocation || 'Home'}`
        : components.deliveryFeasibility.distanceKm != null
        ? `${components.deliveryFeasibility.distanceKm} km • ${components.deliveryFeasibility.donorLocation || 'Donor'} ↔ ${components.deliveryFeasibility.institutionLocation || 'Home'}`
        : `Distance unknown • ${components.deliveryFeasibility.donorLocation || 'Donor'} ↔ ${components.deliveryFeasibility.institutionLocation || 'Home'}`,
    },
  ];

  return (
    <div className={`p-5 bg-sand-50/80 rounded-2xl border border-sand-200/90 space-y-4 ${className}`}>
      {/* Top Score Callout */}
      <div className="flex items-center justify-between pb-3 border-b border-sand-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Algorithmic Match Score
            </h4>
            <p className="text-[11px] text-charcoal-400">Purely data-driven alignment</p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-serif text-2xl font-bold text-sage-800">
            {finalScore}
          </span>
          <span className="text-xs text-charcoal-500 font-semibold ml-0.5">/ 100</span>
        </div>
      </div>

      {/* 4 Components List */}
      <div className="space-y-3">
        {componentList.map((item) => {
          const Icon = item.icon;
          const score = item.data.score || 0;
          const weighted = item.data.weightedScore || 0;

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-charcoal-800 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                  <span>{item.title}</span>
                  <span className="text-[10px] text-charcoal-400 font-mono">
                    ({item.weightStr} wt)
                  </span>
                </span>
                <span className="text-charcoal-700 font-mono text-[11px]">
                  <strong>{score}</strong>/100 → +{weighted} pts
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-sand-200/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${item.barColor}`}
                  style={{ width: `${Math.min(100, score)}%` }}
                />
              </div>

              <p className="text-[10px] text-charcoal-500 italic pl-5 truncate">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MatchScoreBreakdown;
