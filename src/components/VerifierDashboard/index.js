import { useState, useEffect } from 'react';
import {
  MoreVertical,
  Download,
  Filter,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import './index.css';

// Base API URL - should be configurable based on environment
const API_BASE_URL = 'https://loan-backend-38w6.onrender.com';

const VerifierDashboard = ({ onLogout }) => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [actionDropdownId, setActionDropdownId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoanId, setActionLoanId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [showActionMessage, setShowActionMessage] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  const [stats, setStats] = useState({
    loans: 0,
    borrowers: 0,
    cashDisbursed: 0,
    cashReceived: 0,
    savings: 0,
    repaidLoans: 0
  });

  const [loans, setLoans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('');

  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  });

  // Fetch dashboard statistics
  const fetchDashboardData = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/dashboard/verifier`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized or forbidden
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch loans with pagination
  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      
      const response = await fetch(`${API_BASE_URL}/loans?${params.toString()}`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch loans data');
      }

      // Assuming the API returns { data: [...loans], total: 100, totalPages: 10 }
      const responseData = await response.json();
      
      // Check if the response is an array (direct loans data) or an object with pagination metadata
      let loansData = responseData;
      let totalCount = 0;
      let totalPageCount = 0;
      
      if (Array.isArray(responseData)) {
        // Direct array response
        loansData = responseData;
        totalCount = responseData.length;
        totalPageCount = Math.ceil(totalCount / itemsPerPage);
      } else if (responseData.data && Array.isArray(responseData.data)) {
        // Response with pagination metadata
        loansData = responseData.data;
        totalCount = responseData.total || responseData.totalItems || loansData.length;
        totalPageCount = responseData.totalPages || Math.ceil(totalCount / itemsPerPage);
      }
      
      const processedLoans = loansData.map(loan => ({
        id: loan.id,
        user: { 
          name: loan.fullName || `${loan.firstName || ''} ${loan.lastName || ''}`.trim(), // Handle different name formats
          email: loan.userEmail || loan.email || 'No email provided',
          lastUpdate: calculateLastUpdate(loan.updatedAt || loan.createdAt),
          date: formatDate(loan.createdAt)
        },
        icon: '👨‍💼',
        reason: loan.reason || loan.purpose || 'Not specified',
        date: formatDate(loan.createdAt),
        time: formatTime(loan.createdAt),
        status: loan.status,
        amount: loan.amount
      }));
      
      setLoans(processedLoans);
      setTotalItems(totalCount);
      setTotalPages(totalPageCount);
    } catch (err) {
      console.error('Loans fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, filterStatus]);

  // Handle loan verification
  const verifyLoan = async (loanId) => {
    try {
      setActionInProgress(true);
      
      // Make the API call to verify loan
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/verify`, {
        method: 'PUT',
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        
        // Handle specific errors
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify loan');
      }

      // After successful API call, update the loans state
      setLoans(prevLoans => 
        prevLoans.map(loan => 
          loan.id === loanId ? { ...loan, status: 'verified' } : loan
        )
      );

      // Success message
      setActionMessage('Loan successfully verified');
      setShowActionMessage(true);
      
      // Refresh dashboard data to update stats
      fetchDashboardData();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowActionMessage(false);
      }, 3000);
      
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message);
      // Show error message
      setActionMessage(`Error: ${err.message}`);
      setShowActionMessage(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => {
        setShowActionMessage(false);
      }, 3000);
    } finally {
      setActionInProgress(false);
      setShowConfirmDialog(false);
    }
  };

  // Helper function to calculate "X days ago" from a date
  const calculateLastUpdate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
  };

  // Helper function to format date as "Month DD, YYYY"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  };

  // Helper function to format time as "H:MM AM/PM"
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Handle pagination change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle filtering
  const handleFilter = (status) => {
    setFilterStatus(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    // Call the logout function passed as prop
    if (onLogout) onLogout();
    // Navigation would be handled by the parent component or React Router
  };

  // Toggle user dropdown
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Toggle action dropdown for a specific loan
  const toggleActionDropdown = (loanId) => {
    if (actionDropdownId === loanId) {
      setActionDropdownId(null);
    } else {
      setActionDropdownId(loanId);
    }
  };

  // Confirm dialog for verify action
  const openConfirmDialog = (loanId) => {
    setActionLoanId(loanId);
    setConfirmAction('verify');
    setShowConfirmDialog(true);
    setActionDropdownId(null); // Close the action dropdown
  };

  // Handle confirm action
  const handleConfirmAction = () => {
    if (actionLoanId && confirmAction === 'verify') {
      // Close dialog immediately for better user experience
      setShowConfirmDialog(false);
      // Then verify the loan
      verifyLoan(actionLoanId);
    }
  };

  // Debug function to check state changes
  useEffect(() => {
    console.log('Filter changed:', filterStatus);
    console.log('Sort changed:', sortBy, sortOrder);
  }, [filterStatus, sortBy, sortOrder]);

  if (isLoading && !loans.length) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Stat Card Component
  const StatCard = ({ icon, value, label, className }) => (
    <div className={`stat-card-verifier ${className}`}>
      <div className="stat-icon-verifier">{icon}</div>
      <div className="stat-content">
        <h2>{typeof value === 'number' ? value.toLocaleString() : value}</h2>
        <p>{label}</p>
      </div>
    </div>
  );

  // Confirmation Dialog Component
  const ConfirmDialog = () => (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <AlertTriangle size={24} className="confirm-icon" />
          <h3>Confirm Verification</h3>
        </div>
        <div className="confirm-dialog-body">
          <p>Are you sure you want to verify this loan?</p>
          <p className="confirm-dialog-note">This action cannot be undone.</p>
        </div>
        <div className="confirm-dialog-actions">
          <button 
            className="cancel-btn" 
            onClick={() => setShowConfirmDialog(false)}
            disabled={actionInProgress}
          >
            Cancel
          </button>
          <button 
            className="confirm-btn verify-btn" 
            onClick={handleConfirmAction}
            disabled={actionInProgress}
          >
            {actionInProgress ? 'Processing...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );

  // Action Message Component
  const ActionMessage = () => (
    <div className={`action-message ${showActionMessage ? 'show' : ''}`}>
      {!actionMessage.includes('Error:') ? (
        <Check size={16} className="action-message-icon success" />
      ) : (
        <X size={16} className="action-message-icon error" />
      )}
      <span>{actionMessage}</span>
    </div>
  );

  // Pagination Component
  const Pagination = () => {
    const pages = [];
    
    // Always show first page, last page, current page, and one page before and after current
    const showPages = [];
    showPages.push(1);
    
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis after first page if needed
    if (startPage > 2) {
      showPages.push('...');
    }
    
    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      showPages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      showPages.push('...');
    }
    
    // Add last page if there is more than one page
    if (totalPages > 1) {
      showPages.push(totalPages);
    }
    
    return (
      <div className="pagination">
        <div className="pagination-info">
          <span>Rows per page: </span>
          <select 
            value={itemsPerPage} 
            onChange={handleItemsPerPageChange} 
            className="pagination-select"
          >
            <option value={6}>6</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="pagination-range">
            {totalItems > 0 ? 
              `${Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}` : 
              '0 - 0 of 0'}
          </span>
        </div>
        
        <div className="pagination-controls">
          <button 
            className="pagination-button" 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          {showPages.map((page, index) => (
            <button
              key={index}
              className={`pagination-button ${page === currentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
              onClick={() => page !== '...' && handlePageChange(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
          
          <button 
            className="pagination-button" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="verifier-dashboard">
      {showConfirmDialog && <ConfirmDialog />}
      {showActionMessage && <ActionMessage />}
      {/**header */} 
      <header className="dashboard-header">
        <div className="header-left">
          <img 
            src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746865310/CREDIT_APP_qmqdbr.png" 
            alt="Credit App Logo" 
            className="logo-header"
          />
          <button className="menu-button">
            <img 
              src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746894152/align-justify_ghxug8.png" 
              alt="Menu" 
              className="menu-icon"
            />
          </button>
        </div>    
        <div className="header-right">
          <div className="notification-container">
            <button className="icon-button">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746894152/Vector_jz52mq.png" 
                alt="Notifications" 
                className="notification-icon"
              />
            </button>
          </div>
          
          <button className="icon-button">
            <img 
              src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746894152/Vector_1_la67zv.png" 
              alt="Messages" 
              className="message-icon"
            />
          </button>
          
          <div className="admin-profile" onClick={toggleDropdown}>
            <img 
              src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746894152/account_circle_qlkzgt.png" 
              alt="Admin Profile" 
              className="profile-icon"
            />
            <span className="admin-user-text">Verifier</span>
            <img 
              src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746894152/Vector_2_gg1obu.png" 
              alt="Dropdown" 
              className="dropdown-icon"
            />
            
            {showDropdown && (
              <div className="profile-dropdown">
                <ul>
                  <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header> 
            
      <div className="dashboard-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-admin-info">
              <div className="sidebar-admin-avatar">
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897794/account_circle_1_yvtnfl.png" alt="admin-logo"/>
              </div>
              <span className="sidebar-admin-name">John Okoh</span>
            </div>
          </div>
          <nav className="sidebar-menu">
            {/**UL */}
            <ul>
              <li className="active">
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897788/dashicons_dashboard_huj3fs.png" alt="admin-logo"/>
                <span>Dashboard</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897788/Vector_3_dpeeqz.png" alt="admin-logo"/>
                <span>Borrowers</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_4_r5oqcn.png" alt="admin-logo"/>
                <span>Loans</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_5_esiznz.png" alt="admin-logo"/>
                <span>Repayments</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_6_hunvlh.png" alt="admin-logo"/>
                <span>Loan Parameters</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_7_a7yhvw.png" alt="admin-logo"/>
                <span>Accounting</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897778/Vector_8_ttnbs1.png" alt="admin-logo"/>
                <span>Reports</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_9_fbgd6w.png" alt="admin-logo"/>
                <span>Collateral</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_10_mwxbjq.png" alt="admin-logo"/>
                <span>Access Configuration</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_11_i6ewog.png" alt="admin-logo"/>
                <span>Savings</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_12_tquqhq.png" alt="admin-logo"/>
                <span>Other Incomes</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_13_bkoqe8.png" alt="admin-logo"/>
                <span>Payroll</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_14_pdjwxg.png" alt="admin-logo"/>
                <span>Expenses</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_15_ks9d92.png" alt="admin-logo"/>
                <span>E-signature</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_16_yrcdav.png" alt="admin-logo"/>
                <span>Investor Accounts</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_17_u4jbz7.png" alt="admin-logo"/>
                <span>Calendar</span>
              </li>
              <li>
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897776/Vector_18_o6zofb.png" alt="admin-logo"/>
                <span>Settings</span>
              </li>
              <li onClick={handleLogout}> 
                <img className="sidebar-admin-logo" src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897776/Vector_19_ycrxz8.png" alt="signout-logo"/>
                <span>Sign Out</span>
              </li>
            </ul>
            
          </nav>
        </aside>
  
        <main className="main-content">
          <header className="main-header">
            <h1>Verifier Dashboard</h1>
            <div className="active-filters">
              {filterStatus && (
                <div className="filter-badge">
                  Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  <button className="clear-filter" onClick={() => handleFilter('')}>×</button>
                </div>
              )}
              {sortBy && (
                <div className="filter-badge">
                  Sorting by: {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
                </div>
              )}
            </div>
          </header>
  
          {/*Stats Grid - Dashboard Verifier Statistics */}
          <div className="stats-grid-verfier">
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_4_r5oqcn.png" 
                  alt="LOANS" 
                />
              }
              value={stats.loans} 
              label="LOANS" 
              className="loans-stat"
            />
            <StatCard 
               icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897788/Vector_3_dpeeqz.png" 
                  alt="BORROWERS" 
                />
              }
              value={stats.borrowers} 
              label="BORROWERS" 
              className="borrowers-stat"
            />
            <StatCard 
               icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746938022/cash-multiple_or6nmj.png" 
                  alt="CASH DISBURSED" 
                />
              }
              value={`$${stats.cashDisbursed.toLocaleString()}`} 
              label="CASH DISBURSED" 
              className="disbursed-stat"
            />
            <StatCard 
               icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_11_i6ewog.png" 
                  alt="SAVINGS" 
                />
              } 
              value={`$${stats.savings.toLocaleString()}`} 
              label="SAVINGS" 
              className="savings-stat"
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_5_esiznz.png" 
                  alt="REPAID LOANS" 
                />
              }
              value={stats.repaidLoans} 
              label="REPAID LOANS" 
              className="repaid-stat"
            />
            <StatCard 
               icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746938022/tabler_currency-naira_smvi32.png" 
                  alt="CASH RECEIVED" 
                />
              }
              value={`$${stats.cashReceived.toLocaleString()}`} 
              label="CASH RECEIVED" 
              className="received-stat"
            />
          </div>
          
          {/* Applied Loans Section - With sorting and filtering */}
          <div className="recent-loans">
            <div className="recent-loans-header">
              <h2>Applied Loans</h2>
              <div className="table-actions">
                <div className="dropdown">
                  <button className="table-action-btn">
                    <Download size={16} />
                    <span>Sort {sortBy ? `(${sortBy} ${sortOrder === 'asc' ? '↑' : '↓'})` : ''}</span>
                  </button>
                  <div className="dropdown-content">
                    <button 
                      onClick={() => handleSort('amount')}
                      className={sortBy === 'amount' ? 'active' : ''}
                    >
                      By Amount {sortBy === 'amount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                    <button 
                      onClick={() => handleSort('fullName')}
                      className={sortBy === 'fullName' ? 'active' : ''}
                    >
                      By Name {sortBy === 'fullName' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                    <button 
                      onClick={() => handleSort('createdAt')}
                      className={sortBy === 'createdAt' ? 'active' : ''}
                    >
                      By Date {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </div>
                </div>
                <div className="dropdown">
                  <button className="table-action-btn">
                    <Filter size={16} />
                    <span>Filter {filterStatus ? `(${filterStatus})` : ''}</span>
                  </button>
                  <div className="dropdown-content">
                    <button 
                      onClick={() => handleFilter('')}
                      className={filterStatus === '' ? 'active' : ''}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => handleFilter('pending')}
                      className={filterStatus === 'pending' ? 'active' : ''}
                    >
                      Pending
                    </button>
                    <button 
                      onClick={() => handleFilter('verified')}
                      className={filterStatus === 'verified' ? 'active' : ''}
                    >
                      Verified
                    </button>
                  </div>
                </div>
              </div>
            </div>
  
            {isLoading ? (
              <div className="loading-indicator">Loading loans...</div>
            ) : (
              <>
                <div className="loans-table">
                  <div className="table-header">
                    <div className="admin-details-col">Loan Details</div>
                    <div className="admin-name-col">User Name</div>
                    <div className="date-col">Date</div>
                    <div className="action-col">Status</div>
                    <div className="more-col">Actions</div>
                  </div>
                
                  {loans.length > 0 ? (
                    loans.map(loan => (
                      <div className="table-row" key={loan.id}>
                        <div className="admin-details-col">
                          <div className="admin-avatar">
                            {loan.icon}
                          </div>
                          <div className="admin-issue">
                            <div className="admin-text">{loan.reason}</div>
                            <div className="issue-date">Updated {loan.user.lastUpdate}</div>
                          </div>
                        </div>
                        <div className="admin-name-col">
                          <div className="admin-name">{loan.user.name}</div>
                          <div className="admin-date">on {loan.user.date}</div>
                        </div>
                        <div className="date-col">
                          <div className="loan-date">{loan.date}</div>
                          <div className="loan-time">{loan.time}</div>
                        </div>
                        <div className="action-col">
                          {loan.status === 'pending' && (
                            <div className="status-pending">! PENDING</div>
                          )}
                          {loan.status === 'verified' && (
                            <div className="status-verified">
                              <Check size={14} />
                              VERIFIED
                            </div>
                          )}
                          {loan.status === 'approved' && (
                            <div className="status-approved">
                              <Check size={14} />
                              APPROVED
                            </div>
                          )}
                          {loan.status === 'rejected' && (
                            <div className="status-rejected">
                              <X size={14} />
                              REJECTED
                            </div>
                          )}
                        </div>
                        <div className="more-col">
                          <div className="action-dropdown-container">
                            <button 
                              className="more-btn"
                              onClick={() => toggleActionDropdown(loan.id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {actionDropdownId === loan.id && (
                              <div className="action-dropdown">
                                {loan.status === 'pending' && (
                                  <button 
                                    className="dropdown-action verify"
                                    onClick={() => openConfirmDialog(loan.id)}
                                  >
                                    Verify
                                  </button>
                                )}
                                {loan.status !== 'pending' && (
                                  <button 
                                    className="dropdown-action view"
                                    onClick={() => {
                                      // Handle view details action
                                      console.log('View loan details:', loan.id);
                                      setActionDropdownId(null);
                                    }}
                                  >
                                    View Details
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-loans-message">No loans found matching your criteria</div>
                  )}
                </div>
                
                {/* Pagination Component */}
                <Pagination />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VerifierDashboard;