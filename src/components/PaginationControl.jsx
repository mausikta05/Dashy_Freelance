import React from 'react';

export function PaginationControl({ currentPage, totalPages, onPageChange }) {
  return (
    <div className='pagination-container'>
      <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
      <span>Page {currentPage} of {totalPages}</span>
      <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  );
}
