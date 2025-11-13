#!/bin/bash
# setup-keys.sh - Helper script to configure VerifySign keys
# Usage: ./scripts/setup-keys.sh [local|vercel|show]

set -e

KEYS_DIR=".keys-backup"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 VerifySign Key Setup${NC}"
echo "================================"

if [ ! -d "$KEYS_DIR" ]; then
    echo -e "${RED}❌ Error: $KEYS_DIR directory not found${NC}"
    echo "Generate keys first with: openssl genrsa ..."
    exit 1
fi

# Function to check if keys exist
check_keys() {
    if [ ! -f "$KEYS_DIR/eco_signing_private_NEW.pem" ]; then
        echo -e "${RED}❌ Missing: eco_signing_private_NEW.pem${NC}"
        exit 1
    fi
    if [ ! -f "$KEYS_DIR/eco_signing_public_NEW.pem" ]; then
        echo -e "${RED}❌ Missing: eco_signing_public_NEW.pem${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Keys found${NC}"
}

# Function to setup local environment
setup_local() {
    echo -e "\n${YELLOW}Setting up local environment...${NC}"
    
    if [ -f ".env.local" ]; then
        echo -e "${YELLOW}⚠️  .env.local already exists. Backup created as .env.local.backup${NC}"
        cp .env.local .env.local.backup
    fi
    
    cat > .env.local << EOF
# VerifySign Local Development Keys
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# DO NOT COMMIT THIS FILE

# ECO Signing Keys
ECO_PRIVATE_KEY="$(cat $KEYS_DIR/eco_signing_private_NEW.pem | tr '\n' '|' | sed 's/|/\\n/g')"
ECO_PUBLIC_KEY="$(cat $KEYS_DIR/eco_signing_public_NEW.pem | tr '\n' '|' | sed 's/|/\\n/g')"

# SSH Keys (if needed)
SSH_PRIVATE_KEY="$(cat $KEYS_DIR/verifysign_key_NEW | tr '\n' '|' | sed 's/|/\\n/g')"

# Supabase (from client/.env)
VITE_SUPABASE_URL=https://tbxowirrvgtvfnxcdqks.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieG93aXJydmd0dmZueGNkcWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTQyMjgsImV4cCI6MjA3Nzg3MDIyOH0.GgVYH10zh--64FyGlNGYaZcbVXow3Bj9iZS3Zq9HWXQ
EOF

    echo -e "${GREEN}✅ Local environment configured (.env.local created)${NC}"
    echo -e "${YELLOW}💡 Remember: .env.local is in .gitignore${NC}"
}

# Function to setup Vercel
setup_vercel() {
    echo -e "\n${YELLOW}Setting up Vercel environment...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found${NC}"
        echo "Install with: npm i -g vercel"
        exit 1
    fi
    
    echo -e "${YELLOW}Adding ECO_PRIVATE_KEY...${NC}"
    vercel env add ECO_PRIVATE_KEY production < "$KEYS_DIR/eco_signing_private_NEW.pem" || true
    
    echo -e "${YELLOW}Adding ECO_PUBLIC_KEY...${NC}"
    vercel env add ECO_PUBLIC_KEY production < "$KEYS_DIR/eco_signing_public_NEW.pem" || true
    
    echo -e "${GREEN}✅ Vercel environment configured${NC}"
    echo -e "${YELLOW}💡 Verify at: https://vercel.com/dashboard > Settings > Environment Variables${NC}"
}

# Function to show keys (public only)
show_keys() {
    echo -e "\n${YELLOW}Public Keys (safe to share):${NC}"
    echo "================================"
    echo ""
    echo "ECO Public Key:"
    cat "$KEYS_DIR/eco_signing_public_NEW.pem"
    echo ""
    echo "SSH Public Key:"
    cat "$KEYS_DIR/verifysign_key_NEW.pub"
    echo ""
    echo -e "${RED}⚠️  NEVER share private keys!${NC}"
}

# Main logic
check_keys

case "${1:-help}" in
    local)
        setup_local
        ;;
    vercel)
        setup_vercel
        ;;
    show)
        show_keys
        ;;
    help|*)
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  local   - Setup .env.local for local development"
        echo "  vercel  - Upload keys to Vercel (requires Vercel CLI)"
        echo "  show    - Display public keys only"
        echo "  help    - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 local          # Setup local environment"
        echo "  $0 vercel         # Configure Vercel production"
        echo "  $0 show           # Show public keys"
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
