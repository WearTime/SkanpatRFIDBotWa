#!/bin/bash
# =========================================================
# WhatsApp Bot Reset Script
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

echo -e "${GREEN}[INFO] ${CYAN}Resetting WhatsApp Bot Sessions...${RESET}"
sleep 0.5
echo ""

echo -ne "${GREEN}[INFO] ${WHITE}Stopping any running bot processes...${RESET}"
pkill -f "ts-node-dev" 2>/dev/null || true
pkill -f "node.*main" 2>/dev/null || true
sleep 0.5
echo -e "${GREEN}[INFO] ${GREEN}done!${RESET}"
echo ""

if [ ! -d "baileys_auth" ] && [ ! -d ".wwebjs_auth" ] && [ -d ".wwebjs_cache" ]; then
    echo -e "${GREEN}[INFO] ${YELLOW}No session folders found ('baileys_auth', '.wwebjs_auth' or '.wwebjs_cache').${RESET}"
    echo ""
    echo -e "${GREEN}[INFO] ${GREEN}Nothing to reset. Exiting.${RESET}"
    echo ""
    sleep 0.5
    bash "$PROJECT_ROOT/start.sh"
fi

echo -e "${GREEN}[INFO] ${WHITE}Cleaning old authentication folders...${RESET}"
sleep 0.3

if [ -d "baileys_auth" ]; then
    rm -rf baileys_auth
    echo -e "${GREEN}[INFO] ${GREEN}Removed 'baileys_auth'${RESET}"
    sleep 0.2
fi

if [ -d ".wwebjs_auth" ]; then
    rm -rf .wwebjs_auth
    echo -e "${GREEN}[INFO] ${GREEN}Removed '.wwebjs_auth'${RESET}"
    sleep 0.2
fi

if [ -d ".wwebjs_cache" ]; then
    rm -rf .wwebjs_cache
    echo -e "${GREEN}[INFO] ${GREEN}Removed '.wwebjs_cache'${RESET}"
    sleep 0.2
fi

echo ""
echo -e "${GREEN}[INFO] ${GREEN}Reset complete!${RESET}"
echo ""

if [ -f "$PROJECT_ROOT/start.sh" ]; then
    sleep 0.5
    bash "$PROJECT_ROOT/start.sh"
else
    echo -e "${GREEN}[INFO] ${YELLOW}'start.sh' not found in project root.${RESET}"
fi