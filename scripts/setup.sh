#!/bin/bash
# Setup script for Bitcoin anchoring workers

set -e

echo "🔧 Setting up EcoSign Bitcoin Anchoring Workers..."

# Check Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required but not installed."
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"

# Install dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install -r scripts/requirements.txt --user

echo ""
echo "✅ Dependencies installed!"

# Check environment variables
echo ""
echo "🔍 Checking environment variables..."

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  SUPABASE_URL not set"
    echo "   Export it with: export SUPABASE_URL='https://your-project.supabase.co'"
else
    echo "✅ SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set"
    echo "   Export it with: export SUPABASE_SERVICE_ROLE_KEY='your-key'"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
fi

if [ -z "$RESEND_API_KEY" ]; then
    echo "⚠️  RESEND_API_KEY not set (optional, for email notifications)"
    echo "   Export it with: export RESEND_API_KEY='re_xxxxx'"
else
    echo "✅ RESEND_API_KEY is set"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set missing environment variables (if any)"
echo "2. Run test: python3 scripts/processAnchors.py --limit 1"
echo "3. Setup cron or systemd timer (see scripts/README.md)"
