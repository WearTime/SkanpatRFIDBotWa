# =========================================================
# Dependency Checker & Updater
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

echo -e "${GREEN}[INFO] ${CYAN}Checking project dependencies...${RESET}"
echo ""

OUTDATED=$(npm outdated --json 2>/dev/null)

if [ -z "$OUTDATED" ]; then
    echo -e "${GREEN}[INFO] ${GREEN}All dependencies are up to date!${RESET}"
    echo ""
    echo -e "${GREEN}[INFO] ${CYAN}Starting bot...${RESET}"
    sleep 1
    bash "$PROJECT_ROOT/start.sh"
    exit 0
fi

echo -e "${GREEN}[INFO] ${YELLOW}Some dependencies are outdated:${RESET}"
echo ""
npm outdated
echo ""
echo -e "${WHITE}What would you like to do?${RESET}"
echo ""
echo -e "${CYAN}[1]${RESET} Update a specific dependency"
echo -e "${CYAN}[2]${RESET} Update all dependencies"
echo -e "${CYAN}[3]${RESET} Reinstall all dependencies (clean install)"
echo -e "${CYAN}[4]${RED} Cancel and return to main menu ${RESET}"
echo ""
read -rp "Choose an option [1-4]: " CHOICE
echo ""

case "$CHOICE" in
    1)
        echo -e "${WHITE}Enter the name of the dependency to update:${RESET}"
        read -rp "Package name: " PACKAGE
        if [ -z "$PACKAGE" ]; then
            echo -e "${RED}[ERROR] ${RED}No package entered. Returning to menu...${RESET}"
            sleep 1
            bash "$PROJECT_ROOT/start.sh"
            exit 0
        fi
        echo -e "${GREEN}[INFO] ${CYAN}Updating '$PACKAGE'...${RESET}"
        npm install "$PACKAGE@latest"
        ;;
    2)
        echo -e "${GREEN}[INFO] ${CYAN}Updating all dependencies to latest versions...${RESET}"
        npm update
        ;;
    3)
        echo -e "${GREEN}[INFO] ${YELLOW}This will remove and reinstall all dependencies.${RESET}"
        read -rp "Are you sure? (y/N): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}[INFO] ${CYAN}Cleaning node_modules and reinstalling...${RESET}"
            rm -rf node_modules package-lock.json
            npm install
        else
            echo -e "${WHITE}Operation cancelled.${RESET}"
        fi
        ;;
    4)
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
echo -e "${GREEN}[INFO] ${GREEN}Dependency update complete!${RESET}"
echo ""
sleep 1
bash "$PROJECT_ROOT/start.sh"