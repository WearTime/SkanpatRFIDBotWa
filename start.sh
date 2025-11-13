#!/bin/bash
# ============================================
# WhatsApp Bot Management Script
# Author: Muhamad Rizqi Wiransyah & Muhammad Bangkit Sanjaya
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
CYAN='\033[1;36m'
NC='\033[0m' 

clear
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════╗"
echo "║        WhatsApp Bot Management Tool        ║"
echo "╠════════════════════════════════════════════╣"
echo "║ Manage, reset, check, and configure easily ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Select an option:${NC}"
echo -e "  ${CYAN}[1].${NC} Start The Engine!"
echo -e "  ${CYAN}[2].${NC} Reset Baileys Auth"
echo -e "  ${CYAN}[3].${NC} Check Dependencies"
echo -e "  ${CYAN}[4].${NC} Switch WhatsApp Provider"
echo -e "  ${CYAN}[5].${NC} Backup Authentication"
echo -e "  ${CYAN}[6].${NC} Restore Backup Authentication"
echo -e "  ${CYAN}[7].${NC} Complete Installation"
echo -e "  ${CYAN}[0].${RED} Exit ${NC}"
echo -e ""

read -p "Enter choice [0-6]: " choice
echo ""

case $choice in
  1)
    bash ./scripts/run-the-engine.sh
    ;;
  2)
    bash ./scripts/reset-baileys.sh
    ;;
  3)
    bash ./scripts/check-dependencies.sh
    ;;
  4)
    bash ./scripts/switch-provider.sh
    ;;
  5)
    bash ./scripts/backup-auth.sh
    ;;
  6)
    bash ./scripts/restore-auth.sh
    ;;
  7)
    bash ./scripts/install-all.sh
    ;;
  0)
    echo -e "${RED}Exiting...${NC}"
    ;;
  *)
    echo -e "${RED}Invalid option. Please choose 0-6.${NC}"
    ;;
esac

echo ""
