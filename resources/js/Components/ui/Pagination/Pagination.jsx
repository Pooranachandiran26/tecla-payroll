import { ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames } from '../../../Utils/formatters';

export default function Pagination({
  currentPage, totalPages, totalItems, itemsPerPage, onPageChange,
}) {
  // Generate page numbers
  const pages = [];
  const maxPagesToShow = 5;
  
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    if (currentPage <= 3) end = 4;
    if (currentPage >= totalPages - 2) start = totalPages - 3;
    
    for (let i = start; i <= end; i++) pages.push(i);
    
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
      </div>
      <ul className="pagination">
        <li className={classNames('page-item', currentPage === 1 && 'disabled')}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
        </li>
        
        {pages.map((page, index) => (
          <li key={index} className={classNames('page-item', page === currentPage && 'active', page === '...' && 'disabled')}>
            <button 
              className="page-link"
              onClick={() => page !== '...' && onPageChange(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          </li>
        ))}
        
        <li className={classNames('page-item', currentPage === totalPages && 'disabled')}>
          <button 
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </li>
      </ul>
    </div>
  );
}
