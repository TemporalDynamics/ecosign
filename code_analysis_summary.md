# Comprehensive Code Analysis: EcoSign Platform

The EcoSign platform is designed for digital certification with forensic traceability, leveraging a modern JAMStack architecture. Its core purpose is to allow users to certify documents, ensuring their integrity and providing verifiable proof of existence and authenticity, potentially using blockchain anchoring.

### 1. High-Level Architecture

The project follows a modular, monorepo structure, integrating a a React frontend, a Supabase backend, and a dedicated `eco-packer` library for handling document assets.

```
verifysign/
├── client/          # Frontend: Vite + React SPA (User Interface)
├── eco-packer/      # Shared Library: Packs/Unpacks .ECO assets (Core Logic)
├── supabase/        # Backend: Database, Auth, Storage, Edge Functions
├── docs/            # Canonical documentation (this file, deployment, API, security)
├── scripts/         # Local Automation Helpers
└── vercel.json      # Hosting Configuration
```

**Key Principles:**
*   **Single Frontend**: All user experiences (marketing, onboarding, dashboard) are consolidated within the `client/` application.
*   **Serverless Backend**: Supabase provides authentication, PostgreSQL database, storage, and serverless Edge Functions, eliminating the need for a custom Node.js server.
*   **Shared Logic**: The `eco-packer` library centralizes the logic for handling `.ECO` assets, ensuring consistency and reusability across both frontend and backend (Edge Functions).
*   **Docs First**: Comprehensive documentation is maintained in the `docs/` directory.

### 2. Technology Stack Overview

*   **Frontend (`client/`)**:
    *   **Framework**: React (with JSX)
    *   **Build Tool**: Vite
    *   **Language**: JavaScript (with some TypeScript components)
    *   **Styling**: Tailwind CSS, PostCSS
    *   **Routing**: React Router
    *   **State Management**: React Hooks (`useState`, `useNavigate`, etc.)
    *   **API Client**: Supabase JavaScript client (`@supabase/supabase-js`)
*   **Shared Library (`eco-packer/`)**:
    *   **Language**: TypeScript
    *   **Testing**: Vitest
    *   **Purpose**: Core logic for `.ECO` and `.ECOX` asset manipulation.
*   **Backend (`supabase/`)**:
    *   **Database**: PostgreSQL (managed by Supabase)
    *   **Authentication**: Supabase Auth (email/password, magic links)
    *   **Storage**: Supabase Storage (for `.ECO` artifacts, raw uploads)
    *   **Serverless Functions**: Supabase Edge Functions (TypeScript/Deno) for specific backend logic (e.g., `anchor-bitcoin`, `signnow`).
    *   **Migrations**: SQL files for schema management.
*   **Testing**: Vitest (for both client and eco-packer, and security tests).
*   **Deployment**: Vercel (for frontend), Supabase (for backend services).

### 3. Key Data Flows

#### a. Authentication Flow
1.  **User Interaction**: User enters email and password in `LoginPage.jsx`.
2.  **Frontend Call**: `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()` is called from `client/src/lib/supabaseClient.ts`.
3.  **Supabase Auth**: Supabase's authentication service handles user creation, session management, and JWT token issuance.
4.  **Redirection**: Upon successful login, the user is redirected to `/dashboard` (`client/src/pages/DashboardPage.jsx`).
5.  **Session Handling**: JWT tokens are used to secure subsequent requests to Supabase services.

#### b. Document Certification Flow
1.  **User Upload**: Client-side application (`client/`) allows users to upload documents.
2.  **Client-Side Hashing**: The client hashes the uploaded document (SHA-256).
3.  **Metadata to Supabase**: The client sends the document's metadata (including the hash) to a Supabase Edge Function.
4.  **Edge Function Processing**: An Edge Function (e.g., `generate-cert`) orchestrates the certification:
    *   It uses the `eco-packer` library to build the `.ECO` payload.
    *   The payload includes the document hash, timestamp, digital signature, and potentially a blockchain anchor (e.g., via `anchor-bitcoin` function).
5.  **Storage & Database**: The resulting `.ECO` file is stored in Supabase Storage, and its reference/metadata is saved in the PostgreSQL database (e.g., `eco_certificates` table).

#### c. Document Verification Flow
1.  **User Input**: A user provides a document or `.ECOX` bundle for verification.
2.  **Client-Side Verification (Fast)**: The frontend can perform quick checks using the `eco-packer` library to re-hash the document and compare it with the embedded hash in the `.ECO` file.
3.  **Trusted Verification (Edge Function)**: For more robust verification, an Edge Function (e.g., `verify-cert`) is invoked.
    *   It uses the `eco-packer` library to re-hash and validate anchors.
    *   It checks against the stored metadata in the Supabase database.
    *   It can also verify blockchain anchors for forensic traceability.
4.  **Result Display**: The verification results are displayed to the user, potentially via `client/src/components/VerificationComponent.jsx` or `VerificationSummary.jsx`.

#### d. Guest Flow
1.  **Guest Access**: Users can choose to "Continuar como invitado" (`LoginPage.jsx`).
2.  **Guest Page**: They are directed to `/guest` (`client/src/pages/GuestPage.jsx`), where they can likely access limited functionality without authentication.

### 4. Security Model

The platform prioritizes security with multiple layers:

*   **Supabase Auth**: Secures all requests using JWTs.
*   **Row Level Security (RLS)**: Implemented in PostgreSQL (`supabase/migrations/`) to ensure users can only access their own data (e.g., certificates, NDA entries).
*   **Edge Functions**: Run with service-role keys, acting as trusted intermediaries for sensitive operations like minting `.ECO` artifacts.
*   **Hashing & Anchoring**: SHA-256 hashing and optional blockchain anchoring (`scripts/processAnchors.py`, `supabase/functions/anchor-bitcoin/`) protect document integrity and provide non-repudiable timestamps.
*   **Storage Policies**: Supabase Storage uses signed URLs and policies to enforce least privilege access to stored files.
*   **Dedicated Security Tests**: A comprehensive suite of security tests (`tests/security/`) covers CSRF, encryption, file validation, rate-limiting, RLS, sanitization, and storage.
*   **Documentation**: Detailed security policies and threat considerations are outlined in `docs/security.md`.

### 5. Development Workflow & Deployment

*   **Local Development**:
    *   `npm install` (root) for dependencies.
    *   `npm run dev --prefix client` to start the frontend.
    *   `supabase start` to run local Supabase services.
    *   `supabase db reset` for migrations.
    *   `supabase functions serve <name>` for testing Edge Functions.
*   **Testing**: `vitest` is used across the project, with specific scripts for security tests (`npm run test:security`).
*   **Deployment**:
    *   Frontend (`client/`) is built and deployed to Vercel as a static site.
    *   Supabase hosts the database, auth, storage, and Edge Functions.
    *   `vercel.json` and `supabase/config.toml` manage deployment configurations.

---

This analysis provides a comprehensive map of the EcoSign codebase, detailing its architecture, technology stack, key functional flows, and security considerations.
