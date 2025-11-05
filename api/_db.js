// In-memory DB for MVP (netlify/functions/_db.js)
// ⚠️ Sólo para pruebas locales / MVP. En producción migrar a Supabase.
const state = {
  documents: [],   // { id, ownerEmail, type, version, sha256, storageUrl, createdAt }
  acceptances: [], // { id, docId, accessToken, partyName, partyEmail, signatureDataURL, documentHash, ipAddress, userAgent, acceptedAt, expiresAt }
  readLogs: []     // { id, accessToken, seconds, createdAt }
};

module.exports = { state };