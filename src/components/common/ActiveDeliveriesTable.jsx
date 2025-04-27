import React, { useState, useEffect } from "react";
import {
  sortDeliveries,
  filterDeliveries,
  paginateDeliveries,
} from "../../utils/sortFilterUtils";
import "./DeliveryHistoryTable.css"; // Reuse the same CSS
import BusinessLogo from "./BusinessLogo";

const ActiveDeliveriesTable = ({
  deliveries,
  loading,
  businesses = {},
  couriers = {},
  showBusinessColumn = false,
  showCourierColumn = false,
  onTaskAction = null, // For actions like pickup, deliver, etc.
  userRole = "business", // 'business', 'courier', 'admin', 'superAdmin'
}) => {
  // State for sorting
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // State for filtering
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    searchText: "",
  });

  // State for active filters
  const [activeFilters, setActiveFilters] = useState({
    status: "all",
    priority: "all",
    searchText: "",
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Fixed page size
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State for processed data
  const [processedDeliveries, setProcessedDeliveries] = useState([]);

  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);

  // Get unique statuses for filter dropdown
  const getUniqueStatuses = () => {
    const statuses = deliveries.map((delivery) => delivery.status);
    return ["all", ...new Set(statuses)];
  };

  // Get unique priorities for filter dropdown
  const getUniquePriorities = () => {
    const priorities = deliveries.map(
      (delivery) => delivery.priority || "normal"
    );
    return ["all", ...new Set(priorities)];
  };

  // Handle sort
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    // Update filters
    const updatedFilters = {
      ...filters,
      [name]: value,
    };

    setFilters(updatedFilters);
  };

  // Apply filters
  const applyFilters = () => {
    // Apply filters
    setActiveFilters({ ...filters });
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilters = {
      status: "all",
      priority: "all",
      searchText: "",
    };
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Calculate total pages
  const getTotalPages = (itemCount, size) => {
    return Math.ceil(itemCount / size);
  };

  // Process data when deliveries, sorting, filtering, or pagination changes
  useEffect(() => {
    if (loading) return;

    // Apply filters
    const filteredDeliveries = filterDeliveries(deliveries, activeFilters);
    setTotalItems(filteredDeliveries.length);

    // Apply sorting
    const sortedDeliveries = sortDeliveries(
      filteredDeliveries,
      sortField,
      sortDirection
    );

    // Apply pagination
    const paginatedDeliveries = paginateDeliveries(
      sortedDeliveries,
      currentPage,
      pageSize
    );

    // Update processed data
    setProcessedDeliveries(paginatedDeliveries);

    // Update total pages
    setTotalPages(getTotalPages(filteredDeliveries.length, pageSize));

    // Reset to first page if no results on current page
    if (paginatedDeliveries.length === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [
    deliveries,
    sortField,
    sortDirection,
    activeFilters,
    currentPage,
    pageSize,
    loading,
  ]);

  // Format date
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return "לא זמין";

    const date = new Date(dateString);
    const options = includeTime
      ? {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : { year: "numeric", month: "numeric", day: "numeric" };

    return date.toLocaleDateString("he-IL", options);
  };

  // Get status display text
  const getStatusDisplayText = (status, delivery) => {
    switch (status) {
      case "pending_acceptance":
        return "ממתין לשליח";
      case "broadcast":
        return "ממתין לשליח";
      case "accepted":
        return "ממתין לאיסוף";
      case "picked":
        return "בדרך ללקוח";
      case "delivered":
        return "נמסר";
      case "cancelled":
        return "בוטל";
      case "issue_reported":
        return "דווח על בעיה";
      case "closed":
        // אם יש מידע על סוג התקלה, הצג אותו
        if (delivery && delivery.issueType) {
          const issueTypeText = getIssueTypeText(delivery.issueType);
          return `סגור - דווח על ${issueTypeText}`;
        }
        return "סגור";
      default:
        return status;
    }
  };

  // פונקציה לקבלת טקסט מתאים לסוג התקלה
  const getIssueTypeText = (issueType) => {
    switch (issueType) {
      case "customer_unavailable":
        return "לקוח לא זמין";
      case "address_not_found":
        return "כתובת לא נמצאה";
      case "accident":
        return "תאונה";
      case "damaged_package":
        return "משלוח ניזוק";
      case "wrong_address":
        return "כתובת שגויה";
      case "customer_refused":
        return "לקוח סירב לקבל";
      case "vehicle_breakdown":
        return "תקלה ברכב";
      case "other":
        return "בעיה אחרת";
      default:
        return issueType;
    }
  };

  // Sort icon is now directly rendered in the buttons

  // Render pagination
  const renderPagination = () => {
    // Always show pagination, even if there's only one page
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          מציג {Math.min((currentPage - 1) * pageSize + 1, totalItems)} -{" "}
          {Math.min(currentPage * pageSize, totalItems)} מתוך {totalItems}{" "}
          משלוחים
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ראשון
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            הקודם
          </button>

          {pageNumbers.map((number) => (
            <button
              key={number}
              onClick={() => handlePageChange(number)}
              className={`pagination-button ${
                currentPage === number ? "active" : ""
              }`}
            >
              {number}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            הבא
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            אחרון
          </button>
        </div>
      </div>
    );
  };

  // Render task actions buttons based on status and user role
  const renderTaskActions = (task) => {
    if (!onTaskAction) return null;

    const actions = [];

    if (userRole === "courier") {
      if (task.status === "accepted") {
        actions.push(
          <button
            key="pickup"
            className="action-btn pickup-btn"
            onClick={() => onTaskAction(task.id, "picked")}
          >
            איסוף בוצע
          </button>
        );
      }

      if (task.status === "picked") {
        actions.push(
          <button
            key="deliver"
            className="action-btn deliver-btn"
            onClick={() => onTaskAction(task.id, "delivered")}
          >
            נמסר ללקוח
          </button>
        );

        // Only show issue report button when en route to client (picked status)
        actions.push(
          <button
            key="issue"
            className="action-btn issue-btn"
            onClick={() => onTaskAction(task.id, "issue")}
          >
            <span className="issue-icon">⚠️</span>
            <span>דווח על תקלה</span>
          </button>
        );
      }
    }

    // Add "Close Delivery" button for businesses when delivery has reported issue
    if (userRole === "business" && task.status === "issue_reported") {
      actions.push(
        <button
          key="close"
          className="action-btn close-btn"
          onClick={() => onTaskAction(task.id, "close")}
        >
          סגור משלוח
        </button>
      );
    }

    return actions.length > 0 ? (
      <div className="task-actions centered-actions">{actions}</div>
    ) : null;
  };

  // Render business details for courier view
  const renderBusinessDetails = (delivery) => {
    const business = businesses[delivery.businessId];
    if (!business) return null;

    // Add highlighted class for accepted status (en route to pickup)
    const isHighlighted = userRole === 'courier' && delivery.status === 'accepted';

    // For courier view, show different details based on status
    if (userRole === 'courier') {
      if (delivery.status === 'accepted') {
        // When en route to pickup, show the same as pending acceptance but with highlight
        return (
          <div className="business-details highlighted-details">
            <div className="business-header">
              <BusinessLogo
                logoUrl={business.logoUrl}
                businessName={business.businessName}
                size="small"
              />
              <p><strong>עסק:</strong> {business.businessName}</p>
            </div>
            <p><strong>כתובת איסוף:</strong> {business.businessAddress}</p>
            {business.courierInstructions && (
              <p className="courier-instructions"><strong>הוראות הגעה:</strong> {business.courierInstructions}</p>
            )}
            <p><strong>כתובת יעד:</strong> {delivery.deliveryAddress}</p>
            <div className="card-actions-container">
              <button
                className="call-client-btn"
                onClick={() => window.location.href = `tel:${business.businessContactPhone}`}
                title="התקשר לעסק"
              >
                📞
              </button>
              <button
                className="waze-btn"
                onClick={() => window.open(`https://waze.com/ul?ll=${business.businessLatitude},${business.businessLongitude}&navigate=yes`, '_blank')}
                title="נווט בוייז"
              >
                🧭
              </button>
            </div>
          </div>
        );
      } else if (delivery.status === 'pending_acceptance' || delivery.status === 'broadcast') {
        // When pending acceptance or broadcast, show minimal business details
        return (
          <div className="business-details">
            <div className="business-header">
              <BusinessLogo
                logoUrl={business.logoUrl}
                businessName={business.businessName}
                size="small"
              />
              <p><strong>עסק:</strong> {business.businessName}</p>
            </div>
            <p><strong>כתובת איסוף:</strong> {business.businessAddress}</p>
            <p><strong>כתובת יעד:</strong> {delivery.deliveryAddress}</p>
          </div>
        );
      } else if (delivery.status === 'picked') {
        // When picked (en route to client), show minimal business details
        return (
          <div className="business-details">
            <div className="business-header">
              <BusinessLogo
                logoUrl={business.logoUrl}
                businessName={business.businessName}
                size="small"
              />
              <p><strong>עסק:</strong> {business.businessName}</p>
            </div>
          </div>
        );
      }
    }

    // Default view for non-courier roles
    return (
      <div className={`business-details ${isHighlighted ? 'highlighted-details' : ''}`}>
        <div className="business-header">
          <BusinessLogo
            logoUrl={business.logoUrl}
            businessName={business.businessName}
            size="small"
          />
          <p>
            <strong>עסק:</strong> {business.businessName}
          </p>
        </div>
        <p>
          <strong>כתובת איסוף:</strong> {business.businessAddress}
        </p>
        {userRole === "courier" && business.businessContactName && (
          <>
            <p>
              <strong>איש קשר:</strong> {business.businessContactName}
            </p>
            {business.businessContactPhone && (
              <p>
                <strong>טלפון:</strong> {business.businessContactPhone}
              </p>
            )}
          </>
        )}
        {userRole === 'courier' && delivery.businessNotes && (
          <p><strong>הערות הגעה לעסק:</strong> {delivery.businessNotes}</p>
        )}
      </div>
    );
  };

  // Render courier details for business view
  const renderCourierDetails = (delivery) => {
    const courier = couriers[delivery.curierId];
    if (!courier) return null;

    return (
      <div className="courier-details">
        <p>
          <strong>שליח:</strong> {courier.curierName || "לא ידוע"}
        </p>
        {courier.curierPhone && (
          <p>
            <strong>טלפון שליח:</strong> {courier.curierPhone}
          </p>
        )}
      </div>
    );
  };

  // Render pickup details
  const renderPickupDetails = (delivery) => {
    if (delivery.status !== "picked" || !delivery.pickedUpAt) return null;

    return (
      <div className="pickup-details">
        <p>
          <strong>נאסף בתאריך:</strong>{" "}
          {new Date(delivery.pickedUpAt).toLocaleString("he-IL")}
        </p>
      </div>
    );
  };

  return (
    <div className="active-deliveries-container">
      {/* Only show filters and sorting when there's data and not for couriers */}
      {deliveries.length > 0 && userRole !== 'courier' && (
        <div className="filters-sorting-wrapper">
          {/* Filters */}
          <div className="filters-container">
            <button
              className="toggle-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "הסתר סינון ומיון" : "הצג סינון ומיון"}
            </button>

            {showFilters && (
              <div className="filters">
                {getUniqueStatuses().length > 1 && (
                  <>
                    <span className="sort-label">סינון לפי:</span>
                    <div className="filter-group">
                    <label htmlFor="status">סטטוס:</label>
                    <select
                      id="status"
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="all">הכל</option>
                      {getUniqueStatuses()
                        .filter((status) => status !== "all")
                        .map((status) => (
                          <option key={status} value={status}>
                            {getStatusDisplayText(status, null)}
                          </option>
                        ))}
                    </select>
                  </div>
                  </>
                )}

                {getUniquePriorities().length > 1 && (
                  <div className="filter-group">
                    <label htmlFor="priority">עדיפות:</label>
                    <select
                      id="priority"
                      name="priority"
                      value={filters.priority}
                      onChange={handleFilterChange}
                    >
                      <option value="all">הכל</option>
                      {getUniquePriorities()
                        .filter((priority) => priority !== "all")
                        .map((priority) => (
                          <option key={priority} value={priority}>
                            {priority === "high" ? "גבוהה" : "רגילה"}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="filter-group">
                  <label htmlFor="searchText">חיפוש:</label>
                  <input
                    type="text"
                    id="searchText"
                    name="searchText"
                    value={filters.searchText}
                    onChange={handleFilterChange}
                    placeholder="חיפוש לפי שם, טלפון או כתובת"
                  />
                </div>

                <div className="filter-actions">
                  <button onClick={applyFilters} className="apply-filters-btn">
                    החל סינון
                  </button>
                  <button onClick={resetFilters} className="reset-filters-btn">
                    אפס סינון
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sorting options */}
          {showFilters && (
            <div className="sorting-options">
              <span className="sort-label">מיון לפי:</span>
              <div className="sort-buttons">
                <button
                  className={`sort-button ${
                    sortField === "customerName" ? "active" : ""
                  }`}
                  onClick={() => handleSort("customerName")}
                >
                  שם לקוח{" "}
                  {sortField === "customerName" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  className={`sort-button ${
                    sortField === "status" ? "active" : ""
                  }`}
                  onClick={() => handleSort("status")}
                >
                  סטטוס{" "}
                  {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  className={`sort-button ${
                    sortField === "priority" ? "active" : ""
                  }`}
                  onClick={() => handleSort("priority")}
                >
                  עדיפות{" "}
                  {sortField === "priority" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </button>
                <button
                  className={`sort-button ${
                    sortField === "createdAt" ? "active" : ""
                  }`}
                  onClick={() => handleSort("createdAt")}
                >
                  תאריך יצירה{" "}
                  {sortField === "createdAt" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="loading">טוען משלוחים...</p>
      ) : (
        <div className="delivery-content">
          {processedDeliveries.length > 0 ? (
            <>
              {/* Cards view */}
              <div className="tasks-container">
                {processedDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="task-card"
                    data-status={delivery.status}
                  >
                    {/* For courier view, customize the display based on status */}
                    {userRole === 'courier' ? (
                      <>

                        {/* For pending acceptance, broadcast, or accepted - don't show anything here */}
                        {/* All details will be shown in the business details section */}

                        {/* For picked (en route to client), highlight client details */}
                        {delivery.status === 'picked' && (
                          <div className="highlighted-details client-details">
                            {delivery.deliveryNumber && (
                              <p><strong>מספר משלוח:</strong> {delivery.deliveryNumber}</p>
                            )}
                            <p><strong>שם לקוח:</strong> {delivery.customerName}</p>
                            <p><strong>טלפון לקוח:</strong> {delivery.phoneNumber}</p>
                            <p><strong>כתובת לקוח:</strong> {delivery.deliveryAddress}</p>
                            {delivery.notes && <p><strong>הערות:</strong> {delivery.notes}</p>}
                            {delivery.paymentMethod === 'cash' && (
                              <div className="cash-payment-alert">
                                <span className="cash-icon">💵</span> שים לב - תשלום במזומן!
                              </div>
                            )}
                            <div className="card-actions-container">
                              <button
                                className="call-client-btn"
                                onClick={() => window.location.href = `tel:${delivery.phoneNumber}`}
                                title="התקשר ללקוח"
                              >
                                📞
                              </button>
                              <button
                                className="waze-btn"
                                onClick={() => window.open(`https://waze.com/ul?ll=${delivery.clientLatitude},${delivery.clientLongitude}&navigate=yes`, '_blank')}
                                title="נווט בוייז"
                              >
                                🧭
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* For non-courier views, show the standard display */
                      <>
                        <h3>{delivery.customerName}</h3>
                        {delivery.deliveryNumber && (
                          <p>
                            <strong>מספר משלוח:</strong> {delivery.deliveryNumber}
                          </p>
                        )}
                        <p>
                          <strong>כתובת:</strong> {delivery.deliveryAddress}
                        </p>
                        <p>
                          <strong>טלפון:</strong> {delivery.phoneNumber}
                        </p>
                        <p>
                          <strong>סטטוס:</strong>{" "}
                          {getStatusDisplayText(delivery.status, delivery)}
                        </p>
                        <p>
                          <strong>עדיפות:</strong>{" "}
                          {delivery.priority === "high" ? "גבוהה" : "רגילה"}
                        </p>
                        <p>
                          <strong>תאריך יצירה:</strong>{" "}
                          {formatDate(delivery.createdAt, true)}
                        </p>
                        {delivery.paymentMethod && (
                          <p>
                            <strong>אמצעי תשלום:</strong>{" "}
                            {delivery.paymentMethod === "cash" ? "מזומן" : "אשראי"}
                          </p>
                        )}
                      </>
                    )}

                    {/* Show business details if needed */}
                    {showBusinessColumn && renderBusinessDetails(delivery)}

                    {/* Show courier details if assigned and needed */}
                    {showCourierColumn &&
                      (delivery.status === "accepted" ||
                        delivery.status === "picked") &&
                      renderCourierDetails(delivery)}

                    {/* Show pickup info if picked */}
                    {renderPickupDetails(delivery)}

                    {/* Task actions */}
                    {onTaskAction && renderTaskActions(delivery)}
                  </div>
                ))}
              </div>

            </>
          ) : (
            <div className="no-tasks">
              <p>אין משלוחים פעילים כרגע</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveDeliveriesTable;
