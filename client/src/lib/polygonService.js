const API_URL = '/api/polygon-timestamp';

export async function registerOnPolygon(hashHex) {
  console.log('⛓️ Registering on Polygon blockchain...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        hash: hashHex
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Registered on Polygon:', result.txHash);

    return result;

  } catch (error) {
    console.error('❌ Polygon error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function verifyOnPolygon(hashHex) {
  console.log('🔍 Verifying on Polygon...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        hash: hashHex
      })
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Verification error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}