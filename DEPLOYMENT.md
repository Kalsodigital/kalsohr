# KalsoHR Deployment Guide

## Production Deployment (VPS)

### Server Details
- **VPS IP**: 72.62.198.147
- **Domain**: https://www.kalsohr.com
- **OS**: AlmaLinux 10
- **Node.js**: v20.x
- **Database**: MariaDB 10.x
- **Web Server**: Nginx 1.26.3
- **Process Manager**: PM2

### Deployed Services
- **API Backend**: Port 3000 (2 instances, cluster mode)
- **Admin Frontend**: Port 3001 (2 instances, cluster mode)
- **Database**: Port 3306 (localhost)

### SSL Certificate
- **Provider**: Let's Encrypt
- **Domain**: www.kalsohr.com
- **Expires**: Auto-renews every 90 days
- **Location**: `/etc/letsencrypt/live/www.kalsohr.com/`

---

## Safe Deployment Workflow

### Prerequisites
1. Ensure all changes are committed to Git
2. Test locally before deploying
3. Have VPS SSH access ready

### Deployment Script
A safe deployment script is available at `/home/kalsohr/scripts/safe-deploy.sh` on the VPS.

**What it does:**
1. Creates automatic backup
2. Pulls latest code from Git
3. Installs dependencies
4. Builds backend & frontend
5. Runs database migrations
6. Reloads services with zero-downtime
7. Verifies deployment success

### Deploy Command
```bash
ssh kalsohr@72.62.198.147 '/home/kalsohr/scripts/safe-deploy.sh'
```

### Manual Deployment Steps

```bash
# 1. SSH to VPS
ssh kalsohr@72.62.198.147

# 2. Navigate to project
cd /home/kalsohr/apps/kalsohr

# 3. Backup before deployment (recommended)
/home/kalsohr/backups/backup.sh

# 4. Pull latest code
git pull origin main

# 5. Backend deployment
cd kalsohrapi
npm install --production
npm run build
npx prisma generate
npx prisma migrate deploy

# 6. Frontend deployment
cd ../kalsohr-admin
npm install --production
npm run build

# 7. Reload services
pm2 reload all --update-env

# 8. Verify services are running
pm2 status

# 9. Check logs for errors
pm2 logs --lines 50
```

---

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://username:password@localhost:3306/kalsohr_db"
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://www.kalsohr.com
ALLOWED_ORIGINS=https://www.kalsohr.com,https://kalsohr.com,http://kalsohr.com,http://www.kalsohr.com
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
API_VERSION=v1
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://www.kalsohr.com
NEXT_PUBLIC_APP_NAME=KalsoHR
NEXT_PUBLIC_APP_VERSION=2.3
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

---

## PM2 Configuration

The PM2 ecosystem configuration provides:
- **Zero-downtime deployments** with rolling restarts
- **Automatic restarts** on crashes
- **Memory limits** to prevent leaks
- **Log rotation** with timestamps
- **Clustering** for load balancing

### PM2 Commands
```bash
# View status
pm2 status

# Reload with zero-downtime
pm2 reload all --update-env

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Save configuration
pm2 save

# Restart specific app
pm2 restart kalsohr-api
pm2 restart kalsohr-admin
```

---

## Database Management

### Backup Database
```bash
ssh kalsohr@72.62.198.147
/home/kalsohr/backups/backup.sh
```

Backups are stored in:
- **Database**: `/home/kalsohr/backups/db/`
- **Uploads**: `/home/kalsohr/backups/uploads/`
- **Retention**: 7 days (automatic cleanup)

### Restore Database
```bash
# List available backups
ls -lh /home/kalsohr/backups/db/

# Restore from backup
cd /home/kalsohr/backups
BACKUP_FILE="db/kalsohr_db_2026-01-09_12-00-00.sql.gz"
gunzip < $BACKUP_FILE | mysql -u sowmi -p'Jobs@1487' kalsohr_db
```

### Run Migrations
```bash
cd /home/kalsohr/apps/kalsohr/kalsohrapi
npx prisma migrate deploy
```

---

## Nginx Configuration

### Config Location
`/etc/nginx/conf.d/kalsohr.conf`

### Test Configuration
```bash
sudo nginx -t
```

### Reload Nginx
```bash
sudo systemctl reload nginx
```

### View Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## SSL Certificate Management

### Certificate Location
`/etc/letsencrypt/live/www.kalsohr.com/`

### Auto-Renewal
Certbot automatically renews certificates. Check status:
```bash
sudo systemctl status certbot-renew.timer
```

### Manual Renewal (if needed)
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Add Additional Domain
```bash
# Once DNS propagates for kalsohr.com
sudo certbot certonly --webroot -w /var/www/certbot -d kalsohr.com --email admin@kalsohr.com --agree-tos --no-eff-email

# Update Nginx config to include new certificate
sudo nano /etc/nginx/conf.d/kalsohr.conf
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Logs

### Application Logs
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs kalsohr-api
pm2 logs kalsohr-admin

# View error logs only
pm2 logs kalsohr-api --err

# View last 100 lines
pm2 logs --lines 100
```

### System Logs
```bash
# Nginx errors
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### Health Checks
```bash
# API health
curl https://www.kalsohr.com/health

# Check services
pm2 status
sudo systemctl status nginx
sudo systemctl status mysqld
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Check logs for errors
pm2 logs --err --lines 50

# 2. Revert to previous commit
cd /home/kalsohr/apps/kalsohr
git reset --hard HEAD~1

# 3. Rebuild
cd kalsohrapi && npm run build && cd ..
cd kalsohr-admin && npm run build && cd ..

# 4. Restart services
pm2 reload all

# 5. If database migration failed, restore backup
cd /home/kalsohr/backups
LATEST_BACKUP=$(ls -t db/*.sql.gz | head -1)
gunzip < $LATEST_BACKUP | mysql -u sowmi -p'Jobs@1487' kalsohr_db
```

---

## Common Issues & Solutions

### CORS Errors
Update `ALLOWED_ORIGINS` in backend `.env`:
```bash
nano /home/kalsohr/apps/kalsohr/kalsohrapi/.env
# Add all domain variations
pm2 reload kalsohr-api --update-env
```

### SSL Certificate Errors
```bash
# Check certificate status
sudo certbot certificates

# Renew if expired
sudo certbot renew
sudo systemctl reload nginx
```

### Database Connection Errors
```bash
# Check MySQL is running
sudo systemctl status mysqld

# Check connection
mysql -u sowmi -p'Jobs@1487' kalsohr_db -e "SELECT 1;"
```

### PM2 App Crashes
```bash
# View crash logs
pm2 logs --err --lines 100

# Restart app
pm2 restart kalsohr-api

# If persistent, check environment variables
pm2 env kalsohr-api
```

---

## Security Notes

1. **Environment Files**: Never commit `.env` files to Git
2. **Database Credentials**: Stored only on VPS
3. **JWT Secrets**: Different for dev/production
4. **SSL**: Always use HTTPS in production
5. **Firewall**: Only ports 80, 443, and SSH are open
6. **Backups**: Automated daily backups with 7-day retention

---

## Maintenance

### Update Dependencies
```bash
# Check for outdated packages
cd /home/kalsohr/apps/kalsohr/kalsohrapi
npm outdated

cd ../kalsohr-admin
npm outdated

# Update (test in local first!)
npm update
npm run build
pm2 reload all
```

### Database Optimization
```bash
# Optimize tables
mysql -u sowmi -p'Jobs@1487' kalsohr_db -e "OPTIMIZE TABLE tablename;"
```

---

## Support

For deployment issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Review this guide
4. Check `/home/kalsohr/scripts/safe-deploy.sh` for automation

**Server Access**: SSH to `kalsohr@72.62.198.147` (password-based) or use root access.
