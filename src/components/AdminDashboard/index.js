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

const AdminDashboard = ({ onLogout }) => {
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
    activeUsers: 0,
    borrowers: 0,
    cashDisbursed: 0,
    cashReceived: 0,
    savings: 0,
    repaidLoans: 0,
    otherAccounts: 0,
    loans: 0
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

      const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
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

  // Fetch recent loans with pagination
  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters for pagination, sorting, and filtering
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      
      const response = await fetch(`${API_BASE_URL}/loans/recent?${params.toString()}`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch loans data');
      }

      const data = await response.json();
      
      // Process loan data to match your UI requirements
      const processedLoans = data.map(loan => ({
        id: loan.id,
        admin: { 
          name: loan.fullName,
          email: loan.userEmail || 'No email provided',
          lastUpdate: calculateLastUpdate(loan.createdAt),
          date: formatDate(loan.createdAt)
        },
        icon: '👨‍💼', // Default profile icon
        issue: loan.reason,
        date: formatDate(loan.createdAt),
        time: formatTime(loan.createdAt),
        status: loan.status,
        amount: loan.amount
      }));
      
      setLoans(processedLoans);
      setTotalItems(data.length); // This should ideally come from the API's metadata
      setTotalPages(Math.ceil(data.length / itemsPerPage));
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

  // Handle loan status update (approve/reject/verify)
  const updateLoanStatus = async (loanId, status) => {
    try {
      setActionInProgress(true);
      
      // Default dates (can be adjusted based on your business logic)
      const today = new Date();
      const repaymentDate = new Date();
      repaymentDate.setDate(today.getDate() + 30); // 30 days later for repayment
      
      // Prepare payload based on status
      const payload = {
        status: status
      };
      
      // Add dates for approved loans
      if (status === 'approved') {
        payload.disbursedDate = today.toISOString().split('T')[0];
        payload.repaymentDate = repaymentDate.toISOString().split('T')[0];
      }
      
      // Make the API call to update loan status
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        
        // Handle specific errors
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update loan status');
      }

      // After successful API call, update the loans state
      setLoans(prevLoans => 
        prevLoans.map(loan => 
          loan.id === loanId ? { ...loan, status: status } : loan
        )
      );

      // Success message
      setActionMessage(`Loan successfully ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'verified'}`);
      setShowActionMessage(true);
      
      // Refresh dashboard data to update stats
      fetchDashboardData();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowActionMessage(false);
      }, 3000);
      
    } catch (err) {
      console.error('Status update error:', err);
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

  // Confirm dialog for approve/reject actions
  const openConfirmDialog = (loanId, action) => {
    setActionLoanId(loanId);
    setConfirmAction(action);
    setShowConfirmDialog(true);
    setActionDropdownId(null); // Close the action dropdown
  };

  // Handle confirm action
  const handleConfirmAction = () => {
    if (actionLoanId && confirmAction) {
      // Close dialog immediately for better user experience
      setShowConfirmDialog(false);
      // Then update the status
      updateLoanStatus(actionLoanId, confirmAction);
    }
  };

  if (isLoading && !loans.length) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Stat Card Component
  const StatCard = ({ icon, value, label, className }) => (
    <div className={`stat-card ${className}`}>
      <div className="stat-icon">{icon}</div>
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
          <h3>Confirm {confirmAction === 'approved' ? 'Approval' : confirmAction === 'rejected' ? 'Rejection' : 'Verification'}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p>Are you sure you want to {confirmAction === 'approved' ? 'approve' : confirmAction === 'rejected' ? 'reject' : 'verify'} this loan?</p>
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
            className={`confirm-btn ${confirmAction === 'approved' ? 'approve-btn' : confirmAction === 'rejected' ? 'reject-btn' : 'verify-btn'}`} 
            onClick={handleConfirmAction}
            disabled={actionInProgress}
          >
            {actionInProgress ? 'Processing...' : confirmAction === 'approved' ? 'Approve' : confirmAction === 'rejected' ? 'Reject' : 'Verify'}
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
            {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
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
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      {showConfirmDialog && <ConfirmDialog />}
      {showActionMessage && <ActionMessage />}
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
            <span className="admin-text">Admin</span>
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
              <span className="sidebar-admin-name">John Deo</span>
            </div>
          </div>
          <nav className="sidebar-menu">
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
            <h1>Dashboard</h1>
          </header>
  
          {/* Stats Grid -  Admin Verifier Statistics */}
          <div className="stats-grid">
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746938023/Vector_qzdwh7.png" 
                  alt="ACTIVE USERS" 
                />
              }
              value={stats.activeUsers} 
              label="ACTIVE USERS" 
              className="users-card" 
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
              className="borrowers-card" 
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746938022/cash-multiple_or6nmj.png" 
                  alt="CASH DISBURSED" 
                />
              }
              value={stats.cashDisbursed} 
              label="CASH DISBURSED" 
              className="disbursed-card" 
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746938022/tabler_currency-naira_smvi32.png" 
                  alt="CASH RECEIVED" 
                />
              }
              value={stats.cashReceived} 
              label="CASH RECEIVED" 
              className="received-card" 
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_11_i6ewog.png" 
                  alt="SAVINGS" 
                />
              }
              value={stats.savings} 
              label="SAVINGS" 
              className="savings-card" 
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
              className="repaid-card" 
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897777/Vector_12_tquqhq.png" 
                  alt="OTHER ACCOUNTS" 
                />
              }
              value={stats.otherAccounts} 
              label="OTHER ACCOUNTS" 
              className="accounts-card" 
            />
            <StatCard 
              icon={
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746897787/Vector_4_r5oqcn.png" 
                  alt="LOANS" 
                />
              }
              value={stats.loans} 
              label="LOANS" 
              className="loans-card" 
            />
          </div>
          
          {/* Recent Loans Section - With sorting and filtering */}
          <div className="recent-loans">
            <div className="recent-loans-header">
              <h2>Recent Loans</h2>
              <div className="table-actions">
                <div className="dropdown">
                  <button className="table-action-btn" onClick={() => handleSort('createdAt')}>
                    <Download size={16} />
                    <span>Sort {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                  </button>
                  <div className="dropdown-content">
                    <button onClick={() => handleSort('amount')}>By Amount</button>
                    <button onClick={() => handleSort('fullName')}>By Name</button>
                    <button onClick={() => handleSort('createdAt')}>By Date</button>
                  </div>
                </div>
                <div className="dropdown">
                  <button className="table-action-btn">
                    <Filter size={16} />
                    <span>Filter {filterStatus ? `(${filterStatus})` : ''}</span>
                  </button>
                  <div className="dropdown-content">
                    <button onClick={() => handleFilter('')}>All</button>
                    <button onClick={() => handleFilter('pending')}>Pending</button>
                    <button onClick={() => handleFilter('verified')}>Verified</button>
                    <button onClick={() => handleFilter('approved')}>Approved</button>
                    <button onClick={() => handleFilter('rejected')}>Rejected</button>
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
                            <div className="admin-text">{loan.issue}</div>
                            <div className="issue-date">Updated {loan.admin.lastUpdate}</div>
                          </div>
                        </div>
                        <div className="admin-name-col">
                          <div className="admin-name">{loan.admin.name}</div>
                          <div className="admin-date">on {loan.admin.date}</div>
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
                                  <>
                                    <button 
                                      className="dropdown-action verify"
                                      onClick={() => openConfirmDialog(loan.id, 'verified')}
                                    >
                                      Verify
                                    </button>
                                    <button 
                                      className="dropdown-action approve"
                                      onClick={() => openConfirmDialog(loan.id, 'approved')}
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      className="dropdown-action reject"
                                      onClick={() => openConfirmDialog(loan.id, 'rejected')}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {loan.status === 'verified' && (
                                  <>
                                    <button 
                                      className="dropdown-action approve"
                                      onClick={() => openConfirmDialog(loan.id, 'approved')}
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      className="dropdown-action reject"
                                      onClick={() => openConfirmDialog(loan.id, 'rejected')}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {(loan.status === 'approved' || loan.status === 'rejected') && (
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
                
                
              </>
            )}
          </div>
          {/* Pagination Component */}
                <Pagination />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;