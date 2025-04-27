/**
 * Utility functions for sorting, filtering, and pagination
 */

/**
 * Sort an array of delivery tasks by the specified field and direction
 * @param {Array} tasks - Array of delivery tasks
 * @param {string} sortField - Field to sort by
 * @param {string} sortDirection - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortDeliveries = (tasks, sortField, sortDirection) => {
  if (!tasks || !tasks.length) return [];

  const sortedTasks = [...tasks];

  sortedTasks.sort((a, b) => {
    let valueA, valueB;

    // Handle different field types
    if (sortField === 'createdAt' || sortField === 'deliveredAt' || sortField === 'pickedUpAt') {
      valueA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
      valueB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
    } else if (sortField === 'customerName' || sortField === 'deliveryAddress' || sortField === 'phoneNumber') {
      valueA = a[sortField] ? a[sortField].toString().toLowerCase() : '';
      valueB = b[sortField] ? b[sortField].toString().toLowerCase() : '';
    } else {
      valueA = a[sortField];
      valueB = b[sortField];
    }

    // Handle null/undefined values
    if (valueA === undefined || valueA === null) return sortDirection === 'asc' ? -1 : 1;
    if (valueB === undefined || valueB === null) return sortDirection === 'asc' ? 1 : -1;

    // Compare values
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return sortedTasks;
};

/**
 * Filter an array of delivery tasks based on filter criteria
 * @param {Array} tasks - Array of delivery tasks
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered array
 */
export const filterDeliveries = (tasks, filters) => {
  if (!tasks || !tasks.length) return [];
  if (!filters) return tasks;

  return tasks.filter(task => {
    // Filter by status
    if (filters.status && filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }

    // Filter by priority
    if (filters.priority && filters.priority !== 'all') {
      const taskPriority = task.priority || 'normal';
      if (taskPriority !== filters.priority) {
        return false;
      }
    }

    // Filter by date range
    if (filters.startDate) {
      const taskDate = new Date(task.createdAt);
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (taskDate < startDate) return false;
    }

    if (filters.endDate) {
      const taskDate = new Date(task.createdAt);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (taskDate > endDate) return false;
    }

    // Filter by search text (in customer name, address, phone, or delivery number)
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const customerName = (task.customerName || '').toLowerCase();
      const deliveryAddress = (task.deliveryAddress || '').toLowerCase();
      const phoneNumber = (task.phoneNumber || '').toLowerCase();
      const deliveryNumber = (task.deliveryNumber || '').toLowerCase();

      if (!customerName.includes(searchText) &&
          !deliveryAddress.includes(searchText) &&
          !phoneNumber.includes(searchText) &&
          !deliveryNumber.includes(searchText)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Paginate an array of delivery tasks
 * @param {Array} tasks - Array of delivery tasks
 * @param {number} page - Current page (1-based)
 * @param {number} pageSize - Number of items per page
 * @returns {Array} Paginated array
 */
export const paginateDeliveries = (tasks, page, pageSize) => {
  if (!tasks || !tasks.length) return [];
  if (!page || !pageSize) return tasks;

  const startIndex = (page - 1) * pageSize;
  return tasks.slice(startIndex, startIndex + pageSize);
};

/**
 * Get the total number of pages
 * @param {number} totalItems - Total number of items
 * @param {number} pageSize - Number of items per page
 * @returns {number} Total number of pages
 */
export const getTotalPages = (totalItems, pageSize) => {
  return Math.ceil(totalItems / pageSize);
};

/**
 * Format a date for display
 * @param {string} dateString - ISO date string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '';

  const date = new Date(dateString);

  if (includeTime) {
    return date.toLocaleString('he-IL');
  } else {
    return date.toLocaleDateString('he-IL');
  }
};

/**
 * Get issue type display text
 * @param {string} issueType - Issue type code
 * @returns {string} Display text
 */
export const getIssueTypeText = (issueType) => {
  switch (issueType) {
    case 'customer_unavailable': return 'לקוח לא זמין';
    case 'address_not_found': return 'כתובת לא נמצאה';
    case 'accident': return 'תאונה';
    case 'damaged_package': return 'משלוח ניזוק';
    case 'wrong_address': return 'כתובת שגויה';
    case 'customer_refused': return 'לקוח סירב לקבל';
    case 'vehicle_breakdown': return 'תקלה ברכב';
    case 'other': return 'בעיה אחרת';
    default: return issueType;
  }
};

/**
 * Get status display text
 * @param {string} status - Status code
 * @param {Object} delivery - Delivery object (optional)
 * @returns {string} Display text
 */
export const getStatusDisplayText = (status, delivery) => {
  switch (status) {
    case 'pending': return 'ממתין';
    case 'assigned': return 'הוקצה';
    case 'accepted': return 'התקבל';
    case 'picked_up': case 'picked': return 'נאסף';
    case 'delivered': return 'נמסר';
    case 'cancelled': return 'בוטל';
    case 'broadcast': return 'פתוח לשליחים';
    case 'pending_acceptance': return 'ממתין לאישור';
    case 'issue_reported': return 'דווח על בעיה';
    case 'closed':
      // אם יש מידע על סוג התקלה, הצג אותו
      if (delivery && delivery.issueType) {
        const issueTypeText = getIssueTypeText(delivery.issueType);
        return `סגור - דווח על ${issueTypeText}`;
      }
      return 'סגור';
    default: return status;
  }
};
