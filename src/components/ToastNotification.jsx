import React from 'react';

export function ToastNotification({ message, type = 'info', onClose }) {
  if (!message) return null;
  return (
    <div className={\	oast toast-\\}>
      <span>{message}</span>
      <button onClick={onClose}>&times;</button>
    </div>
  );
}
