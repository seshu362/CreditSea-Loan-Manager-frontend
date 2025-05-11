import { useState, useEffect } from 'react';
import { Filter, Download, MoreVertical, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import './index.css';
import { FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Base API URL - should be configurable based on environment
const API_BASE_URL = 'https://loan-backend-38w6.onrender.com';

const UserDashboard = ({ onLogout }) => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDropdown, setShowDropdown] = useState(false);

  //Navigate to User-form
  const navigate = useNavigate();

  const handleLoanClick = () => {
    navigate('/user-form');
  };

  // Toggle user dropdown
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  });

  // Handle search change
  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
    
    if (value.trim() === '') {
      // If search is empty, show all loans
      setFilteredLoans(loans);
    } else {
      // Filter loans based on search term
      const filtered = loans.filter(loan => 
        loan.amount.toString().includes(value) ||
        loan.fullName.toLowerCase().includes(value) ||
        loan.dateApplied.toLowerCase().includes(value) ||
        loan.status.toLowerCase().includes(value) ||
        loan.loanOfficer.toLowerCase().includes(value) ||
        loan.reason?.toLowerCase().includes(value)
      );
      setFilteredLoans(filtered);
    }
    
    // Update pagination
    updatePagination(value === '' ? loans : filteredLoans);
  };

  // Update pagination based on filtered results
  const updatePagination = (loansArray) => {
    setTotalItems(loansArray.length);
    setTotalPages(Math.ceil(loansArray.length / itemsPerPage));
  };

  // Fetch user loans (only for the logged-in user)
  const fetchUserLoans = async () => {
    try {
      setIsLoading(true);
      
      const token = getToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      // Get the current user's ID from token or local storage
      // You might need to decode the JWT or have a separate endpoint to get user info
      const userId = localStorage.getItem('userId'); // Adjust based on how you store user ID
      
      // Endpoint specifically for current user's loans
      const response = await fetch(`${API_BASE_URL}/user/loans`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized or forbidden
          handleLogout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch loan data');
      }

      const data = await response.json();
      
      // Process loan data - this endpoint should only return the current user's loans
      const processedLoans = data.map(loan => ({
        id: loan.id,
        fullName: loan.fullName,
        amount: loan.amount,
        dateApplied: formatDate(loan.createdAt),
        timeApplied: formatTime(loan.createdAt),
        status: loan.status,
        reason: loan.reason,
        tenure: loan.tenure,
        loanOfficer: loan.loanOfficerName || 'Not Assigned',
        updatedDate: calculateLastUpdate(loan.updatedAt || loan.createdAt)
      }));
      
      setLoans(processedLoans);
      setFilteredLoans(processedLoans); // Initialize filtered loans with all loans
      setTotalItems(processedLoans.length);
      setTotalPages(Math.ceil(processedLoans.length / itemsPerPage));
    } catch (err) {
      console.error('Loans fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLoans();
  }, []);

  // Update filtered loans when loans or search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLoans(loans);
    } else {
      const filtered = loans.filter(loan => 
        loan.amount.toString().includes(searchTerm) ||
        loan.fullName.toLowerCase().includes(searchTerm) ||
        loan.dateApplied.toLowerCase().includes(searchTerm) ||
        loan.status.toLowerCase().includes(searchTerm) ||
        loan.loanOfficer.toLowerCase().includes(searchTerm) ||
        loan.reason?.toLowerCase().includes(searchTerm)
      );
      setFilteredLoans(filtered);
    }
    
    // Update pagination based on filtered results
    updatePagination(searchTerm === '' ? loans : filteredLoans);
  }, [loans]);
  
  // Refresh loans data periodically (every 60 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchUserLoans();
    }, 60000);
    
    // Clean up on component unmount
    return () => clearInterval(intervalId);
  }, []);

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
    
    // Update total pages based on new items per page
    setTotalPages(Math.ceil(filteredLoans.length / parseInt(e.target.value, 10)));
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
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    // Call the logout function passed as prop
    if (onLogout) onLogout();
  };

  // Get paginated loans
  const getPaginatedLoans = () => {
    // Sort loans first
    const sortedLoans = [...filteredLoans].sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else if (sortBy === 'dateApplied') {
        const dateA = new Date(a.dateApplied);
        const dateB = new Date(b.dateApplied);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'fullName') {
        return sortOrder === 'asc' 
          ? a.fullName.localeCompare(b.fullName) 
          : b.fullName.localeCompare(a.fullName);
      }
      return 0;
    });

    // Then paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedLoans.slice(startIndex, endIndex);
  };

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
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          <span className="pagination-range">
          {filteredLoans.length > 0 
            ? `${Math.min((currentPage - 1) * itemsPerPage + 1, filteredLoans.length)} - ${Math.min(currentPage * itemsPerPage, filteredLoans.length)} of ${filteredLoans.length}` 
            : '0 items'}
        </span>
        </div>
        
        <div className="pagination-controls">
          <button 
            className="pagination-button" 
            disabled={currentPage === 1 || filteredLoans.length === 0}
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
            disabled={currentPage === totalPages || filteredLoans.length === 0}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (isLoading && !loans.length) {
    return <div className="loading">Loading your loans...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="user-verifier-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img 
            src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746865310/CREDIT_APP_qmqdbr.png" 
            alt="Credit App Logo" 
            className="logo-header"
          />
        </div>    
        <div className='header-middle'>
          <div className="middle-items-container">
            <button className="icon-button">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746977474/Vector_2_moz9sh.png" 
                alt="Notifications" 
                className="notification-icon"
              />
            </button>
            <span className="admin-text">Home</span>
          </div>
          <div className="middle-items-container">
            <button className="icon-button">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746977473/tabler_currency-naira_1_rwywyk.png" 
                alt="Notifications" 
                className="notification-icon"
              />
            </button>
            <span className="admin-text">Payments</span>
          </div>
          <div className="middle-items-container">
            <button className="icon-button">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746977473/Vector_3_cwdjp7.png" 
                alt="Notifications" 
                className="notification-icon"
              />
            </button>
            <span className="admin-text">Budget</span>
          </div>
          <div className="middle-items-container">
            <button className="icon-button">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746977473/Vector_4_gjqsec.png" 
                alt="Notifications" 
                className="notification-icon"
              />
            </button>
            <span className="admin-text">Card</span>
          </div>
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
            <span className="admin-user-text">User</span>
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
      {/** */}
      <div className="userpage-app-container">
        <div className="userpage-header">
          <div className="userpage-left-section">
            <div className="userpage-money-icon-container">
              <img 
                src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746978174/Vector_5_qpptdm.png" 
                alt="Money" 
                className="userpage-money-icon" 
              />
            </div>
            <div className="userpage-deficit-section">
              <div className="userpage-deficit-text">DEFICIT</div>
              <div className="userpage-amount-container">
                <img 
                  src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746978174/tabler_currency-naira_2_sgzk88.png" 
                  alt="Naira" 
                  className="userpage-naira-icon" 
                />
                <span className="userpage-amount-text">0.0</span>
              </div>
            </div>
          </div>
          <div className="userpage-right-section">
            <button className="userpage-loan-button" onClick={handleLoanClick}>Get A Loan</button>
          </div>
        </div>

        <div className="userpage-tabs-container">
          <button className="userpage-tab-button userpage-active">Borrow Cash</button>
          <button className="userpage-tab-button">Transact</button>
          <button className="userpage-tab-button">Deposit Cash</button>
        </div>

        <div className="userpage-search-container">
          <FaSearch className="userpage-search-icon" />
          <input 
            type="text" 
            placeholder="Search for loans" 
            className="userpage-search-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
      </div>
      {/*** */}
        <div className="user-dashboard">
          <div className="user-recent-loans">
            <div className="recent-loans-header">
              <h2>
  Applied Loans {searchTerm && `(Showing results for "${searchTerm}")`}
</h2>
              <div className="table-actions">
                    <div className="dropdown">
                      <button className="table-action-btn">
                        <Download size={16} />
                        <span>Sort</span>
                      </button>
                      
                    </div>
                    <div className="dropdown">
                      <button className="table-action-btn">
                        <Filter size={16} />
                        <span>Filter</span>
                      </button>
                    </div>
              </div>
            </div>

            {filteredLoans.length > 0 ? (
              <>
                <div className="loans-table">
                  <div className="table-header">
                    <div className="admin-details-col">Loan Officer</div>
                    <div className="admin-name-col">Amount</div>
                    <div className="date-col">Date Applied</div>
                    <div className="action-col">Status</div>
                    <div className="more-col"></div>
                  </div>
                  
                  {getPaginatedLoans().map(loan => (
                    <div className="table-row" key={loan.id}>
                      <div className="admin-details-col">
                        <div className="admin-avatar">
                          👨‍💼
                        </div>
                        <div className="admin-issue">
                          <div className="admin-text">{loan.loanOfficer}</div>
                          <div className="issue-date">Updated {loan.updatedDate}</div>
                        </div>
                      </div>
                      
                      <div className="admin-name-col">
                        <div className="admin-name">{loan.amount.toLocaleString()}.00</div>
                        <div className="admin-date">Next check Yes</div>
                      </div>
                      
                      <div className="date-col">
                        <div className="loan-date">{loan.dateApplied}</div>
                        <div className="loan-time">{loan.timeApplied}</div>
                      </div>
                      
                      <div className="action-col">
                        {loan.status === 'pending' && (
                          <div className="status-pending">PENDING</div>
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
                        <button 
                            className="more-btn"
                          >
                            <MoreVertical size={16} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Pagination />
              </>
            ) : (
              <div className="user-no-loans-message">
                {
  searchTerm 
    ? `No loans found matching "${searchTerm}". Please try a different search.` 
    : "You haven't applied for any loans yet."
}
                <div className="empty-state-actions">
                  
                </div>
              </div>
            )}
          </div>
        </div>
     </div>
  );
};

export default UserDashboard;