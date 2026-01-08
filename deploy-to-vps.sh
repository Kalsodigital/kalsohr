#!/bin/bash

################################################################################
# KalsoHR Automated Deployment Script
# VPS: 72.62.198.147 (AlmaLinux)
# This script automates the entire deployment process
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="72.62.198.147"
DB_NAME="kalsohr_db"
DB_USER="sowmi"
DB_PASS="Jobs@1487"
DEPLOY_USER="kalsohr"
DEPLOY_DIR="/home/kalsohr/apps/kalsohr"
MYSQL_ROOT_PASS=""

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_if_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root for initial setup"
        print_info "Please run: sudo bash deploy-to-vps.sh"
        exit 1
    fi
}

################################################################################
# STEP 1: System Setup and Updates
################################################################################
step1_system_setup() {
    print_header "STEP 1: System Setup and Updates"

    print_info "Updating system packages..."
    dnf update -y > /dev/null 2>&1
    print_success "System packages updated"

    print_info "Installing essential tools..."
    dnf install -y git curl wget vim nano htop > /dev/null 2>&1
    print_success "Essential tools installed"
}

################################################################################
# STEP 2: Configure Firewall
################################################################################
step2_configure_firewall() {
    print_header "STEP 2: Configure Firewall"

    print_info "Installing and configuring firewalld..."
    dnf install -y firewalld > /dev/null 2>&1
    systemctl start firewalld
    systemctl enable firewalld > /dev/null 2>&1

    print_info "Opening ports (80, 443, 3000, 3001)..."
    firewall-cmd --permanent --add-service=http > /dev/null 2>&1
    firewall-cmd --permanent --add-service=https > /dev/null 2>&1
    firewall-cmd --permanent --add-port=3000/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=3001/tcp > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1

    print_success "Firewall configured"
}

################################################################################
# STEP 3: Create Deployment User
################################################################################
step3_create_user() {
    print_header "STEP 3: Create Deployment User"

    if id "$DEPLOY_USER" &>/dev/null; then
        print_info "User $DEPLOY_USER already exists"
    else
        print_info "Creating user $DEPLOY_USER..."
        useradd -m -s /bin/bash $DEPLOY_USER
        echo "$DEPLOY_USER:kalsohr123" | chpasswd
        usermod -aG wheel $DEPLOY_USER
        print_success "User $DEPLOY_USER created (password: kalsohr123)"
    fi
}

################################################################################
# STEP 4: Install Node.js 20+
################################################################################
step4_install_nodejs() {
    print_header "STEP 4: Install Node.js 20+"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_info "Node.js already installed: $NODE_VERSION"
    else
        print_info "Installing Node.js 20..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        dnf install -y nodejs > /dev/null 2>&1
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    fi

    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        print_info "PM2 already installed: $PM2_VERSION"
    else
        print_info "Installing PM2..."
        npm install -g pm2 > /dev/null 2>&1
        print_success "PM2 installed"
    fi
}

################################################################################
# STEP 5: Install and Configure MySQL
################################################################################
step5_install_mysql() {
    print_header "STEP 5: Install and Configure MySQL"

    if systemctl is-active --quiet mysqld; then
        print_info "MySQL is already running"
    else
        print_info "Installing MySQL..."
        dnf install -y mysql-server > /dev/null 2>&1
        systemctl start mysqld
        systemctl enable mysqld > /dev/null 2>&1
        print_success "MySQL installed and started"
    fi

    print_info "Waiting for MySQL to be ready..."
    sleep 5

    # Check if database exists
    if mysql -u root -e "USE $DB_NAME;" 2>/dev/null; then
        print_info "Database $DB_NAME already exists"
    else
        print_info "Creating database and user..."

        # Prompt for MySQL root password if not set
        if [ -z "$MYSQL_ROOT_PASS" ]; then
            echo -e "${YELLOW}Enter MySQL root password (or press Enter if not set yet): ${NC}"
            read -s MYSQL_ROOT_PASS
        fi

        if [ -z "$MYSQL_ROOT_PASS" ]; then
            # No root password set yet, connect without password
            mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        else
            # Root password is set
            mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        fi

        print_success "Database $DB_NAME and user $DB_USER created"
    fi

    # Test connection
    if mysql -u $DB_USER -p"$DB_PASS" -e "USE $DB_NAME;" 2>/dev/null; then
        print_success "Database connection test successful"
    else
        print_error "Database connection test failed"
        exit 1
    fi
}

################################################################################
# STEP 6: Prepare Deployment Directory
################################################################################
step6_prepare_directory() {
    print_header "STEP 6: Prepare Deployment Directory"

    print_info "Creating deployment directories..."
    mkdir -p /home/$DEPLOY_USER/apps
    mkdir -p /home/$DEPLOY_USER/logs
    mkdir -p /home/$DEPLOY_USER/backups

    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/apps
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/logs
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/backups

    print_success "Deployment directories created"

    print_info "Checking if code exists at $DEPLOY_DIR..."
    if [ -d "$DEPLOY_DIR" ]; then
        print_success "Code directory exists"
    else
        print_error "Code not found at $DEPLOY_DIR"
        print_info "Please transfer your code using:"
        print_info "  scp -r /Users/gokulprasad/Desktop/mymac/dev/kalsohr $DEPLOY_USER@$VPS_IP:/home/$DEPLOY_USER/apps/"
        exit 1
    fi
}

################################################################################
# STEP 7: Configure Backend
################################################################################
step7_configure_backend() {
    print_header "STEP 7: Configure Backend"

    cd $DEPLOY_DIR/kalsohrapi

    print_info "Installing backend dependencies..."
    sudo -u $DEPLOY_USER npm install --production > /dev/null 2>&1
    print_success "Backend dependencies installed"

    print_info "Creating .env file..."
    sudo -u $DEPLOY_USER cat > .env <<EOF
NODE_ENV=production
PORT=3000

DATABASE_URL="mysql://$DB_USER:$DB_PASS@localhost:3306/$DB_NAME"

JWT_SECRET=KalsoHR-Super-Secret-JWT-Key-2025-Production-Min32Chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=KalsoHR-Refresh-Secret-Key-2025-Production-Min32Chars
JWT_REFRESH_EXPIRES_IN=30d

FRONTEND_URL=http://$VPS_IP:3001

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

API_VERSION=v1
EOF
    print_success "Backend .env file created"

    print_info "Building TypeScript..."
    sudo -u $DEPLOY_USER npm run build > /dev/null 2>&1
    print_success "TypeScript compiled"

    print_info "Running Prisma migrations..."
    sudo -u $DEPLOY_USER npx prisma generate > /dev/null 2>&1
    sudo -u $DEPLOY_USER npx prisma migrate deploy > /dev/null 2>&1
    print_success "Database migrations completed"

    print_info "Seeding database..."
    sudo -u $DEPLOY_USER npm run prisma:seed > /dev/null 2>&1 || print_info "Seed script may have already run"
    print_success "Backend configured"

    # Create uploads directory
    mkdir -p uploads
    chown -R $DEPLOY_USER:$DEPLOY_USER uploads
    chmod -R 755 uploads
}

################################################################################
# STEP 8: Configure Frontend
################################################################################
step8_configure_frontend() {
    print_header "STEP 8: Configure Frontend"

    cd $DEPLOY_DIR/kalsohr-admin

    print_info "Installing frontend dependencies..."
    sudo -u $DEPLOY_USER npm install --production > /dev/null 2>&1
    print_success "Frontend dependencies installed"

    print_info "Creating .env.local file..."
    sudo -u $DEPLOY_USER cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://$VPS_IP:3000/api/v1
NEXT_PUBLIC_APP_NAME=KalsoHR
NEXT_PUBLIC_APP_VERSION=2.3
NEXT_PUBLIC_ENABLE_ANALYTICS=false
EOF
    print_success "Frontend .env.local file created"

    print_info "Building Next.js application (this may take 2-5 minutes)..."
    sudo -u $DEPLOY_USER npm run build > /dev/null 2>&1
    print_success "Next.js build completed"
}

################################################################################
# STEP 9: Start Applications with PM2
################################################################################
step9_start_pm2() {
    print_header "STEP 9: Start Applications with PM2"

    cd $DEPLOY_DIR

    print_info "Stopping any existing PM2 processes..."
    sudo -u $DEPLOY_USER pm2 delete all > /dev/null 2>&1 || true

    print_info "Starting applications with PM2..."
    sudo -u $DEPLOY_USER pm2 start ecosystem.config.js > /dev/null 2>&1
    print_success "Applications started"

    print_info "Saving PM2 configuration..."
    sudo -u $DEPLOY_USER pm2 save > /dev/null 2>&1

    print_info "Configuring PM2 startup..."
    sudo -u $DEPLOY_USER pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER > /tmp/pm2-startup.sh 2>&1
    # Extract and run the startup command
    STARTUP_CMD=$(grep "sudo" /tmp/pm2-startup.sh | head -1)
    if [ ! -z "$STARTUP_CMD" ]; then
        eval $STARTUP_CMD > /dev/null 2>&1
    fi

    print_success "PM2 configured"

    sleep 5

    print_info "Checking PM2 status..."
    sudo -u $DEPLOY_USER pm2 status
}

################################################################################
# STEP 10: Install and Configure Nginx
################################################################################
step10_configure_nginx() {
    print_header "STEP 10: Install and Configure Nginx"

    if systemctl is-active --quiet nginx; then
        print_info "Nginx is already running"
    else
        print_info "Installing Nginx..."
        dnf install -y nginx > /dev/null 2>&1
        systemctl start nginx
        systemctl enable nginx > /dev/null 2>&1
        print_success "Nginx installed and started"
    fi

    print_info "Copying Nginx configuration..."
    cp $DEPLOY_DIR/nginx-kalsohr.conf /etc/nginx/conf.d/kalsohr.conf

    print_info "Testing Nginx configuration..."
    nginx -t

    print_info "Restarting Nginx..."
    systemctl restart nginx
    print_success "Nginx configured"

    print_info "Configuring SELinux for Nginx..."
    setsebool -P httpd_can_network_connect 1 > /dev/null 2>&1
    chcon -R -t httpd_sys_content_t $DEPLOY_DIR/kalsohrapi/uploads/ > /dev/null 2>&1
    usermod -aG $DEPLOY_USER nginx

    print_success "SELinux configured"
}

################################################################################
# STEP 11: Setup Automated Backups
################################################################################
step11_setup_backups() {
    print_header "STEP 11: Setup Automated Backups"

    print_info "Copying backup script..."
    cp $DEPLOY_DIR/backup.sh /home/$DEPLOY_USER/backups/
    chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/backups/backup.sh
    chmod +x /home/$DEPLOY_USER/backups/backup.sh

    print_info "Testing backup script..."
    sudo -u $DEPLOY_USER /home/$DEPLOY_USER/backups/backup.sh

    print_info "Setting up cron job for daily backups..."
    # Add cron job if not exists
    CRON_JOB="0 2 * * * /home/$DEPLOY_USER/backups/backup.sh >> /home/$DEPLOY_USER/logs/backup.log 2>&1"
    (sudo -u $DEPLOY_USER crontab -l 2>/dev/null | grep -v backup.sh; echo "$CRON_JOB") | sudo -u $DEPLOY_USER crontab -

    print_success "Automated backups configured"
}

################################################################################
# STEP 12: Final Tests
################################################################################
step12_final_tests() {
    print_header "STEP 12: Final Tests and Verification"

    sleep 5

    print_info "Testing backend API..."
    if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        print_success "Backend API is responding"
    else
        print_error "Backend API is not responding"
    fi

    print_info "Testing frontend..."
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Frontend is responding"
    else
        print_error "Frontend is not responding"
    fi

    print_info "Testing Nginx proxy..."
    if curl -s http://$VPS_IP/api/v1/health > /dev/null 2>&1; then
        print_success "Nginx reverse proxy is working"
    else
        print_error "Nginx reverse proxy is not working"
    fi
}

################################################################################
# MAIN EXECUTION
################################################################################
main() {
    clear
    print_header "KalsoHR Automated Deployment"
    print_info "VPS IP: $VPS_IP"
    print_info "Starting deployment process..."
    echo ""

    check_if_root

    step1_system_setup
    step2_configure_firewall
    step3_create_user
    step4_install_nodejs
    step5_install_mysql
    step6_prepare_directory
    step7_configure_backend
    step8_configure_frontend
    step9_start_pm2
    step10_configure_nginx
    step11_setup_backups
    step12_final_tests

    print_header "🎉 DEPLOYMENT COMPLETE! 🎉"
    echo ""
    echo -e "${GREEN}Your KalsoHR application is now live!${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  Frontend:      ${YELLOW}http://$VPS_IP${NC}"
    echo -e "  Super Admin:   ${YELLOW}http://$VPS_IP/superadmin/login${NC}"
    echo -e "  Org Login:     ${YELLOW}http://$VPS_IP/login${NC}"
    echo ""
    echo -e "${BLUE}Test Credentials:${NC}"
    echo -e "  Super Admin:   ${YELLOW}superadmin@kalsohr.com / Admin@123${NC}"
    echo -e "  Org Admin:     ${YELLOW}admin@democompany.com / Admin@123${NC}"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  PM2 Status:    ${YELLOW}pm2 status${NC}"
    echo -e "  View Logs:     ${YELLOW}pm2 logs${NC}"
    echo -e "  Restart Apps:  ${YELLOW}pm2 restart all${NC}"
    echo ""
    echo -e "${GREEN}Open your browser and navigate to: http://$VPS_IP${NC}"
    echo ""
}

# Run main function
main
