import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import { FaEye, FaEyeSlash, FaInfoCircle, FaTimes } from 'react-icons/fa'; // Added info circle icon

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false); // State for showing credentials popup
  const navigate = useNavigate();
  const location = useLocation();

  // Demo credentials
  const demoCredentials = [
    {
      fullName: "John Deo",
      email: "admin@loanmanager.com",
      password: "admin123",
      role: "admin"
    },
    {
      fullName: "John Okoh",
      email: "verifier@loanmanager.com",
      password: "verifier123",
      role: "verifier"
    }
  ];

  // Check for success message from signup
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle credentials popup
  const toggleCredentials = () => {
    setShowCredentials(!showCredentials);
  };

  // Fill login form with selected credential
  const fillCredential = (credential) => {
    setFormData({
      email: credential.email,
      password: credential.password
    });
    setShowCredentials(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://loan-backend-38w6.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token and user info to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Notify parent component about successful login
      if (onLoginSuccess) {
        onLoginSuccess(data.user.role);
      }

      // Add a small delay to ensure state updates before navigation
      setTimeout(() => {
        // Redirect based on role
        switch (data.user.role) {
          case 'admin':
            navigate('/admin-dashboard', { replace: true });
            break;
          case 'verifier':
            navigate('/verifier-dashboard', { replace: true });
            break;
          case 'user':
            navigate('/user-dashboard', { replace: true });
            break;
          default:
            navigate('/user-dashboard', { replace: true });
        }
      }, 100);

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Only clear local storage if not coming from logout (which already cleared it)
  useEffect(() => {
    if (!location.state?.fromLogout && !location.state?.preserveAuth) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [location.state]);

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div className="auth-header">
          <img 
            src="https://res.cloudinary.com/dw7dhefpb/image/upload/v1746865310/CREDIT_APP_qmqdbr.png" 
            alt="Credit App Logo" 
            className="auth-logo" 
          />
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access your account</p>
        </div>

        {successMessage && <div className="auth-success">{successMessage}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group password-input-container">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <a href="/signup">Sign up</a></p>
          <button 
            type="button" 
            className="demo-credentials-button" 
            onClick={toggleCredentials}
          >
            <FaInfoCircle /> Demo Login Credentials
          </button>
        </div>

        {/* Demo Credentials Modal */}
        {showCredentials && (
          <div className="credentials-modal">
            <div className="credentials-modal-content">
              <div className="credentials-modal-header">
                <h3>Demo Login Credentials</h3>
                <button 
                  className="close-button"
                  onClick={toggleCredentials}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="credentials-list">
                {demoCredentials.map((cred, index) => (
                  <div key={index} className="credential-item">
                    <div className="credential-info">
                      <p><strong>{cred.fullName}</strong> ({cred.role})</p>
                      <p><strong>Email:</strong> {cred.email}</p>
                      <p><strong>Password:</strong> {cred.password}</p>
                    </div>
                    <button 
                      className="use-credential-button"
                      onClick={() => fillCredential(cred)}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;