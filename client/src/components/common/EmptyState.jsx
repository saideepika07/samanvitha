import React from 'react';
import { Button } from './Button.jsx';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no active records matching your criteria.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-3xl border border-sand-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-soft-sm space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto text-charcoal-500">
        <Icon className="w-7 h-7 text-sage-700" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-serif text-xl font-bold text-charcoal-900">{title}</h3>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction} icon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
