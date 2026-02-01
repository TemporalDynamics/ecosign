# Enhanced .ECOX Verification with Legal Timestamp (TSR) Support

## Overview

This update adds comprehensive RFC 3161 Time-Stamp Protocol (TSP) verification to VerifySign, enabling validation of legal timestamps embedded in .ecox files. The system now supports server-side verification of PKCS#7 Time-Stamp Request (TSR) tokens using the robust `node-forge` library.

## Installation & Setup

The eco-packer dependency has been updated with `node-forge`:

```bash
cd eco-packer
npm install node-forge
npm run build
```

## How to Use the Enhanced Verification

### 1. Server-Side TSR Verification API
The system now includes a Vercel API endpoint for server-side verification:

```
POST /api/verify-tsr
```

**Request Body:**
```json
{
  "tsrTokenB64": "base64-encoded-TSR-token",
  "manifestHashHex": "sha256-hash-of-manifest-in-hex"
}
```

**Response:**
```json
{
  "success": true,
  "tsrReport": {
    "hashMatches": true,
    "signatureVerified": true,
    "trustChainVerified": true,
    "timestamp": "2025-01-15T10:30:00Z",
    "tsa": "Example TSA",
    "policy": "1.2.3.4.5",
    "warnings": [],
    "errors": []
  }
}
```

### 2. Client-Side Verification
The verification service automatically uses server-side verification when possible, falling back to client-side verification as needed:

```javascript
import { verifyEcoxFile } from '../lib/verificationService';

const result = await verifyEcoxFile(ecoxFile);
// result.data.legalTimestampReport contains detailed TSR verification data
```

## Why Server-Side Verification is Important

### Security Benefits:
1. **Trustworthy PKCS#7 Parsing**: Server-side `node-forge` provides robust ASN.1 parsing for complex PKI structures
2. **Certificate Chain Validation**: Proper X.509 trust chain verification that's difficult to implement reliably in browsers
3. **Tamper-Resistant**: Server-side verification can't be bypassed by client-side manipulation

### Legal Compliance:
1. **RFC 3161 Compliance**: Validates timestamps according to international standards
2. **TSA Trust**: Validates the Time Stamping Authority's signature and chain of trust
3. **Hash Verification**: Ensures the hashed content matches what was actually timestamped

### Forensic Robustness:
1. **Non-Repudiation**: Provides cryptographic proof of existence at a specific time
2. **Chain of Custody**: Documents the complete verification process with granular detail
3. **Audit Trail**: All verification steps and results are logged for forensic use

## Verification Process Flow

1. **File Upload**: User uploads .ecox file
2. **Format Verification**: Checks .ecox structure and manifest
3. **Ed25519 Signature**: Validates cryptographic signature
4. **Hash Verification**: Confirms file integrity
5. **Legal Timestamp Verification**: 
   - Extracts TSR token from .ecox
   - Sends to server-side `/api/verify-tsr`
   - Server validates PKCS#7, signature, and hash match
   - Checks trust chain (if configured)
6. **Blockchain Anchoring**: Verifies OpenTimestamps status
7. **Results Display**: Shows comprehensive verification report

## Integration with UI

The VerifyPage.jsx automatically displays enhanced legal timestamp information:

- **RFC 3161 Badge**: Shows when legal timestamp verification passes
- **Detailed Report**: Shows hash matches, signature status, TSA info
- **Layer Status**: Verification layers show pass/fail for each check
- **Error Details**: Granular warnings and errors for forensic analysis

## Security Considerations

- The server-side verification ensures that only verified timestamps are considered trusted
- Certificate root stores can be configured for enterprise environments
- All verification steps are logged and auditable
- Client-side fallback maintains functionality if server verification is unavailable

## Example Usage

When you verify a .ecox file containing a legal timestamp, you'll see:

- ✅ RFC 3161 badge when timestamp verification passes
- Detailed TSA information (name, policy, timestamp)
- Hash comparison results (what was hashed vs. what was timestamped)
- Signature and certificate chain validation status
- Complete forensic verification report

This enhancement makes VerifySign suitable for legal and forensic applications requiring certified timestamps with non-repudiation properties.