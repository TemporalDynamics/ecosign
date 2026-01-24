#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Shadow runs accumulator for D5-D8.
 *
 * Creates workflows, signers, and simulates state transitions to generate
 * shadow decision logs without UI or email delivery.
 */

import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

type Options = {
  runs: number;
  signersPerWorkflow: number;
  emails: string[];
  dbUrl: string;
};

const DEFAULT_DB_URL = Deno.env.get('SUPABASE_DB_URL')
  ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function parseArgs(args: string[]): Partial<Options> {
  const out: Partial<Options> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--runs=')) {
      out.runs = Number(arg.split('=')[1]);
    } else if (arg === '--runs') {
      out.runs = Number(args[i + 1]);
      i += 1;
    } else if (arg.startsWith('--signers=')) {
      out.signersPerWorkflow = Number(arg.split('=')[1]);
    } else if (arg === '--signers') {
      out.signersPerWorkflow = Number(args[i + 1]);
      i += 1;
    } else if (arg.startsWith('--emails=')) {
      out.emails = arg.split('=')[1].split(',').map((e) => e.trim()).filter(Boolean);
    } else if (arg === '--emails') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('Missing value for --emails. Provide a comma-separated list on the same line.');
      }
      out.emails = next.split(',').map((e) => e.trim()).filter(Boolean);
      i += 1;
    } else if (arg.startsWith('--db=')) {
      out.dbUrl = arg.split('=')[1];
    } else if (arg === '--db') {
      out.dbUrl = args[i + 1];
      i += 1;
    }
  }
  return out;
}

async function main() {
  const parsed = parseArgs(Deno.args);
  const options: Options = {
    runs: parsed.runs ?? 50,
    signersPerWorkflow: parsed.signersPerWorkflow ?? 2,
    emails: parsed.emails ?? [
      'manus1986@gmail.com',
      'manuelsenorans3@gmail.com',
      'guarderiarodantemexico@gmail.com',
      'temporaldynamicsllc@protonmail.com',
      'myvistaapp@pm.me',
      'demo1@ecosign.local',
      'demo2@ecosign.local',
    ],
    dbUrl: parsed.dbUrl ?? DEFAULT_DB_URL,
  };

  if (!options.emails.length) {
    throw new Error('No emails provided. Use --emails or set a default list.');
  }

  if (!Number.isFinite(options.runs) || options.runs <= 0) {
    throw new Error('--runs must be a positive number.');
  }

  if (!Number.isFinite(options.signersPerWorkflow) || options.signersPerWorkflow <= 0) {
    throw new Error('--signers must be a positive number.');
  }

  const client = new Client(options.dbUrl);
  await client.connect();

  try {
    const ownerResult = await client.queryObject<{ id: string }>(
      'SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1',
    );
    const ownerId = ownerResult.rows[0]?.id;

    if (!ownerId) {
      throw new Error('No auth.users found. Create a user first.');
    }

    console.log(`Using owner_id: ${ownerId}`);
    console.log(`Runs: ${options.runs}, Signers per workflow: ${options.signersPerWorkflow}`);

    let emailIndex = 0;

    for (let i = 0; i < options.runs; i += 1) {
      const workflowTitle = `shadow-run-${Date.now()}-${i}.pdf`;
      const workflowInsert = await client.queryObject<{ id: string }>(
        `INSERT INTO signature_workflows (owner_id, original_filename, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [ownerId, workflowTitle],
      );

      const workflowId = workflowInsert.rows[0].id;

      const signerIds: string[] = [];
      for (let s = 0; s < options.signersPerWorkflow; s += 1) {
        const email = options.emails[emailIndex % options.emails.length];
        emailIndex += 1;
        const accessTokenHash = crypto.randomUUID().replace(/-/g, '');

        const signerInsert = await client.queryObject<{ id: string }>(
          `INSERT INTO workflow_signers (
             workflow_id,
             signing_order,
             email,
             name,
             require_login,
             require_nda,
             quick_access,
             status,
             access_token_hash,
             token_expires_at,
             access_token_ciphertext,
             access_token_nonce
           ) VALUES ($1, $2, $3, $4, true, true, false, 'invited', $5, NOW() + INTERVAL '30 days', '', '')
           RETURNING id`,
          [workflowId, s + 1, email, `Signer ${s + 1}`, accessTokenHash],
        );

        signerIds.push(signerInsert.rows[0].id);
      }

      for (const signerId of signerIds) {
        await client.queryArray(
          `UPDATE workflow_signers
           SET status = 'ready_to_sign', updated_at = NOW()
           WHERE id = $1`,
          [signerId],
        );

        await client.queryArray(
          `UPDATE workflow_signers
           SET status = 'signed', signed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [signerId],
        );
      }

      await client.queryArray(
        `UPDATE signature_workflows
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [workflowId],
      );

      if ((i + 1) % 10 === 0 || i === options.runs - 1) {
        console.log(`Completed ${i + 1}/${options.runs} runs`);
      }
    }

    console.log('✅ Shadow runs completed.');
  } finally {
    await client.end();
  }
}

await main();
