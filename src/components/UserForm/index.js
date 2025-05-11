import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

// Base API URL - should match what's used in UserDashboard
const API_BASE_URL = 'https://loan-backend-38w6.onrender.com';

const UserForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    amount: '',
    tenure: '',
    employmentStatus: 'Employed', // Default value
    reason: '',
    employmentAddress: '',
    employmentAddress2: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDisclosure, setAcceptDisclosure] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) < 1000) {
      newErrors.amount = 'Amount must be at least 1000';
    }
    
    if (!formData.tenure) {
      newErrors.tenure = 'Tenure is required';
    } else if (parseInt(formData.tenure) < 1) {
      newErrors.tenure = 'Tenure must be at least 1 month';
    }
    
    if (!formData.employmentStatus.trim()) {
      newErrors.employmentStatus = 'Employment status is required';
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason for loan is required';
    }
    
    if (!formData.employmentAddress.trim()) {
      newErrors.employmentAddress = 'Employment address is required';
    }
    
    if (!acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms';
    }
    
    if (!acceptDisclosure) {
      newErrors.acceptDisclosure = 'You must accept the disclosure';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_BASE_URL}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          amount: parseFloat(formData.amount),
          tenure: parseInt(formData.tenure),
          employmentStatus: formData.employmentStatus,
          reason: formData.reason,
          employmentAddress: formData.employmentAddress + (formData.employmentAddress2 ? ', ' + formData.employmentAddress2 : '')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit loan application');
      }
      
      const data = await response.json();
      console.log('Loan application submitted successfully:', data);
      alert('Loan application submitted successfully!');
      navigate('/user-dashboard');
      
    } catch (error) {
      console.error('Error submitting loan application:', error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const employmentStatusOptions = [
    "Employed",
    "Self-employed",
    "Unemployed",
    "Student",
    "Retired"
  ];

  return (
    <div className="userform-loan-application-container">
      <div className="userform-header">
        <button 
          className="userform-back-button"
          onClick={() => navigate('/user-dashboard')}
        >
          ← Back to Dashboard
        </button>
        <h1 className="userform-form-title">Apply for a Loan</h1>
      </div>
      
      <div className="userform-loan-form">
        <div className="userform-form-row">
          <div className="userform-form-group">
            <label htmlFor="fullName">Full name as it appears on bank account</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              className={errors.fullName ? 'userform-error' : ''}
            />
            {errors.fullName && <div className="userform-error-message">{errors.fullName}</div>}
          </div>
          
          <div className="userform-form-group">
            <label htmlFor="amount">How much do you need?</label>
            <input
              type="number"
              id="amount"
              name="amount"
              placeholder="Enter amount (minimum 1,000)"
              value={formData.amount}
              onChange={handleInputChange}
              className={errors.amount ? 'userform-error' : ''}
              min="1000"
            />
            {errors.amount && <div className="userform-error-message">{errors.amount}</div>}
          </div>
        </div>
        
        <div className="userform-form-row">
          <div className="userform-form-group">
            <label htmlFor="tenure">Loan tenure (in months)</label>
            <input
              type="number"
              id="tenure"
              name="tenure"
              placeholder="Enter number of months"
              value={formData.tenure}
              onChange={handleInputChange}
              className={errors.tenure ? 'userform-error' : ''}
              min="1"
            />
            {errors.tenure && <div className="userform-error-message">{errors.tenure}</div>}
          </div>
          
          <div className="userform-form-group">
            <label htmlFor="employmentStatus">Employment status</label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleInputChange}
              className={errors.employmentStatus ? 'userform-error' : ''}
            >
              <option value="" disabled>Select employment status</option>
              {employmentStatusOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.employmentStatus && <div className="userform-error-message">{errors.employmentStatus}</div>}
          </div>
        </div>
        
        <div className="userform-form-row">
          <div className="userform-form-group userform-full-width">
            <label htmlFor="reason">Reason for loan</label>
            <textarea
              id="reason"
              name="reason"
              placeholder="Please explain why you need this loan"
              value={formData.reason}
              onChange={handleInputChange}
              className={errors.reason ? 'userform-error' : ''}
              rows="4"
            />
            {errors.reason && <div className="userform-error-message">{errors.reason}</div>}
          </div>
        </div>
        
        <div className="userform-form-row">
          <div className="userform-form-group userform-full-width">
            <label htmlFor="employmentAddress">Employment address</label>
            <input
              type="text"
              id="employmentAddress"
              name="employmentAddress"
              placeholder="Enter your employment address"
              value={formData.employmentAddress}
              onChange={handleInputChange}
              className={errors.employmentAddress ? 'userform-error' : ''}
            />
            {errors.employmentAddress && <div className="userform-error-message">{errors.employmentAddress}</div>}
          </div>
        </div>
        
        <div className="userform-form-row">
          <div className="userform-form-group userform-full-width">
            <label htmlFor="employmentAddress2">Employment address (line 2)</label>
            <input
              type="text"
              id="employmentAddress2"
              name="employmentAddress2"
              placeholder="Optional: apartment, suite, building, etc."
              value={formData.employmentAddress2}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="userform-checkboxes">
          <div className="userform-checkbox-group">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptTerms}
              onChange={() => setAcceptTerms(!acceptTerms)}
              className={errors.acceptTerms ? 'userform-error' : ''}
            />
            <label htmlFor="acceptTerms">
              I have read the important information and accept that by completing the application I will be bound by the terms.
            </label>
            {errors.acceptTerms && <div className="userform-error-message">{errors.acceptTerms}</div>}
          </div>
          
          <div className="userform-checkbox-group">
            <input
              type="checkbox"
              id="acceptDisclosure"
              checked={acceptDisclosure}
              onChange={() => setAcceptDisclosure(!acceptDisclosure)}
              className={errors.acceptDisclosure ? 'userform-error' : ''}
            />
            <label htmlFor="acceptDisclosure">
              Additional credit information obtained may be disclosed from time to time to other lenders, credit bureaus or other credit reporting agencies.
            </label>
            {errors.acceptDisclosure && <div className="userform-error-message">{errors.acceptDisclosure}</div>}
          </div>
        </div>
        
        <div className="userform-button-container">
          <button 
            className="userform-cancel-button"
            onClick={() => navigate('/user-dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="userform-submit-button" 
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserForm;