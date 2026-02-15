import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page) => {
        onPageChange(page);
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // Show all pages if total is less than max
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page
            pages.push(1);

            // Calculate range around current page
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Add ellipsis if needed
            if (start > 2) {
                pages.push('...');
            }

            // Add middle pages
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis if needed
            if (end < totalPages - 1) {
                pages.push('...');
            }

            // Show last page
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) {
        return null; // Don't show pagination if only one page
    }

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                Showing {startItem} to {endItem} of {totalItems} items
            </div>

            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={18} />
                    Previous
                </button>

                <div className="pagination-numbers">
                    {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageClick(page)}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                <button
                    className="pagination-btn"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                >
                    Next
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
