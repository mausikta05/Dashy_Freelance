import React from 'react';

export function StatusBadge({ status }) {
  const statusClass = (status || 'active').toLowerCase();
  return <span className={\adge badge-\\}>{status}</span>;
}
