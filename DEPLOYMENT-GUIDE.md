# KalsoHR Deployment Guide
## VPS: 72.62.198.147 (AlmaLinux)

---

## 📋 Pre-Deployment Checklist

✅ VPS IP: **72.62.198.147**
✅ MySQL User: **sowmi**
✅ MySQL Password: **Jobs@1487**
✅ Database Name: **kalsohr_db**
✅ Deployment Method: **SCP + PM2 + Nginx**

---

## 🚀 Deployment Steps

### STEP 1: Initial VPS Setup (Run on VPS as root)

```bash
# 1.1 Connect to VPS
ssh root@72.62.198.147

# 1.2 Update system packages
dnf update -y && dnf upgrade -y

# 1.3 Install essential tools
dnf install -y git curl wget vim nano htop

# 1.4 Configure firewall
dnf install -y firewalld
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
firewall-cmd --list-all

# 1.5 Create dedicated user
useradd -m -s /bin/bash kalsohr
passwd kalsohr
# Set password: kalsohr123 (or your choice)

# 1.6 Add to sudoers
usermod -aG wheel kalsohr

# 1.7 Switch to kalsohr user
su - kalsohr
```

---

### STEP 2: Install Node.js 20+ (Run as kalsohr user)

```bash
# 2.1 Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 2.2 Verify installation
node --version
npm --version

# 2.3 Install PM2 globally
sudo npm install -g pm2

# 2.4 Verify PM2
pm2 --version

# 2.5 Configure PM2 startup
pm2 startup systemd -u kalsohr --hp /home/kalsohr
# Copy and run the command that PM2 outputs!
```

---

### STEP 3: Install & Configure MySQL 8 (Run as kalsohr user)

```bash
# 3.1 Install MySQL
sudo dnf install -y mysql-server

# 3.2 Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld
sudo systemctl status mysqld

# 3.3 Secure MySQL installation
sudo mysql_secure_installation
# - Set root password (SAVE THIS!)
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y

# 3.4 Create database and user
sudo mysql -u root -p
```

**Run these SQL commands in MySQL prompt:**
```sql
CREATE DATABASE kalsohr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sowmi'@'localhost' IDENTIFIED BY 'Jobs@1487';
GRANT ALL PRIVILEGES ON kalsohr_db.* TO 'sowmi'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
EXIT;
```

**Test database connection:**
```bash
mysql -u sowmi -p kalsohr_db
# Password: Jobs@1487
# Type: EXIT; to exit
```

---

### STEP 4: Prepare VPS for Code Transfer

```bash
# 4.1 Create deployment directory
cd /home/kalsohr
mkdir -p apps
cd apps
pwd
# Should show: /home/kalsohr/apps

# 4.2 Create logs directory
mkdir -p /home/kalsohr/logs

# Keep this terminal open - you'll return here after SCP
```

---

### STEP 5: Transfer Code from Local Machine

**Open a NEW terminal on your LOCAL Mac (NOT on VPS!):**

```bash
# 5.1 Navigate to parent directory
cd /Users/gokulprasad/Desktop/mymac/dev

# 5.2 Transfer entire project (this may take 5-15 minutes)
scp -r kalsohr kalsohr@72.62.198.147:/home/kalsohr/apps/

# Enter kalsohr user password when prompted
# You'll see progress messages for each file

# 5.3 After transfer completes, reconnect to VPS
ssh kalsohr@72.62.198.147

# 5.4 Verify transfer
cd /home/kalsohr/apps/kalsohr
ls -la
# Should see: kalsohrapi/, kalsohr-admin/, docs/, ecosystem.config.js, etc.
```

---

### STEP 6: Setup Backend (kalsohrapi)

```bash
# 6.1 Navigate to backend
cd /home/kalsohr/apps/kalsohr/kalsohrapi

# 6.2 Install dependencies (takes 2-5 minutes)
npm install --production

# 6.3 Configure environment
cp .env.example .env
nano .env
```

**Update .env with these values:**
```bash
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
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
# 6.4 Build TypeScript
npm run build

# Verify dist/ folder exists
ls -la dist/

# 6.5 Run Prisma migrations
npx prisma generate
npx prisma migrate deploy

# 6.6 Optional: Seed database with test data
npm run prisma:seed

# 6.7 Test backend (optional - stop with Ctrl+C after testing)
npm run start
# In another terminal: curl http://localhost:3000/api/v1/health
# Stop with Ctrl+C
```

---

### STEP 7: Setup Frontend (kalsohr-admin)

```bash
# 7.1 Navigate to frontend
cd /home/kalsohr/apps/kalsohr/kalsohr-admin

# 7.2 Install dependencies (takes 2-5 minutes)
npm install --production

# 7.3 Configure environment
nano .env.local
```

**Add these contents:**
```bash
NEXT_PUBLIC_API_URL=http://72.62.198.147:3000/api/v1
NEXT_PUBLIC_APP_NAME=KalsoHR
NEXT_PUBLIC_APP_VERSION=2.3
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
# 7.4 Build Next.js (takes 2-5 minutes)
npm run build

# Verify .next/ folder exists
ls -la .next/

# 7.5 Test frontend (optional - stop with Ctrl+C after testing)
npm run start
# Should start on port 3001
# Stop with Ctrl+C
```

---

### STEP 8: Start Applications with PM2

```bash
# 8.1 Navigate to project root
cd /home/kalsohr/apps/kalsohr

# 8.2 Verify ecosystem.config.js exists
cat ecosystem.config.js

# 8.3 Start all applications
pm2 start ecosystem.config.js

# 8.4 Check status
pm2 status
# Should show: kalsohr-api (online) and kalsohr-admin (online)

# 8.5 View logs
pm2 logs

# 8.6 Save PM2 configuration
pm2 save

# 8.7 Test applications directly
curl http://localhost:3000/api/v1/health
curl http://localhost:3001
```

---

### STEP 9: Install & Configure Nginx

```bash
# 9.1 Install Nginx
sudo dnf install -y nginx

# 9.2 Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx

# 9.3 Copy nginx configuration
sudo cp /home/kalsohr/apps/kalsohr/nginx-kalsohr.conf /etc/nginx/conf.d/kalsohr.conf

# 9.4 Test Nginx configuration
sudo nginx -t

# 9.5 Restart Nginx
sudo systemctl restart nginx

# 9.6 Configure SELinux for Nginx
sudo setsebool -P httpd_can_network_connect 1

# 9.7 Configure uploads directory
sudo chcon -R -t httpd_sys_content_t /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/
sudo usermod -aG kalsohr nginx
chmod -R 755 /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/
```

---

### STEP 10: Setup Automated Backups

```bash
# 10.1 Create backups directory
mkdir -p /home/kalsohr/backups

# 10.2 Copy backup script
cp /home/kalsohr/apps/kalsohr/backup.sh /home/kalsohr/backups/
chmod +x /home/kalsohr/backups/backup.sh

# 10.3 Test backup script
/home/kalsohr/backups/backup.sh

# 10.4 Setup cron job for daily backups
crontab -e

# Add this line (daily at 2 AM):
0 2 * * * /home/kalsohr/backups/backup.sh >> /home/kalsohr/logs/backup.log 2>&1

# Save and exit
```

---

## 🎉 Deployment Complete! Testing Time

### Test 1: Backend API Health Check
```bash
curl http://72.62.198.147/api/v1/health
# Should return JSON response
```

### Test 2: Frontend Access
Open browser and navigate to:
```
http://72.62.198.147
```
Should load KalsoHR login page!

### Test 3: Super Admin Login
Navigate to:
```
http://72.62.198.147/superadmin/login
```
**Credentials:**
- Email: superadmin@kalsohr.com
- Password: Admin@123

### Test 4: Organization Login
Navigate to:
```
http://72.62.198.147/login
```
**Credentials:**
- Email: admin@democompany.com
- Password: Admin@123

### Test 5: File Upload
1. Login to organization portal
2. Go to Employees → Create Employee
3. Upload a profile picture
4. Verify it shows up

---

## 📊 Monitoring & Management

### PM2 Commands
```bash
pm2 status              # Check app status
pm2 logs                # View real-time logs
pm2 logs kalsohr-api    # View specific app logs
pm2 monit               # Monitor CPU/Memory
pm2 restart all         # Restart all apps
pm2 stop all            # Stop all apps
pm2 delete all          # Remove all apps from PM2
```

### System Monitoring
```bash
htop                    # CPU/Memory/Processes
df -h                   # Disk usage
pm2 monit               # PM2 monitoring
sudo tail -f /var/log/nginx/access.log  # Nginx access logs
sudo tail -f /var/log/nginx/error.log   # Nginx error logs
```

### Check Service Status
```bash
sudo systemctl status nginx
sudo systemctl status mysqld
pm2 status
```

### Restart Services
```bash
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mysqld
```

---

## 🔧 Troubleshooting

### Issue: Backend not starting
```bash
pm2 logs kalsohr-api
# Check DATABASE_URL in .env
mysql -u sowmi -p kalsohr_db
```

### Issue: Frontend not loading
```bash
pm2 logs kalsohr-admin
# Check NEXT_PUBLIC_API_URL in .env.local
curl http://localhost:3000/api/v1/health
```

### Issue: Nginx 502 Bad Gateway
```bash
pm2 status  # Ensure apps are running
sudo tail -100 /var/log/nginx/error.log
sudo setsebool -P httpd_can_network_connect 1
pm2 restart all
sudo systemctl restart nginx
```

### Issue: Database connection error
```bash
sudo systemctl status mysqld
mysql -u sowmi -p kalsohr_db
# Verify DATABASE_URL format in .env
```

### Issue: File uploads not working
```bash
ls -la /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/
chmod -R 755 /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/
sudo chcon -R -t httpd_sys_content_t /home/kalsohr/apps/kalsohr/kalsohrapi/uploads/
sudo systemctl restart nginx
```

---

## 🔐 Security Hardening (Optional but Recommended)

### Install Fail2Ban
```bash
sudo dnf install -y epel-release
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Enable Automatic Security Updates
```bash
sudo dnf install -y dnf-automatic
sudo nano /etc/dnf/automatic.conf
# Set: apply_updates = yes
sudo systemctl enable --now dnf-automatic.timer
```

---

## 🌐 Future: Adding Domain & SSL

When you get a domain:

1. Point domain A records to: 72.62.198.147
2. Install Certbot:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx
   ```
3. Get SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
4. Update environment files with https:// URLs
5. Restart services

---

## 📝 Important File Locations

- **Backend .env**: `/home/kalsohr/apps/kalsohr/kalsohrapi/.env`
- **Frontend .env**: `/home/kalsohr/apps/kalsohr/kalsohr-admin/.env.local`
- **PM2 Config**: `/home/kalsohr/apps/kalsohr/ecosystem.config.js`
- **Nginx Config**: `/etc/nginx/conf.d/kalsohr.conf`
- **Backup Script**: `/home/kalsohr/backups/backup.sh`
- **Logs**: `/home/kalsohr/logs/`
- **Uploads**: `/home/kalsohr/apps/kalsohr/kalsohrapi/uploads/`

---

## 🎯 Success Checklist

- [ ] Backend API responds at http://72.62.198.147/api/v1/health
- [ ] Frontend loads at http://72.62.198.147
- [ ] Super admin login works
- [ ] Organization login works
- [ ] Can create employee and upload photo
- [ ] PM2 shows both apps online
- [ ] Nginx is running
- [ ] MySQL is running
- [ ] Backup script works
- [ ] Cron job is configured

---

**Deployment Time Estimate**: 3-5 hours

Good luck with your deployment! 🚀
