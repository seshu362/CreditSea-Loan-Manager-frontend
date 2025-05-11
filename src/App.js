import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import VerifierDashboard from './components/VerifierDashboard';
import UserForm from './components/UserForm';
import './App.css';



const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Add a key to force re-render when logging in/out
  const [authKey, setAuthKey] = useState(0);

  

  // Handle successful login
  const handleLoginSuccess = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    // Increment key to force re-render of protected routes
    setAuthKey(prevKey => prevKey + 1);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserRole(null);
    // Increment key to force re-render
    setAuthKey(prevKey => prevKey + 1);
  };

  useEffect(() => {
    // Check authentication status on initial load
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.role) {
            setIsAuthenticated(true);
            setUserRole(user.role);
          }
        } catch (err) {
          console.error("Error parsing user data:", err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [authKey]); // Re-run effect when authKey changes

  // Protected route component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (isLoading) {
      return <div className="loading">Loading...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      switch(userRole) {
        case 'admin':
          return <Navigate to="/admin-dashboard" />;
        case 'verifier':
          return <Navigate to="/verifier-dashboard" />;
        default:
          return <Navigate to="/user-dashboard" />;
      }
    }

    return children;
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to={
                userRole === 'admin' ? '/admin-dashboard' :
                userRole === 'verifier' ? '/verifier-dashboard' : '/user-dashboard'
              } replace />
            ) : <Login onLoginSuccess={handleLoginSuccess} key={authKey} />
          } />
          
          <Route path="/signup" element={
            isAuthenticated ? (
              <Navigate to={
                userRole === 'admin' ? '/admin-dashboard' :
                userRole === 'verifier' ? '/verifier-dashboard' : '/user-dashboard'
              } replace />
            ) : <Signup />
          } />
          
          {/* Protected routes */}
          <Route path="/user-dashboard/*" element={
            <ProtectedRoute allowedRoles={['user']} key={`user-${authKey}`}>
              <UserDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard/*" element={
            <ProtectedRoute allowedRoles={['admin']} key={`admin-${authKey}`}>
              <AdminDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } />
          
          <Route path="/verifier-dashboard/*" element={
            <ProtectedRoute allowedRoles={['verifier', 'admin']} key={`verifier-${authKey}`}>
              <VerifierDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } />

          {/**User Form */}
           <Route path="/user-form/*" element={
            <ProtectedRoute allowedRoles={['user']} key={`user-${authKey}`}>
              <UserForm />
            </ProtectedRoute>
          } />
          
          
          {/* Default route */}
          <Route path="*" element={
            isAuthenticated ? (
              <Navigate to={
                userRole === 'admin' ? '/admin-dashboard' :
                userRole === 'verifier' ? '/verifier-dashboard' : '/user-dashboard'
              } replace />
            ) : <Navigate to="/login" replace />
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;