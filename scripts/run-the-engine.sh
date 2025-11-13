#!/bin/bash
# =========================================================
# Run The Engine! Script
# Author: Muhamad Rizqi Wiransyah & GPT-5
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
cd "$PROJECT_ROOT" || exit 1

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
echo -e "${GREEN}[INFO] ${CYAN}Run THe Engine Script${RESET}"
echo ""

echo -e "${GREEN}[INFO] ${CYAN}Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "${RED}[ERROR] ${RED}Node.js 18+ required. Current: $(node -v)"
    echo ""
    read -p "Press Enter to return to menu..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

echo -e "${GREEN}[INFO] ${GREEN}Node.js ${CYAN}$(node -v)"
echo ""

echo -e "${GREEN}[INFO] ${CYAN}Checking .env files..."

if [ ! -f ".env" ]; then
    echo -e "${RED}[ERROR] ${RED}Environment file not found!${RESET}"
    echo ""
    read -p "Press Enter to return to menu..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

echo -e "${GREEN}[INFO] ${CYAN}Building App..."
npm run build

echo -e "${GREEN}[INFO] ${CYAN}Starting the Engine..."
clear
npm run dev