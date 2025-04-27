import React, { useState, useEffect, useMemo } from 'react';
import {
  sortDeliveries,
  filterDeliveries,
  paginateDeliveries,
  getTotalPages,
  formatDate,
  getStatusDisplayText
} from '../../utils/sortFilterUtils';
import './DeliveryHistoryTable.css';

const DeliveryHistoryTable = ({
  deliveries,
  loading,
  businesses = {},
  couriers = {},
  showBusinessColumn = false,
  showCourierColumn = false
}) => {
  // State for sorting
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // State for filtering
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    searchText: ''
  });

  // State for validation error
  const [filterError, setFilterError] = useState('');

  // State for active filters
  const [activeFilters, setActiveFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    searchText: ''
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State for showing filters
  const [showFilters, setShowFilters] = useState(false);

  // Processed data
  const [processedDeliveries, setProcessedDeliveries] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Extract unique statuses and date ranges from deliveries
  const { uniqueStatuses, minDate, maxDate } = useMemo(() => {
    if (!deliveries || deliveries.length === 0) {
      return { uniqueStatuses: [], minDate: '', maxDate: '' };
    }

    // Get unique statuses
    const statuses = new Set();
    let earliestDate = new Date();
    let latestDate = new Date(0); // Jan 1, 1970

    deliveries.forEach(delivery => {
      if (delivery.status) {
        statuses.add(delivery.status);
      }

      // Track date range
      if (delivery.createdAt) {
        const createdDate = new Date(delivery.createdAt);
        if (createdDate < earliestDate) earliestDate = createdDate;
        if (createdDate > latestDate) latestDate = createdDate;
      }

      if (delivery.deliveredAt) {
        const deliveredDate = new Date(delivery.deliveredAt);
        if (deliveredDate > latestDate) latestDate = deliveredDate;
      }
    });

    // Format dates for input[type="date"]
    const formatDateForInput = (date) => {
      return date.toISOString().split('T')[0];
    };

    return {
      uniqueStatuses: Array.from(statuses),
      minDate: formatDateForInput(earliestDate),
      maxDate: formatDateForInput(latestDate)
    };
  }, [deliveries]);

  // Process data when deliveries, sorting, filtering, or pagination changes
  useEffect(() => {
    if (loading) return;

    // Apply filters
    const filteredDeliveries = filterDeliveries(deliveries, activeFilters);
    setTotalItems(filteredDeliveries.length);

    // Apply sorting
    const sortedDeliveries = sortDeliveries(filteredDeliveries, sortField, sortDirection);

    // Apply pagination
    const paginatedDeliveries = paginateDeliveries(sortedDeliveries, currentPage, pageSize);

    // Update processed data
    setProcessedDeliveries(paginatedDeliveries);

    // Update total pages
    setTotalPages(getTotalPages(filteredDeliveries.length, pageSize));

    // Reset to first page if no results on current page
    if (paginatedDeliveries.length === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [deliveries, sortField, sortDirection, activeFilters, currentPage, pageSize, loading]);

  // Handle sort click
  const handleSort = (field) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }

    // Reset to first page
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    // Update filters
    const updatedFilters = {
      ...filters,
      [name]: value
    };

    // If changing startDate, update endDate min attribute
    if (name === 'startDate' && value) {
      // Clear error when user is fixing the date range
      if (filterError) setFilterError('');
    }

    // If changing endDate, update startDate max attribute
    if (name === 'endDate' && value) {
      // Clear error when user is fixing the date range
      if (filterError) setFilterError('');
    }

    setFilters(updatedFilters);
  };

  // Apply filters
  const applyFilters = () => {
    // Validate date range
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      if (startDate > endDate) {
        setFilterError('שגיאה: תאריך ההתחלה לא יכול להיות אחרי תאריך הסיום');
        return;
      }
    }

    // Clear any previous errors
    setFilterError('');

    // Apply filters
    setActiveFilters({...filters});
    setCurrentPage(1);
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilters = {
      status: 'all',
      startDate: '',
      endDate: '',
      searchText: ''
    };

    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setCurrentPage(1);
    setFilterError('');
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // Render pagination controls
  const renderPagination = () => {
    // Always show pagination controls, even when there are no items
    const pageNumbers = [];
    const maxVisiblePages = 5;

    // If there are no items, just show page 1
    if (totalItems === 0) {
      return (
        <div className="pagination">
          <div className="pagination-info">
            מציג 0 - 0 מתוך 0 משלוחים
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="page-size-select"
              style={{ marginInline: '0.5rem' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            בעמוד
          </div>

          <div className="pagination-controls">
            <button className="pagination-button" disabled>
              &laquo;
            </button>
            <button className="pagination-button" disabled>
              &lsaquo;
            </button>
            <button className="pagination-button active">
              1
            </button>
            <button className="pagination-button" disabled>
              &rsaquo;
            </button>
            <button className="pagination-button" disabled>
              &raquo;
            </button>
          </div>
        </div>
      );
    }

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          מציג {Math.min((currentPage - 1) * pageSize + 1, totalItems)} - {Math.min(currentPage * pageSize, totalItems)} מתוך {totalItems} משלוחים
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="page-size-select"
            style={{ marginInline: '0.5rem' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          בעמוד
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            &laquo;
          </button>

          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lsaquo;
          </button>

          {pageNumbers.map(number => (
            <button
              key={number}
              className={`pagination-button ${currentPage === number ? 'active' : ''}`}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </button>
          ))}

          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &rsaquo;
          </button>

          <button
            className="pagination-button"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            &raquo;
          </button>
        </div>
      </div>
    );
  };

  // Render sort icon
  const renderSortIcon = (field) => {
    if (field !== sortField) return null;

    return (
      <span className="sort-icon">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (loading) {
    return <p className="loading">טוען היסטוריית משלוחים...</p>;
  }

  return (
    <div className="delivery-history-container">
      {/* Filters - only show when there's data */}
      {deliveries.length > 0 && (
        <>
          {/* הצג את הכפתור רק במובייל */}
          <div className="mobile-only">
            <button
              className="toggle-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "הסתר סינון ומיון" : "הצג סינון ומיון"}
            </button>
          </div>

          {/* הצג תמיד בדסקטופ או כאשר showFilters=true במובייל */}
          <div className={`delivery-history-filters ${showFilters ? 'show-mobile' : 'hide-mobile'}`}>
            <div className="filter-group">
              <label htmlFor="searchText">חיפוש</label>
              <input
                type="text"
                id="searchText"
                name="searchText"
                value={filters.searchText}
                onChange={handleFilterChange}
                placeholder="שם לקוח, כתובת, טלפון, מספר משלוח"
              />
            </div>

            {uniqueStatuses.length > 0 && (
              <div className="filter-group">
                <label htmlFor="status">סטטוס</label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="all">הכל</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {getStatusDisplayText(status)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {minDate && maxDate && (
              <>
                <div className="filter-group">
                  <label htmlFor="startDate">מתאריך</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    min={minDate}
                    max={filters.endDate || maxDate}
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="endDate">עד תאריך</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    min={filters.startDate || minDate}
                    max={maxDate}
                  />
                </div>
              </>
            )}

            <div className="filter-actions">
              <button
                className="btn-filter btn-apply"
                onClick={applyFilters}
              >
                החל סינון
              </button>

              <button
                className="btn-filter btn-reset"
                onClick={resetFilters}
              >
                איפוס
              </button>
            </div>

            {filterError && (
              <div className="filter-error">
                {filterError}
              </div>
            )}
          </div>
        </>
      )}

      {/* Table view (desktop) and Card view (mobile) */}
      {processedDeliveries.length > 0 ? (
        <>
          {/* Table view - only for desktop */}
          <div className="table-container desktop-only">
            <table className="delivery-history-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('customerName')} style={{width: '15%'}}>
                    {renderSortIcon('customerName')}
                    שם לקוח
                  </th>
                  <th onClick={() => handleSort('phoneNumber')} style={{width: '12%'}}>
                    {renderSortIcon('phoneNumber')}
                    טלפון
                  </th>
                  <th onClick={() => handleSort('deliveryAddress')} style={{width: '20%'}}>
                    {renderSortIcon('deliveryAddress')}
                    כתובת
                  </th>
                  {showBusinessColumn && (
                    <th onClick={() => handleSort('businessId')} style={{width: '12%'}}>
                      {renderSortIcon('businessId')}
                      עסק
                    </th>
                  )}
                  {showCourierColumn && (
                    <th onClick={() => handleSort('curierId')} style={{width: '12%'}}>
                      {renderSortIcon('curierId')}
                      שליח
                    </th>
                  )}
                  <th onClick={() => handleSort('status')} style={{width: '10%'}}>
                    {renderSortIcon('status')}
                    סטטוס
                  </th>
                  <th onClick={() => handleSort('createdAt')} style={{width: '12%'}}>
                    {renderSortIcon('createdAt')}
                    תאריך
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedDeliveries.map(delivery => (
                  <tr key={delivery.id}>
                    <td>{delivery.customerName}</td>
                    <td>{delivery.phoneNumber}</td>
                    <td>{delivery.deliveryAddress}</td>
                    {showBusinessColumn && (
                      <td>{businesses[delivery.businessId]?.businessName || 'לא ידוע'}</td>
                    )}
                    {showCourierColumn && (
                      <td>{couriers[delivery.curierId]?.curierName || 'לא ידוע'}</td>
                    )}
                    <td className={`status-cell status-${delivery.status}`}>
                      {getStatusDisplayText(delivery.status, delivery)}
                    </td>
                    <td>{formatDate(delivery.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view - only for mobile */}
          <div className="delivery-history-cards mobile-only">
            <h3 className="mobile-header">היסטוריית משלוחים</h3>
            {processedDeliveries.map(delivery => (
              <div key={delivery.id} className="delivery-card">
                <h3>{delivery.customerName}</h3>
                <p><span className="label">טלפון:</span> {delivery.phoneNumber}</p>
                <p><span className="label">כתובת:</span> {delivery.deliveryAddress}</p>
                {showBusinessColumn && (
                  <p><span className="label">עסק:</span> {businesses[delivery.businessId]?.businessName || 'לא ידוע'}</p>
                )}
                {showCourierColumn && (
                  <p><span className="label">שליח:</span> {couriers[delivery.curierId]?.curierName || 'לא ידוע'}</p>
                )}
                <p>
                  <span className="label">סטטוס:</span>
                  <span className={`status-${delivery.status}`}>
                    {getStatusDisplayText(delivery.status, delivery)}
                  </span>
                </p>
                <p><span className="label">תאריך יצירה:</span> {formatDate(delivery.createdAt, true)}</p>
                {delivery.deliveredAt && (
                  <p><span className="label">תאריך מסירה:</span> {formatDate(delivery.deliveredAt, true)}</p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-results">
          <p>לא נמצאו משלוחים בהיסטוריה</p>
        </div>
      )}

      {/* Pagination - always show if there's at least one delivery in the original data */}
      {deliveries.length > 0 && renderPagination()}
    </div>
  );
};

export default DeliveryHistoryTable;
