import React from 'react';

export function Skeleton({ className = '', variant = 'rect', ...props }) {
  const baseStyles = 'animate-pulse bg-sand-200/70';

  const variants = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4 w-full',
    card: 'rounded-3xl p-6 min-h-[160px]',
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant] || variants.rect} ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-sand-200 p-6 space-y-4 shadow-soft-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-sand-200 rounded-md" />
        <div className="h-6 w-20 bg-sand-200 rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-sand-200 rounded-md" />
      <div className="h-4 w-1/2 bg-sand-200 rounded-md" />
      <div className="h-16 w-full bg-sand-100 rounded-2xl" />
      <div className="pt-3 border-t border-sand-100 flex justify-between">
        <div className="h-4 w-28 bg-sand-200 rounded-md" />
        <div className="h-8 w-24 bg-sand-200 rounded-xl" />
      </div>
    </div>
  );
}

export default Skeleton;
