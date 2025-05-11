# Loan Management System

A comprehensive loan management application with user, verifier, and admin roles. Built with React frontend and Express/SQLite backend.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Default Accounts](#default-accounts)
- [Screenshots](#screenshots)

## Overview

This Loan Management System provides a platform for users to apply for loans, verifiers to verify applications, and administrators to manage the overall system. The system handles loan applications, verification processes, approvals/rejections, and tracking of repayments.

## Features

- *User Authentication*: Secure registration and login system
- *Role-based Access Control*: Different dashboards and capabilities for users, verifiers, and administrators
- *Loan Application*: Form for users to apply for loans
- *Loan Management*: Track, verify, approve, or reject loan applications
- *Dashboard Statistics*: Visual representations of system data
- *Search Functionality*: Find loans by various criteria

## System Architecture

### Frontend
- React.js
- React Router for navigation
- Modern responsive UI

### Backend
- Node.js with Express
- SQLite database
- JWT authentication
- bcrypt for password hashing

## Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)

## Installation

### Backend Setup

1. Navigate to the backend directory:

bash
cd backend


2. Install dependencies:

bash
npm install


3. The database will be automatically created and seeded with sample data when you start the server.

### Frontend Setup

1. Navigate to the frontend directory:

bash
cd ../frontend


2. Install dependencies:

bash
npm install


3. Create a .env file in the frontend directory with the following content:


REACT_APP_API_URL=http://localhost:5000


## Running the Application

### Start the Backend Server

bash
cd backend
node server.js


The server will start running on http://localhost:5000

### Start the Frontend Application

In a new terminal:

bash
cd frontend
npm start


The React app will start running on http://localhost:3000

## API Documentation

### Authentication Endpoints

- *POST /signup* - Register a new user
- *POST /login* - Authenticate a user and receive a JWT token

### User Endpoints

- *GET /user/loans* - Get all loans for the logged-in user
- *POST /loans* - Submit a new loan application
- *GET /loan-application-form* - Get loan application form structure

### Verifier Endpoints

- *GET /loans/recent* - Get recent loan applications
- *GET /loans* - Get all loan applications
- *PUT /loans/:id/verify* - Verify a pending loan
- *GET /dashboard/verifier* - Get statistics for verifier dashboard

### Admin Endpoints

- *PUT /loans/:id/status* - Update loan status (approve/reject)
- *GET /dashboard/admin* - Get statistics for admin dashboard



## User Roles

1. *User*
   - Can apply for loans
   - Can view their loan applications and status

2. *Verifier*
   - Can view all loan applications
   - Can verify pending applications
   - Cannot approve or reject loans

3. *Admin*
   - Has all verifier permissions
   - Can approve or reject verified loans
   - Can view system-wide statistics

## Default Accounts

The system is seeded with the following default accounts:

1. *Admin*
   - Email: admin@loanmanager.com
   - Password: admin123

2. *Verifier*
   - Email: verifier@loanmanager.com
   - Password: verifier123


