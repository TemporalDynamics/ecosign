// api/verify-tsr.js - Vercel API route for TSR verification
import { VerificationService } from '../eco-packer/src/index';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tsrTokenB64, manifestHashHex, trustedRootsPem } = req.body;

    if (!tsrTokenB64 || !manifestHashHex) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tsrTokenB64 and manifestHashHex are required' 
      });
    }

    // Perform the TSR verification using the eco-packer service
    const report = await VerificationService.verifyTSRWithForge(
      tsrTokenB64,
      manifestHashHex,
      { 
        trustedRootsPem: trustedRootsPem ? [trustedRootsPem] : undefined 
      }
    );

    res.status(200).json({
      success: true,
      tsrReport: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TSR verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}