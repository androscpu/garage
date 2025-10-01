# Deployment Guide

This guide covers different deployment options for the Cloud Hotel Management System.

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM and 10GB disk space

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd cloud-hotel-system

# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Services Included
- **PostgreSQL**: Database server
- **Redis**: Caching and session storage
- **Backend**: Node.js API server
- **Frontend**: React application with Nginx
- **Nginx**: Reverse proxy (optional)

### Configuration Files
- `docker-compose.yml`: Main orchestration file
- `Dockerfile.backend`: Backend container configuration
- `client/Dockerfile`: Frontend container configuration
- `nginx.conf`: Nginx configuration for reverse proxy

## 🖥️ Manual Deployment

### Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- PostgreSQL 12+
- Nginx (recommended)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 2: Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE hotel_system;
CREATE USER hotel_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE hotel_system TO hotel_user;
\q
```

### Step 3: Application Deployment
```bash
# Clone repository
git clone <repository-url>
cd cloud-hotel-system

# Install dependencies
npm install
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with production values

# Build frontend
cd client && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Nginx Configuration
```nginx
# /etc/nginx/sites-available/hotel-system
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    root /path/to/cloud-hotel-system/client/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io proxy
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## ☁️ Cloud Platform Deployment

### AWS Deployment
```bash
# Using AWS ECS with Fargate
aws ecs create-cluster --cluster-name hotel-system

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster hotel-system --service-name hotel-api --task-definition hotel-system:1
```

### Google Cloud Platform
```bash
# Using Cloud Run
gcloud run deploy hotel-system \
  --image gcr.io/PROJECT-ID/hotel-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure Container Instances
```bash
# Deploy to Azure
az container create \
  --resource-group hotel-system-rg \
  --name hotel-system \
  --image hotel-system:latest \
  --dns-name-label hotel-system \
  --ports 80
```

## 🔧 Production Configuration

### Environment Variables
```env
# Production settings
NODE_ENV=production
PORT=3000

# Database (use managed database service)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=hotel_system
DB_USER=hotel_user
DB_PASSWORD=secure_password
DB_SSL=true

# Security
JWT_SECRET=very-long-random-string-change-this
SESSION_SECRET=another-long-random-string

# External Services
STRIPE_SECRET_KEY=sk_live_your_live_key
THREECX_API_URL=https://your-3cx-server.com:5001/api

# Email (use service like SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

### Security Checklist
- [ ] Use HTTPS with valid SSL certificates
- [ ] Set strong JWT secrets
- [ ] Enable database SSL connections
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable monitoring and logging
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting
- [ ] Set up CORS properly
- [ ] Use secure headers

### Performance Optimization
```javascript
// PM2 ecosystem file
module.exports = {
  apps: [{
    name: 'hotel-system',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl -f http://localhost:3000/health

# Database connection
curl -f http://localhost:3000/api/health/db

# Check logs
pm2 logs hotel-system
```

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U hotel_user hotel_system > backup_$(date +%Y%m%d).sql

# File uploads backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Compress and upload to S3 (optional)
gzip $BACKUP_DIR/db_$DATE.sql
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/
```

### Monitoring Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🚀 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm ci
          cd client && npm ci
          
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: |
          cd client && npm run build
          
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/app
            git pull origin main
            npm install --production
            cd client && npm run build
            pm2 restart hotel-system
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U hotel_user -d hotel_system

# Check logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Application Not Starting
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs hotel-system

# Restart application
pm2 restart hotel-system
```

#### High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Optimize PM2 configuration
pm2 delete hotel-system
pm2 start ecosystem.config.js
```

### Log Analysis
```bash
# Application logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 📞 Support

For deployment support:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue with deployment details
4. Contact the development team

---

**Remember to always test deployments in a staging environment first!**