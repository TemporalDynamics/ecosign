# VerifySign Architecture

This document describes the architecture of the VerifySign platform, a digital certification system that creates verifiable .ECO certificates with blockchain anchoring.

## Overview

VerifySign combines:
- A static landing page for marketing and calls-to-action
- A modern React application for user interactions
- Serverless functions for backend operations
- Supabase for database and storage
- Blockchain anchoring for timestamping

## System Components

### 1. Frontend Layer

#### Landing Page (`/index.html`)
- Static marketing page with calls-to-action
- Links to `/app/access` for unified entry point
- Responsive design for all devices

#### React Application (`/app`)
Built with React, TypeScript, and Vite, featuring:
- React Router for client-side navigation
- Supabase integration for authentication and data
- Tailwind CSS for styling
- Component-based architecture

**Key Pages:**
- `/app/access`: Unified entry point (guest vs registered)
- `/app/login`: Authentication flow
- `/app/guest`: Guest certificate generation
- `/app/dashboard`: User dashboard for registered users

### 2. Backend Layer

#### Supabase Integration
- Authentication system
- Database for user accounts and certificates
- Storage for files and signatures
- Real-time subscriptions (future)

#### Netlify Functions
- `/mint-eco`: Generate .ECO certificates with blockchain anchoring
- `/anchor`: Blockchain anchoring operations
- `/log-signature`: NDA signature logging

### 3. Data Layer

#### Database Tables
- `eco_certificates`: Store .ECO certificate metadata
- `users`: User accounts and profiles
- `signatures`: NDA signature records
- `cases`: NDA case management

#### Storage
- Supabase Storage for .ECO files
- File uploads with SHA-256 verification

### 4. Certificate System (.ECO)

#### .ECO File Format
A verifiable certificate containing:
- File metadata and hash
- Timestamp
- Blockchain transaction reference
- Digital signature
- Verification information

#### Generation Process
1. User uploads file
2. Client calculates SHA-256 hash
3. Server sends hash to blockchain anchoring service
4. Certificate metadata is stored in database
5. .ECO file is generated and made available

### 5. Authentication System

#### Two-Mode Access
- **Guest Mode**: Generate certificates without account
- **Registered Mode**: Full dashboard access with history

#### Supabase Auth
- Email/password authentication
- Session management
- Protected routes

## Security Model

### Data Integrity
- SHA-256 hashing of all files
- Blockchain anchoring for timestamping
- Cryptographic signatures

### Access Control
- Role-based permissions
- Session validation
- Protected API endpoints

### Privacy
- Minimal data collection
- Encrypted storage
- User-controlled data sharing

## Development Environment

### Prerequisites
- Node.js 18+
- Netlify CLI
- Supabase account

### Setup
1. Clone the repository
2. Install dependencies: `npm install && cd app && npm install`
3. Configure environment variables
4. Run: `netlify dev`

## Deployment

### Production Deployment
The application is designed for deployment on Netlify with:
- Static site hosting
- Serverless function support
- Environment variable management
- Custom domain configuration

## Future Enhancements

### Planned Features
- Multi-blockchain support
- Advanced dashboard analytics
- Team collaboration features
- API for third-party integrations
- Enhanced file format support

### Technical Improvements
- Comprehensive test suite
- Performance optimization
- Accessibility enhancements
- Mobile app development