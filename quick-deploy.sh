#!/bin/bash

################################################################################
# KalsoHR Quick Deployment from GitHub
# Run this script on your VPS as root: sudo bash quick-deploy.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KalsoHR Quick Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash quick-deploy.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1/10: Updating system...${NC}"
dnf update -y > /dev/null 2>&1
dnf install -y git curl wget vim nano > /dev/null 2>&1
# Try to install htop, but don't fail if not available
dnf install -y htop > /dev/null 2>&1 || echo -e "${BLUE}(htop not available, skipping)${NC}"
echo -e "${GREEN}✓ System updated${NC}"

echo -e "${YELLOW}Step 2/10: Configuring firewall...${NC}"
dnf install -y firewalld > /dev/null 2>&1
systemctl start firewalld
systemctl enable firewalld > /dev/null 2>&1
firewall-cmd --permanent --add-service=http > /dev/null 2>&1
firewall-cmd --permanent --add-service=https > /dev/null 2>&1
firewall-cmd --permanent --add-port=3000/tcp > /dev/null 2>&1
firewall-cmd --permanent --add-port=3001/tcp > /dev/null 2>&1
firewall-cmd --reload > /dev/null 2>&1
echo -e "${GREEN}✓ Firewall configured${NC}"

echo -e "${YELLOW}Step 3/10: Creating deployment user...${NC}"
if ! id "kalsohr" &>/dev/null; then
    useradd -m -s /bin/bash kalsohr
    echo "kalsohr:kalsohr123" | chpasswd
    usermod -aG wheel kalsohr
    echo -e "${GREEN}✓ User created (kalsohr:kalsohr123)${NC}"
else
    echo -e "${GREEN}✓ User already exists${NC}"
fi

echo -e "${YELLOW}Step 4/10: Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    dnf install -y nodejs > /dev/null 2>&1
fi
npm install -g pm2 > /dev/null 2>&1
echo -e "${GREEN}✓ Node.js $(node --version) and PM2 installed${NC}"

echo -e "${YELLOW}Step 5/10: Installing MySQL...${NC}"
if ! systemctl is-active --quiet mysqld; then
    dnf install -y mysql-server > /dev/null 2>&1
    systemctl start mysqld
    systemctl enable mysqld > /dev/null 2>&1
fi
echo -e "${GREEN}✓ MySQL installed${NC}"

echo -e "${YELLOW}Step 6/10: Setting up database...${NC}"
echo "Enter MySQL root password (press Enter if not set yet):"
read -s MYSQL_ROOT_PASS

if [ -z "$MYSQL_ROOT_PASS" ]; then
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS kalsohr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sowmi'@'localhost' IDENTIFIED BY 'Jobs@1487';
GRANT ALL PRIVILEGES ON kalsohr_db.* TO 'sowmi'@'localhost';
FLUSH PRIVILEGES;
EOF
else
    mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS kalsohr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sowmi'@'localhost' IDENTIFIED BY 'Jobs@1487';
GRANT ALL PRIVILEGES ON kalsohr_db.* TO 'sowmi'@'localhost';
FLUSH PRIVILEGES;
EOF
fi
echo -e "${GREEN}✓ Database configured${NC}"

echo -e "${YELLOW}Step 7/10: Cloning repository from GitHub...${NC}"
mkdir -p /home/kalsohr/apps /home/kalsohr/logs /home/kalsohr/backups
chown -R kalsohr:kalsohr /home/kalsohr/apps /home/kalsohr/logs /home/kalsohr/backups

cd /home/kalsohr/apps
if [ -d "kalsohr" ]; then
    echo -e "${BLUE}Repository exists, pulling latest...${NC}"
    cd kalsohr
    sudo -u kalsohr git pull origin main > /dev/null 2>&1
else
    sudo -u kalsohr git clone https://github.com/Kalsodigital/kalsohr.git > /dev/null 2>&1
    cd kalsohr
fi
echo -e "${GREEN}✓ Code cloned from GitHub${NC}"

echo -e "${YELLOW}Step 8/10: Setting up backend...${NC}"
cd /home/kalsohr/apps/kalsohr/kalsohrapi
sudo -u kalsohr npm install --production > /dev/null 2>&1

sudo -u kalsohr cat > .env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://sowmi:Jobs@1487@localhost:3306/kalsohr_db"
JWT_SECRET=KalsoHR-Super-Secret-JWT-Key-2025-Production-Min32Chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=KalsoHR-Refresh-Secret-Key-2025-Production-Min32Chars
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://72.62.198.147:3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
API_VERSION=v1
EOF

sudo -u kalsohr npm run build > /dev/null 2>&1
sudo -u kalsohr npx prisma generate > /dev/null 2>&1
sudo -u kalsohr npx prisma migrate deploy > /dev/null 2>&1
sudo -u kalsohr npm run prisma:seed > /dev/null 2>&1 || true
mkdir -p uploads && chmod -R 755 uploads && chown -R kalsohr:kalsohr uploads
echo -e "${GREEN}✓ Backend configured${NC}"

echo -e "${YELLOW}Step 9/10: Setting up frontend...${NC}"
cd /home/kalsohr/apps/kalsohr/kalsohr-admin
sudo -u kalsohr npm install --production > /dev/null 2>&1

sudo -u kalsohr cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://72.62.198.147:3000/api/v1
NEXT_PUBLIC_APP_NAME=KalsoHR
NEXT_PUBLIC_APP_VERSION=2.3
NEXT_PUBLIC_ENABLE_ANALYTICS=false
EOF

echo -e "${BLUE}Building frontend (this takes 2-5 minutes)...${NC}"
sudo -u kalsohr npm run build
echo -e "${GREEN}✓ Frontend configured${NC}"

echo -e "${YELLOW}Step 10/10: Starting services...${NC}"
cd /home/kalsohr/apps/kalsohr
sudo -u kalsohr pm2 delete all > /dev/null 2>&1 || true
sudo -u kalsohr pm2 start ecosystem.config.js > /dev/null 2>&1
sudo -u kalsohr pm2 save > /dev/null 2>&1

# PM2 startup
sudo -u kalsohr pm2 startup systemd -u kalsohr --hp /home/kalsohr > /tmp/pm2-startup.sh 2>&1
STARTUP_CMD=$(grep "sudo" /tmp/pm2-startup.sh | head -1)
if [ ! -z "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1
fi

# Install Nginx
if ! systemctl is-active --quiet nginx; then
    dnf install -y nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx > /dev/null 2>&1
fi

cp /home/kalsohr/apps/kalsohr/nginx-kalsohr.conf /etc/nginx/conf.d/kalsohr.conf
nginx -t && systemctl restart nginx

# SELinux configuration
setsebool -P httpd_can_network_connect 1 > /dev/null 2>&1
chcon -R -t httpd_sys_content_t /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/ > /dev/null 2>&1
usermod -aG kalsohr nginx

# Setup backups
cp /home/kalsohr/apps/kalsohr/backup.sh /home/kalsohr/backups/
chmod +x /home/kalsohr/backups/backup.sh
chown kalsohr:kalsohr /home/kalsohr/backups/backup.sh

CRON_JOB="0 2 * * * /home/kalsohr/backups/backup.sh >> /home/kalsohr/logs/backup.log 2>&1"
(sudo -u kalsohr crontab -l 2>/dev/null | grep -v backup.sh; echo "$CRON_JOB") | sudo -u kalsohr crontab -

echo -e "${GREEN}✓ Services started${NC}"

sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Access your application:${NC}"
echo -e "  Frontend:      ${YELLOW}http://72.62.198.147${NC}"
echo -e "  Super Admin:   ${YELLOW}http://72.62.198.147/superadmin/login${NC}"
echo -e "  Org Login:     ${YELLOW}http://72.62.198.147/login${NC}"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo -e "  Super Admin:   ${YELLOW}superadmin@kalsohr.com / Admin@123${NC}"
echo -e "  Org Admin:     ${YELLOW}admin@democompany.com / Admin@123${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  ${YELLOW}pm2 status${NC}       - Check application status"
echo -e "  ${YELLOW}pm2 logs${NC}         - View application logs"
echo -e "  ${YELLOW}pm2 restart all${NC}  - Restart applications"
echo ""
