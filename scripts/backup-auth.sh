#!/bin/bash
# =========================================================
# Backup Auth Script
# Author: Muhamad Rizqi Wiransyah & Muhammad Bangkit Sanjaya
# =========================================================

GREEN="\033[1;32m"
BLUE="\033[1;34m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
WHITE="\033[1;37m"
GRAY="\033[0;37m"
RESET="\033[0m"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

clear


echo ""
echo -e "${GRAY}======================================================================${RESET}"
cat << "EOF"
__        __   _           _        ____        _   
\ \      / /__| |__   __ _| |_ ___ | __ )  ___ | |_ 
 \ \ /\ / / _ \ '_ \ / _` | __/ _ \|  _ \ / _ \| __| 
  \ V  V /  __/ |_) | (_| | || (_) | |_) | (_) | |_  
   \_/\_/ \___|_.__/ \__,_|\__\___/|____/ \___/ \__| 
EOF

echo -e "${GRAY}======================================================================${RESET}"
echo ""

echo -e "${GREEN}[INFO] ${CYAN}Backing up authentication...${RESET}"
echo ""

if [ ! -d "baileys_auth" ] && [ ! -d ".wwebjs_auth" ]; then
    echo -e "${GREEN}[INFO] ${YELLOW}No session folders found ('baileys_auth' or '.wwebjs_auth').${RESET}"
    echo ""
    echo -e "${GREEN}[INFO] ${GREEN}Nothing to backup. Exiting.${RESET}"
    echo ""
    sleep 0.5
    bash "$PROJECT_ROOT/start.sh"
fi

BACKUP_DIR="auth_backup_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ -d "baileys_auth" ]; then
    cp -r baileys_auth "$BACKUP_DIR/baileys_auth/"
    echo -e "${GREEN}[INFO] ${GREEN}Baileys auth backed up${RESET}"
fi

if [ -d ".wwebjs_auth" ]; then
    cp -r .wwebjs_auth "$BACKUP_DIR/.wwebjs_auth/"
    echo -e "${GREEN}[INFO] ${GREEN}WhatsApp Web auth backed up${RESET}"
fi

if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/"
    echo -e "${GREEN}[INFO] ${GREEN}Environment file backed up${RESET}"
fi

echo -e ""
echo -e "${GREEN}[INFO] ${GREEN}Backup complete!"
echo -e "${GREEN}[INFO] ${CYAN}Location: ${BLUE}$BACKUP_DIR"
echo ""
read -t 5 -p "Returning to main menu in 5s..."
bash "$PROJECT_ROOT/start.sh"