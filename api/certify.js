// api/certify.js
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import { pack } from '@temporaldynamics/eco-packer';
import { getPublicKey, signMessage, calculateSHA256 } from '../lib/crypto';
import { stamp as otsStamp } from '../lib/opentimestamps';
import { register as polygonRegister } from '../lib/polygon';
import { fetchTimestamp as rfc3161Timestamp } from '../lib/rfc3161';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    try {
      const file = files.file;
      const fileContent = await fs.readFile(file.filepath);

      const {
        ndaRequired,
        useLegalTimestamp,
        useBlockchainAnchoring,
        usePolygonAnchoring,
        userEmail,
        userId,
      } = fields;

      const privateKey = process.env.SERVER_SIGNING_PRIVATE_KEY;
      const publicKey = await getPublicKey(privateKey);
      const hash = calculateSHA256(fileContent);

      let legalTimestampResponse = null;
      if (useLegalTimestamp === 'true') {
        legalTimestampResponse = await rfc3161Timestamp(hash);
      }

      let blockchainResponse = null;
      if (useBlockchainAnchoring === 'true') {
        blockchainResponse = await otsStamp(hash);
      }

      let polygonResponse = null;
      if (usePolygonAnchoring === 'true') {
        polygonResponse = await polygonRegister(hash);
      }

      const project = {
        version: '1.0.0',
        projectId: `proj_${Date.now()}`,
        metadata: {
          title: file.originalFilename,
          description: `Certified document: ${file.originalFilename}`,
          createdAt: new Date().toISOString(),
          author: userEmail,
          tags: ['certified', 'verifysign', 'server'],
          nda: {
            required: ndaRequired === 'true',
          },
        },
        assets: [
          {
            assetId: `asset_${Date.now()}`,
            type: 'document',
            name: file.originalFilename,
            mimeType: file.mimetype,
            size: file.size,
            hash,
          },
        ],
        segments: [],
        timeline: {
          duration: 0,
          fps: 0,
          segments: [],
        },
      };

      const assets = new Map();
      assets.set(project.assets[0].assetId, fileContent);

      const signature = await signMessage(JSON.stringify(project), privateKey);

      const options = {
        project,
        assets,
        signatures: [
          {
            keyId: userId,
            signerId: userEmail,
            publicKey,
            signature,
            algorithm: 'Ed25519',
            ...(legalTimestampResponse && { legalTimestampResponse }),
            ...(blockchainResponse && { blockchainResponse }),
            ...(polygonResponse && { polygonResponse }),
          },
        ],
      };

      const packedData = await pack(options);

      res.json({
        success: true,
        fileName: file.originalFilename,
        fileSize: file.size,
        hash,
        timestamp: project.metadata.createdAt,
        ecox: packedData.toString('base64'),
        publicKey,
        signature,
        ecoxManifest: project,
        legalTimestamp: legalTimestampResponse,
        blockchainAnchoring: blockchainResponse,
        polygonAnchoring: polygonResponse,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}