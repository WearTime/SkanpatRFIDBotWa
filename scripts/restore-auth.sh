#!/bin/bash
# =========================================================
# Restore Auth Script
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
echo -e "${GREEN}[INFO] ${CYAN}Restore Authentication Backup${RESET}"
echo ""

shopt -s nullglob
BACKUPS=(auth_backup_*)
shopt -u nullglob

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}[ERROR] ${RED}No backups found in current directory.${RESET}"
    echo ""
    read -p "Press Enter to return to menu..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

echo -e "${YELLOW}Available Backups:${RESET}"
echo -e "${GRAY}--------------------------------------------------------${RESET}"
INDEX=1
for BACKUP in "${BACKUPS[@]}"; do
    if [ -d "$BACKUP" ]; then
        DATE_STR=$(echo "$BACKUP" | sed 's/auth_backup_//')
        echo -e " ${CYAN}[$INDEX]${RESET} $BACKUP  ${GRAY}($DATE_STR)${RESET}"
        INDEX=$((INDEX + 1))
    fi
done
echo -e "${GRAY}--------------------------------------------------------${RESET}"
echo ""

read -rp "Select a backup to restore [1-${#BACKUPS[@]}]: " CHOICE

if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#BACKUPS[@]}" ]; then
    echo -e "${RED}[ERROR] ${RED}Invalid selection."
    read -p "Press Enter to return..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

SELECTED_BACKUP="${BACKUPS[$((CHOICE - 1))]}"

if [ -z "$SELECTED_BACKUP" ]; then
    echo -e "${RED}[ERROR] ${RED}Invalid selection.${RESET}"
    read -p "Press Enter to return..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
    
fi

echo ""
echo -e "${GREEN}[INFO] ${CYAN}Selected backup: ${BLUE}$SELECTED_BACKUP${RESET}"
sleep 0.5

if [ ! -f ".env" ]; then
    echo -e "${RED}[ERROR] ${RED}No .env file found in project root.${RESET}"
    read -p "Press Enter to return..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
    
fi

PROVIDER=$(grep -E "^WHATSAPP_PROVIDER=" .env | cut -d '=' -f2 | tr -d '[:space:]')
echo -e "${GREEN}[INFO] ${YELLOW}Detected provider:${RESET} ${CYAN}$PROVIDER${RESET}"
echo ""

if [ "$PROVIDER" == "baileys" ]; then
    echo -e "${GREEN}[INFO] ${YELLOW}Existing 'baileys_auth' folder detected.${RESET}"

    if [ -d "baileys_auth" ]; then
        read -rp "Do you want to delete it before restore? (y/N): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            rm -rf baileys_auth
            echo -e "${GREEN}[INFO] ${GREEN}Deleted old 'baileys_auth'${RESET}"
        else
            echo -e "${WHITE}Please remove it manually before restoring.${RESET}"
            read -t 5 -p "Returning to main menu in 5s..."
            bash "$PROJECT_ROOT/start.sh"
    exit 0    
        fi
    fi
fi

if [ "$PROVIDER" == "whatsapp-web.js" ]; then
    echo -e "${GREEN}[INFO] ${YELLOW}Existing '.wwebjs_auth' folder detected.${RESET}"
    read -rp "Do you want to delete it before restore? (y/N): " CONFIRM
    if [ -d ".wwebjs_auth" ]; then
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            rm -rf .wwebjs_auth
            echo -e "${GREEN}[INFO] ${GREEN}Deleted old '.wwebjs_auth'${RESET}"
        else
            echo -e "${WHITE}Please remove it manually before restoring.${RESET}"
            read -t 5 -p "Returning to main menu in 5s..."
            bash "$PROJECT_ROOT/start.sh"
    exit 0
        fi
    fi
fi

echo ""
echo -e "${GREEN}[INFO] ${CYAN}Restoring backup files...${RESET}"
sleep 0.5

if [ "$PROVIDER" == "baileys" ]; then
    cp -r "$SELECTED_BACKUP/baileys_auth" ./ 2>/dev/null
    cp "$SELECTED_BACKUP/.env" . 2>/dev/null
    echo -e "${GREEN}[INFO] ${GREEN}Restored Baileys auth and .env${RESET}"
elif [ "$PROVIDER" == "whatsapp-web.js" ]; then
    cp -r "$SELECTED_BACKUP/.wwebjs_auth" ./ 2>/dev/null
    cp "$SELECTED_BACKUP/.env" . 2>/dev/null
    echo -e "${GREEN}[INFO] ${GREEN}Restored WhatsApp Web.js auth and .env${RESET}"
else
    echo -e "${RED}[ERROR] ${RED}Unknown provider type: '$PROVIDER'${RESET}"
    read -t 5 -p "Returning to main menu in 5s..."
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

echo ""
echo -e "${GREEN}[INFO] ${GREEN}Restore complete!${RESET}"
echo ""
read -t 5 -p "Returning to main menu in 5s..."
bash "$PROJECT_ROOT/start.sh"
exit 0
