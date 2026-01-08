# 🚀 Quick Deployment Instructions

## Your code is now on GitHub!
Repository: https://github.com/Kalsodigital/kalsohr.git

---

## 📝 Simple 3-Step Deployment

### Step 1: Connect to your VPS
```bash
ssh root@72.62.198.147
# Password: /,in0Bv)X50PwpkOXV5n
```

### Step 2: Download and run the deployment script
```bash
curl -o quick-deploy.sh https://raw.githubusercontent.com/Kalsodigital/kalsohr/main/quick-deploy.sh
chmod +x quick-deploy.sh
sudo bash quick-deploy.sh
```

### Step 3: Test your application
Open your browser and go to:
```
http://72.62.198.147
```

---

## ✅ That's it!

The script will automatically:
- ✓ Update system packages
- ✓ Install Node.js, PM2, MySQL, Nginx
- ✓ Clone your code from GitHub
- ✓ Setup database (kalsohr_db)
- ✓ Install all dependencies
- ✓ Build backend and frontend
- ✓ Run database migrations
- ✓ Start applications with PM2
- ✓ Configure Nginx reverse proxy
- ✓ Setup automated backups

**Total time: ~10-15 minutes** (mostly waiting for npm installs)

---

## 🎯 Test Credentials

**Super Admin Login:**
- URL: http://72.62.198.147/superadmin/login
- Email: superadmin@kalsohr.com
- Password: Admin@123

**Organization Login:**
- URL: http://72.62.198.147/login
- Email: admin@democompany.com
- Password: Admin@123

---

## 🔧 Useful Commands (after deployment)

```bash
pm2 status          # Check app status
pm2 logs            # View logs
pm2 restart all     # Restart apps
pm2 monit           # Monitor CPU/Memory
```

---

## 🆘 If Something Goes Wrong

If the script fails, you can run it again. It's idempotent (safe to run multiple times).

Or check logs:
```bash
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📱 Need Help?

The script shows progress as it runs. Watch for any red error messages.

All done! 🎉
