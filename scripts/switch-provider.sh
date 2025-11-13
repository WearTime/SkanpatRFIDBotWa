#!/bin/bash
# =========================================================
# Switch Provider Script
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

echo -e "${GREEN}[INFO] ${CYAN}WhatsApp Provider Switcher"
echo ""

CURRENT=$(grep "WHATSAPP_PROVIDER=" .env | cut -d'=' -f2)

if [ -z "$CURRENT" ]; then
    echo -e "${RED}[ERROR] ${RED}No provider found in .env"
    exit 1
fi

echo -e "${GREEN}[INFO] ${GREEN}Current provider: ${CYAN}$CURRENT"
echo ""
echo -e "${YELLOW}Available providers: ${RESET}"
echo -e "${CYAN}[1]${RESET} whatsapp-web.js"
echo -e "${CYAN}[2]${RESET} baileys"
echo -e "${CYAN}[3]${RED} Cancel and return to main menu ${RESET}"
echo ""
read -p "Select provider [1 or 2]: " choice

case $choice in
    1)
        NEW="whatsapp-web.js"
        ;;
    2)
        NEW="baileys"
        ;;
    3)
        echo -e "${GREEN}[INFO] ${WHITE}Returning to main menu...${RESET}"
        sleep 1
        bash "$PROJECT_ROOT/start.sh"
        exit 0
        ;;
    *)
        echo -e "${RED}[ERROR] ${RED}Invalid choice. Returning to menu...${RESET}"
        sleep 1
        bash "$PROJECT_ROOT/start.sh"
        exit 0
        ;;
esac

echo ""
echo -e "${GREEN}[INFO] ${GREEN}Switching to: ${CYAN}$NEW"

sed -i.bak "s/WHATSAPP_PROVIDER=.*/WHATSAPP_PROVIDER=$NEW/" .env
echo -e "${GREEN}[INFO] ${GREEN}.env updated"

echo ""
read -p "Delete old auth folders? (y/n): " clean

if [ "$clean" = "y" ]; then
   sleep 0.5
   bash "$PROJECT_ROOT/start.sh"
fi

echo ""
echo -e "${GREEN}[INFO] ${GREEN}Switch complete!"
echo ""