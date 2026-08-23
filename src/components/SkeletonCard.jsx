import React from 'react';

export function SkeletonCard() {
  return (
    <div className='skeleton-card'>
      <div className='skeleton-line title'></div>
      <div className='skeleton-line subtitle'></div>
      <div className='skeleton-line body'></div>
    </div>
  );
}
