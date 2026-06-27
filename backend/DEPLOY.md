# Manual Deployment Guide — Farmer Registration API

## Architecture

```
Internet → EC2 (Ubuntu 22.04, port 8000) → RDS PostgreSQL
                                          → S3 (selfie images)
```

---

## Prerequisites

### 1. EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: `t3.micro` (free tier)
- Security Group inbound rules:
  - Port 22 (SSH) — your IP only
  - Port 8000 (API) — 0.0.0.0/0

### 2. RDS PostgreSQL
- Engine: PostgreSQL 15
- Instance class: `db.t3.micro` (free tier)
- Public accessibility: **No** (only EC2 can reach it)
- Security Group: allow port 5432 from EC2 security group

### 3. S3 Bucket
- Create bucket: e.g. `geoportal-uploads-abc123`
- Block public access: OFF (for public selfie serving)
- Add bucket policy for public read:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::geoportal-uploads-abc123/*"
    }]
  }
  ```

### 4. IAM Role for EC2 (so boto3 works without hardcoded keys)
- Create IAM Role → EC2 → attach policy:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::geoportal-uploads-abc123",
        "arn:aws:s3:::geoportal-uploads-abc123/*"
      ]
    }]
  }
  ```
- Attach the role to your EC2 instance.

---

## Deployment Steps

### Step 1 — SSH into EC2
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### Step 2 — Upload your code
From your local machine (Windows PowerShell):
```powershell
scp -i ~/.ssh/your-key.pem -r `
  "C:\Users\Harsahada Khorgade\Downloads\Geo-Portal_APP\Geoportal-POC\backend" `
  ubuntu@<EC2-PUBLIC-IP>:/home/ubuntu/geoportal-backend
```

### Step 3 — Edit startup.sh with your real values
```bash
cd /home/ubuntu/geoportal-backend
nano startup.sh
```
Fill in:
- `DATABASE_URL` — from RDS console → Connectivity → Endpoint
- `S3_BUCKET_NAME` — your bucket name
- `S3_BASE_URL` — `https://<bucket>.s3.<region>.amazonaws.com`
- `AWS_REGION` — e.g. `ap-south-1`

### Step 4 — Run startup.sh
```bash
sudo bash startup.sh
```

This will:
1. Install Python 3.11, pip
2. Create `/opt/geoportal/` with a virtualenv
3. Install all dependencies from `requirements.txt`
4. Write `/opt/geoportal/.env`
5. Create and start a `systemd` service (`geoportal.service`)

### Step 5 — Verify
```bash
# Check service status
sudo systemctl status geoportal

# Watch live logs
journalctl -u geoportal -f

# Test health endpoint
curl http://localhost:8000/
```

---

## Updating the App After Code Changes

```bash
# On your local machine — copy updated files to EC2
scp -i ~/.ssh/your-key.pem -r \
  "C:\Users\Harsahada Khorgade\Downloads\Geo-Portal_APP\Geoportal-POC\backend\app" \
  ubuntu@<EC2-PUBLIC-IP>:/opt/geoportal/app

# On EC2 — restart the service
sudo systemctl restart geoportal
sudo journalctl -u geoportal -f
```

---

## Quick API Test

```bash
EC2_IP="<your-ec2-public-ip>"

# Health check
curl http://$EC2_IP:8000/

# List crops
curl http://$EC2_IP:8000/api/crops

# Register a farmer
curl -X POST http://$EC2_IP:8000/api/farmers/register \
  -F "farmer_name=Test Farmer" \
  -F "mobile_number=9876543210" \
  -F "crop_type=Rabi" \
  -F "crop_ids=1" \
  -F "latitude=18.52" \
  -F "longitude=73.85" \
  -F "selfie=@/path/to/photo.jpg"

# Get farmer by mobile
curl http://$EC2_IP:8000/api/farmers/mobile/9876543210
```

Expected: `selfie_url` in the response is an `https://s3.amazonaws.com/...` URL.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| 500 on startup | `journalctl -u geoportal -n 50` — usually a bad `DATABASE_URL` |
| S3 upload fails | Verify IAM role is attached to EC2 instance |
| RDS connection refused | Check RDS security group allows port 5432 from EC2 SG |
| Module not found | Run `pip install -r requirements.txt` inside the venv |
