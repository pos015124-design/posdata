# VPS Deployment Guide

## Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)
- PM2 globally installed (`npm install -g pm2`)
- Git
- Nginx (optional, for reverse proxy)

---

## 1. Initial Setup on VPS

```bash
# SSH into your VPS
ssh root@your_vps_ip

# Update system packages
apt update && apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx (optional, for reverse proxy)
apt install -y nginx

# Clone your repository
cd /var/www
git clone https://github.com/pos015124-design/posdata.git
cd posdata
```

---

## 2. Environment Configuration

```bash
# Create .env file in root directory
cat > .env << 'EOF'
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this

# API Configuration
VITE_API_URL=https://api.yourdomain.com
API_PORT=5000
NODE_ENV=production

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Selcom Payment Gateway
SELCOM_API_URL=https://apigw.selcom.net
SELCOM_API_KEY=your_selcom_api_key
SELCOM_API_SECRET=your_selcom_secret
SELCOM_MERCHANT_CODE=your_merchant_code

# Email (if configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend
VITE_API_URL=https://yourdomain.com/api
PUBLIC_URL=https://yourdomain.com
EOF

chmod 600 .env
```

---

## 3. Backend Setup

```bash
# Navigate to project root
cd /var/www/posdata

# Install dependencies
npm install

# Run database migrations (if any)
npm run migrate

# Build the backend (if needed)
npm run build:server
```

---

## 4. Frontend Build

```bash
# Navigate to client
cd client

# Install dependencies
npm install

# Build for production
npm run build

# Output goes to dist/ folder
```

---

## 5. PM2 Setup

```bash
# Create PM2 ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'eshopbackend',
      script: './server/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      max_memory_restart: '1G'
    },
    {
      name: 'portal',
      script: 'npm run serve:client',
      cwd: '/var/www/posdata/client',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs
```

---

## 6. Nginx Configuration (Optional - Reverse Proxy)

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/posdata << 'EOF'
upstream backend {
    server localhost:5000;
    keepalive 64;
}

upstream frontend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (use Let's Encrypt - certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/js text/xml text/javascript application/javascript application/json;
    gzip_comp_level 6;

    # Backend API routes
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Server-Sent Events (SSE)
    location /api/events {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
    }

    # Frontend (SPA)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache busting for SPA
        expires -1;
    }

    # Static files (with caching)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/posdata /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## 7. SSL Setup with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal setup
certbot renew --dry-run
systemctl enable certbot.timer
```

---

## 8. Deployment Workflow (After Initial Setup)

```bash
# On local machine - commit and push
git add -A
git commit -m "your message"
git push origin main

# On VPS
cd /var/www/posdata
git pull origin main

# Rebuild frontend
cd client
npm install
npm run build
cd ..

# Install backend dependencies
npm install

# Restart services
pm2 restart eshopbackend --update-env
pm2 restart portal

# Check logs
pm2 logs

# View status
pm2 status
```

---

## 9. Database Backup

```bash
# Create backup directory
mkdir -p /var/backups/mongodb

# Create backup script
cat > /home/backup-mongo.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

# Backup MongoDB
mongodump --uri="$DATABASE_URL" --out="/tmp/mongodb_backup"

# Compress
tar -czf "$BACKUP_FILE" -C /tmp mongodb_backup

# Cleanup
rm -rf /tmp/mongodb_backup

# Keep only last 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /home/backup-mongo.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/backup-mongo.sh
```

---

## 10. Monitoring & Maintenance

```bash
# Install node-exporter for monitoring
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# Create PM2 monitor/dashboard
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# Check disk usage
df -h

# Check memory usage
free -h

# View PM2 logs in real-time
pm2 monit

# Clear old logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
```

---

## 11. Troubleshooting

```bash
# Check if services are running
pm2 status

# Restart a service
pm2 restart eshopbackend

# View detailed logs
pm2 logs eshopbackend --lines 200

# Check for process errors
pm2 errors

# Verify MongoDB connection
mongosh "$DATABASE_URL"

# Check Nginx status
systemctl status nginx
nginx -t

# Check port usage
lsof -i :5000
lsof -i :3000
lsof -i :80
lsof -i :443
```

---

## 12. Security Checklist

- [ ] Change all default credentials
- [ ] Enable SSH key-based authentication (disable password)
- [ ] Configure firewall (UFW)
  ```bash
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw enable
  ```
- [ ] Enable fail2ban for brute force protection
- [ ] Set up automated backups
- [ ] Enable SSL/TLS certificates
- [ ] Keep npm packages updated
- [ ] Monitor logs regularly
- [ ] Use environment variables for secrets (not hardcoded)

---

## 13. Quick Commands Reference

```bash
# Deployment
git pull origin main && cd client && npm run build && cd .. && pm2 restart all

# View logs
pm2 logs

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Status
pm2 status

# Monit
pm2 monit

# Save state
pm2 save
```

---

**Last Updated:** 2026-08-17
**Version:** 1.0
