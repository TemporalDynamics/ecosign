# API Documentation - LiveTemporalComposition

## Netlify Functions

### 1. sign-url
- **POST** `/.netlify/functions/sign-url`
  - **Body**: `{ "ownerEmail": "string", "sha256": "string", "docType"?: "string", "version"?: number, "expirySeconds"?: number }`
  - **Response**: `{ "success": true, "signUrl": "string", "shortId": "string", "docId": "string", "exp": number, "sig": "string" }`

- **GET** `/.netlify/functions/sign-url?verify=:shortId&doc=:docId&exp=:exp&sig=:sig`
  - **Response**: `{ "valid": true, "documentHash": "string", "docId": "string", "ownerEmail": "string" }` or `{ "valid": false, "error": "string" }`

### 2. log-acceptance  
- **POST** `/.netlify/functions/log-acceptance`
  - **Body**: `{ "name": "string", "email": "string", "organization": "string", "signature": "string", "documentHash": "string", "docId": "string" }`
  - **Response**: `{ "success": true, "accessToken": "string", "acceptedAt": "string", "expiresAt": "string", "documentHash": "string" }`

### 3. verify-access
- **GET** `/.netlify/functions/verify-access?token=:accessToken`
  - **Response**: `{ "valid": boolean, "expired": boolean, "email": "string", "name": "string", "organization": "string", "docHash": "string", "acceptedAt": "string", "expiresAt": "string" }`

### 4. generate-pdf
- **POST** `/.netlify/functions/generate-pdf`
  - **Body**: `{ "accessToken": "string" }`
  - **Response**: JSON proof document with signature and timestamp information