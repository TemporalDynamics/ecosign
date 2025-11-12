# 🚀 VerifySign MVP Deployment Guide

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Vercel account (for frontend + backend API functions)
- [ ] Supabase account (for database)
- [ ] SendGrid account (for email notifications)
- [ ] Polygon wallet with MATIC tokens (for blockchain anchoring)
- [ ] Domain name (optional, but recommended)

## Environment Variables Setup

Create the following environment variables in your Vercel deployment:

### Vercel Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Polygon (update after deploying smart contract)
POLYGON_CONTRACT_ADDRESS=your_contract_address
POLYGON_PRIVATE_KEY=your_wallet_private_key

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# Cron jobs
CRON_SECRET=your_random_cron_secret

# Production URL
VERCEL_URL=https://yourdomain.com
```

## Deployment Steps

### 1. Deploy Smart Contract (Polygon)

1. Fund your wallet with MATIC tokens
2. Update the `hardhat.config.js` with your wallet private key
3. Deploy to Polygon Mainnet:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network polygon
   ```
4. Save the contract address and update `POLYGON_CONTRACT_ADDRESS` in your environment variables

### 2. Database Setup (Supabase)

1. Create a new Supabase project
2. Copy the database schema from `supabase_schema.sql` and run it in your database SQL editor
3. Configure RLS policies as defined in the schema
4. Set up Supabase Auth for user authentication
5. Add your Supabase credentials to environment variables

### 3. Deploy to Vercel

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add the environment variables listed above
4. Make sure to set `VERCEL_ENV=production`
5. Deploy the application

### 4. Configure Cron Jobs

The OTS confirmation cron job is configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-ots-confirmations",
    "schedule": "*/5 * * * *"
  }]
}
```

### 5. Configure Custom Domain (Optional)

1. Add your custom domain in Vercel dashboard
2. Configure DNS settings as instructed
3. Wait for DNS propagation

## Post-Deployment Verification

After deployment, verify the following:

- [ ] Main application loads at your domain
- [ ] Dashboard shows the certification list functionality
- [ ] OpenTimestamps API works (try certifying with blockchain anchoring)
- [ ] Polygon anchoring works (if enabled and configured)
- [ ] Verification tracking is functional
- [ ] NDA acceptance works on VerifyPage
- [ ] Email notifications are sent (after OTS confirmation)
- [ ] VerifyTracker dashboard shows tracking data

## Security Checklist

- [ ] All private keys are stored in environment variables, not committed to code
- [ ] CORS is properly configured
- [ ] RLS policies are active in Supabase
- [ ] Rate limiting is implemented on API endpoints
- [ ] Input validation is in place on all endpoints

## Monitoring

- [ ] Set up error monitoring (Sentry or similar)
- [ ] Configure logging for debugging
- [ ] Monitor cron job execution
- [ ] Track API usage and performance

## Troubleshooting

### Common Issues:

1. **Supabase RLS errors**: Check that authentication is working and RLS policies are correctly set
2. **OpenTimestamps failures**: Verify the backend API function is deployed and configured
3. **Polygon anchoring failures**: Check that the smart contract is deployed and the wallet has sufficient MATIC
4. **Email delivery issues**: Verify SendGrid integration and check spam filters

## Rollback Plan

If issues occur after deployment:
1. Keep the old version running
2. Deploy fixes to a staging environment first
3. Test all functionality thoroughly
4. Deploy to production once validated

---

## 🎉 Congratulations!

Your VerifySign MVP is now live and ready for users. The platform includes all the features from the roadmap:
- ✅ Dual blockchain anchoring (OpenTimestamps + Polygon) 
- ✅ Legal timestamp (RFC 3161)
- ✅ NDA functionality
- ✅ Verification tracking (VerifyTracker)
- ✅ Email notifications
- ✅ Complete user dashboard

The platform is production-ready and can handle real-world document certification and verification needs.