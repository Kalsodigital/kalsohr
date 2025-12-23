# KalsoHR API Testing Guide

This document provides comprehensive examples for testing all KalsoHR API endpoints using `curl`.

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [Testing Workflow](#testing-workflow)
- [Common Headers](#common-headers)

---

## Common Headers

All requests use these common headers:
```bash
-H "Content-Type: application/json"
```

For authenticated requests, add:
```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Authentication Endpoints

### 1. Health Check
Check if the API server is running.

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "KalsoHR API is running",
  "timestamp": "2025-12-04T18:58:42.837Z",
  "environment": "development"
}
```

---

### 2. Login

Login with email and password to get access tokens.

**Endpoint:** `POST /api/auth/login`

**Super Admin Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@kalsohr.com",
    "password": "Admin@123"
  }'
```

**Organization Admin Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@democompany.com",
    "password": "Admin@123"
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "superadmin@kalsohr.com",
      "firstName": "Super",
      "lastName": "Admin",
      "avatar": null,
      "isSuperAdmin": true,
      "role": null,
      "organization": null
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Expected Error Response (Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Expected Error Response (Missing Fields):**
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

---

### 3. Get Current User

Get the currently authenticated user's information.

**Endpoint:** `GET /api/auth/me`

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example with actual token:**
```bash
# First, login and extract the access token
ACCESS_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@kalsohr.com","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Then use it to get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "User data retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "superadmin@kalsohr.com",
      "firstName": "Super",
      "lastName": "Admin",
      "phone": null,
      "avatar": null,
      "isSuperAdmin": true,
      "isActive": true,
      "emailVerified": true,
      "lastLoginAt": "2025-12-04T18:58:43.066Z",
      "createdAt": "2025-12-04T18:41:43.376Z",
      "role": null,
      "organization": null
    }
  }
}
```

**Expected Error Response (No Token):**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Expected Error Response (Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 4. Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Expected Error Response (No Token):**
```json
{
  "success": false,
  "message": "Refresh token is required"
}
```

**Expected Error Response (Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 5. Logout

Logout the current user (client-side token removal in stateless JWT).

**Endpoint:** `POST /api/auth/logout`

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## Testing Workflow

### Complete Authentication Flow Test

1. **Login as Super Admin:**
```bash
# Save credentials to file for convenience
echo '{"email":"superadmin@kalsohr.com","password":"Admin@123"}' > /tmp/superadmin-login.json

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/superadmin-login.json \
  | jq '.'
```

2. **Extract and Store Access Token:**
```bash
ACCESS_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/superadmin-login.json \
  | jq -r '.data.tokens.accessToken')

echo "Access Token: $ACCESS_TOKEN"
```

3. **Get Current User:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | jq '.'
```

4. **Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | jq '.'
```

---

## Seeded Test Accounts

The following accounts are available in the seeded database:

### Super Admin
- **Email:** `superadmin@kalsohr.com`
- **Password:** `Admin@123`
- **Role:** Super Admin (can access all organizations)

### Organization Admin (Demo Company)
- **Email:** `admin@democompany.com`
- **Password:** `Admin@123`
- **Organization:** demo-company
- **Role:** Org Admin (full access within demo-company)

---

## Error Testing

### Test Invalid Credentials
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@email.com",
    "password": "wrongpassword"
  }'
```

### Test Missing Email
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "Admin@123"
  }'
```

### Test Missing Password
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@kalsohr.com"
  }'
```

### Test Unauthorized Access (No Token)
```bash
curl -X GET http://localhost:3000/api/auth/me
```

### Test Invalid Token
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid.token.here"
```

---

## Notes

1. **Token Expiration:**
   - Access tokens expire in 7 days (configured in `.env`)
   - Refresh tokens expire in 30 days
   - Use the refresh endpoint to get new access tokens

2. **CORS:**
   - The API accepts requests from origins configured in `.env` (`ALLOWED_ORIGINS`)
   - Default: `http://localhost:3001`

3. **Rate Limiting:**
   - Not yet implemented (planned for future)

4. **Pretty Print JSON:**
   - Install `jq` for formatted JSON output: `brew install jq`
   - Pipe curl output through `jq '.'` for pretty printing

5. **Environment:**
   - Development environment runs on `http://localhost:3000`
   - Production will use HTTPS

---

## Next Steps

As more endpoints are implemented, this document will be updated with:
- Super Admin endpoints (organization management, user management)
- Tenant-specific endpoints (employee management, attendance, leave, etc.)
- Master data endpoints (departments, designations, branches, etc.)
- Upload endpoints (file uploads for avatars, documents, etc.)
