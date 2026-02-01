# Contributing to VerifySign

Thank you for your interest in contributing to VerifySign! This document provides guidelines and information about how to contribute to the project.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Guidelines](#code-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issues](#issues)
- [Community](#community)

## Getting Started

VerifySign is a digital certification platform that creates verifiable .ECO certificates with blockchain anchoring. It combines both static landing pages and a modern React application.

## Development Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/your-username/verifysign.git
cd verifysign
```

2. **Install dependencies:**
```bash
npm install
cd app
npm install
```

3. **Set up environment variables:**
Create `.env` files as described in the README.md

4. **Run the development server:**
```bash
netlify dev
```

## Project Structure

- `/` - Static landing page (index.html) and legacy HTML pages
- `/app` - Modern React application
  - `/src` - React source code
    - `/pages` - React page components
    - `/components` - Reusable UI components
    - `/lib` - Utility libraries (Supabase client, crypto utils, etc.)
- `/api` - Server-side API functions
- `/netlify/functions` - Netlify serverless functions
- `/eco-packer` - ECO file generation library

## Code Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Add comments for complex logic
- Ensure TypeScript type safety
- Use meaningful variable and function names
- Follow accessibility best practices

### TypeScript
- Use strict typing everywhere possible
- Create type definitions for complex objects
- Prefer interfaces over types when possible

### React Components
- Use functional components with hooks
- Keep components focused and reusable
- Use proper error boundaries where needed
- Follow accessibility standards

## Pull Request Process

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Make your changes
3. Add tests if applicable
4. Update documentation if needed
5. Ensure all tests pass
6. Commit your changes with a clear message
7. Push to your fork (`git push origin feature/AmazingFeature`)
8. Open a Pull Request with a detailed description

## Issues

- Search existing issues before creating a new one
- Use issue templates when available
- Provide as much detail as possible
- Include steps to reproduce for bug reports

### Good First Issues
Look for issues labeled `good first issue` if you're new to the project.

## Community

- Be respectful and inclusive
- Ask questions in issues or discussions
- Help review other contributions
- Share feedback constructively

## Questions?

If you have any questions about contributing, feel free to open an issue or check the existing documentation.

---

Thank you for contributing to VerifySign and helping make digital trust more accessible!