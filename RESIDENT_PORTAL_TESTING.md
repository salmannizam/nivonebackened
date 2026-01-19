# Resident Portal API Testing Guide

## Prerequisites

1. **Backend server running** on `http://localhost:3000` (or update BASE_URL in test script)
2. **Database setup** with:
   - At least one tenant
   - At least one resident with:
     - `phone` matching test mobile number
     - `status: 'ACTIVE'`
     - `portalEnabled: true`
     - `personId` linked to a Person document
3. **Feature flag enabled**: `RESIDENT_PORTAL` must be enabled for the tenant
4. **SMS configuration**: `SMS_API_KEY` must be set in `.env` for OTP sending

## Setup Steps

### 1. Enable Feature Flag

```bash
# Via API or directly in database
PATCH /api/feature-flags/tenant
{
  "features": {
    "residentPortal": true
  }
}
```

### 2. Create/Update Resident with Portal Access

```bash
# Update resident to enable portal
PATCH /api/residents/:id
{
  "portalEnabled": true,
  "personId": "<personId>"  # Link to Person document
}
```

### 3. Create Person Document (if not exists)

The Person document should be created automatically when a resident requests OTP, but you can also create it manually:

```javascript
// In MongoDB or via API
{
  "mobile": "9876543210",  // Must match resident's phone
  "name": "Test Resident",
  "email": "test@example.com"  // Optional
}
```

## API Endpoints

### 1. Request OTP
```bash
POST /api/resident-auth/request-otp
Content-Type: application/json

{
  "mobile": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 2. Verify OTP
```bash
POST /api/resident-auth/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}

Response (Single residency):
{
  "resident": {
    "id": "...",
    "name": "...",
    "phone": "...",
    "roomNumber": "...",
    "bedNumber": "...",
    "tenantId": "...",
    "tenantName": "...",
    "tenantSlug": "..."
  }
}

Response (Multiple residencies):
{
  "multipleResidencies": true,
  "residencies": [
    {
      "tenantId": "...",
      "tenantName": "PG 1",
      "tenantSlug": "pg1"
    },
    {
      "tenantId": "...",
      "tenantName": "PG 2",
      "tenantSlug": "pg2"
    }
  ]
}
```

### 3. Login with Selected Tenant (if multiple residencies)
```bash
POST /api/resident-auth/login-tenant
Content-Type: application/json

{
  "mobile": "9876543210",
  "tenantId": "<selected-tenant-id>"
}

Response:
{
  "resident": { ... }
}
```

### 4. Get Dashboard
```bash
GET /api/resident-portal/dashboard
Cookie: residentAccessToken=...

Response:
{
  "resident": { ... },
  "summary": {
    "totalDue": 5000,
    "totalPaid": 10000,
    "securityDeposit": 5000,
    "pendingComplaints": 2,
    "activeGatePasses": 1
  }
}
```

### 5. Get My Stay
```bash
GET /api/resident-portal/my-stay
Cookie: residentAccessToken=...
```

### 6. Get Payments
```bash
GET /api/resident-portal/payments
Cookie: residentAccessToken=...

Response:
{
  "rentPayments": [ ... ],
  "extraPayments": [ ... ],
  "securityDeposit": { ... }
}
```

### 7. Get Complaints
```bash
GET /api/resident-portal/complaints
Cookie: residentAccessToken=...
```

### 8. Get Notices
```bash
GET /api/resident-portal/notices
Cookie: residentAccessToken=...
```

### 9. Get Gate Passes
```bash
GET /api/resident-portal/gate-passes
Cookie: residentAccessToken=...
```

### 10. Get Visitors
```bash
GET /api/resident-portal/visitors
Cookie: residentAccessToken=...
```

### 11. Get Current Resident
```bash
POST /api/resident-auth/me
Cookie: residentAccessToken=...
```

### 12. Refresh Token
```bash
POST /api/resident-auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}

Response:
{
  "accessToken": "..."
}
```

### 13. Logout
```bash
POST /api/resident-auth/logout
Cookie: residentAccessToken=...

Response:
{
  "message": "Logged out successfully"
}
```

## Testing with cURL

### Quick Test Sequence

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/resident-auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9876543210"}'

# 2. Verify OTP (replace 123456 with actual OTP)
curl -X POST http://localhost:3000/api/resident-auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9876543210", "otp": "123456"}' \
  -c cookies.txt

# 3. Get Dashboard
curl -X GET http://localhost:3000/api/resident-portal/dashboard \
  -b cookies.txt

# 4. Logout
curl -X POST http://localhost:3000/api/resident-auth/logout \
  -b cookies.txt
```

## Automated Test Script

Run the automated test script:

```bash
cd backend
./test-resident-portal.sh
```

Make sure to:
1. Update `MOBILE` variable in the script with a test mobile number
2. Have a resident with that mobile number, portal enabled, and active status
3. Have the feature flag enabled for the tenant

## Common Issues

### 1. "No active residency found with portal access enabled"
- Check resident `status` is `'ACTIVE'`
- Check `portalEnabled` is `true`
- Check resident is not `archived`

### 2. "Resident portal is not enabled for your PG"
- Enable `RESIDENT_PORTAL` feature flag for the tenant
- Check via: `GET /api/feature-flags/tenant`

### 3. "Failed to send OTP"
- Check `SMS_API_KEY` is set in `.env`
- Check SMS provider configuration
- Check rate limiting (max 5 OTP requests per hour per mobile)

### 4. "Invalid or expired OTP"
- OTP expires in 10 minutes
- Request a new OTP if expired
- Check OTP is 6 digits

### 5. "Person not found"
- Person document should be created automatically on first OTP request
- Check mobile number matches exactly (normalized, no spaces/special chars)

## Database Queries for Testing

### Check if Person exists
```javascript
db.persons.findOne({ mobile: "9876543210" })
```

### Check Resident with Portal Enabled
```javascript
db.residents.findOne({
  phone: "9876543210",
  status: "ACTIVE",
  portalEnabled: true
})
```

### Link Resident to Person
```javascript
// Get personId
const person = db.persons.findOne({ mobile: "9876543210" })

// Update resident
db.residents.updateOne(
  { phone: "9876543210" },
  { $set: { personId: person._id, portalEnabled: true } }
)
```

### Enable Feature Flag
```javascript
db.featureflags.updateOne(
  { tenantId: ObjectId("..."), featureKey: "residentPortal" },
  { $set: { enabled: true } },
  { upsert: true }
)
```

## Next Steps

After backend testing is complete:
1. Implement frontend login page
2. Implement portal dashboard and pages
3. Add admin UI for enabling/disabling portal per tenant and resident
