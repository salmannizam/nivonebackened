#!/bin/bash

# Resident Portal API Test Script
# Make sure your backend server is running on http://localhost:3000
# Update BASE_URL if your server runs on a different port

BASE_URL="http://localhost:3000/api"
MOBILE="9876543210"  # Update with a test mobile number
OTP=""  # Will be filled after requesting OTP

echo "=========================================="
echo "Resident Portal API Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Request OTP
echo -e "${YELLOW}Test 1: Request OTP${NC}"
echo "POST ${BASE_URL}/resident-auth/request-otp"
RESPONSE=$(curl -s -X POST "${BASE_URL}/resident-auth/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\": \"${MOBILE}\"}")
echo "Response: $RESPONSE"
echo ""

# Check if OTP was sent successfully
if echo "$RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ OTP request successful${NC}"
else
  echo -e "${RED}✗ OTP request failed${NC}"
  echo "Note: Make sure:"
  echo "  1. A resident exists with this mobile number"
  echo "  2. Resident has portalEnabled=true"
  echo "  3. Resident status is ACTIVE"
  echo "  4. Feature flag RESIDENT_PORTAL is enabled for the tenant"
  echo "  5. SMS API is configured (SMS_API_KEY in .env)"
  exit 1
fi

# Test 2: Verify OTP (manual step - user needs to enter OTP)
echo -e "${YELLOW}Test 2: Verify OTP${NC}"
echo "Please enter the OTP you received:"
read -r OTP
echo "POST ${BASE_URL}/resident-auth/verify-otp"
RESPONSE=$(curl -s -X POST "${BASE_URL}/resident-auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\": \"${MOBILE}\", \"otp\": \"${OTP}\"}" \
  -c cookies.txt)
echo "Response: $RESPONSE"
echo ""

# Check if login was successful
if echo "$RESPONSE" | grep -q "resident\|accessToken"; then
  echo -e "${GREEN}✓ OTP verification successful${NC}"
  
  # Extract access token if in response
  ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$ACCESS_TOKEN" ]; then
    # Token might be in cookie
    echo "Token should be in cookies.txt"
  fi
else
  echo -e "${RED}✗ OTP verification failed${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

# Test 3: Get Dashboard (requires authentication)
echo -e "${YELLOW}Test 3: Get Dashboard${NC}"
echo "GET ${BASE_URL}/resident-portal/dashboard"
RESPONSE=$(curl -s -X GET "${BASE_URL}/resident-portal/dashboard" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "resident\|summary"; then
  echo -e "${GREEN}✓ Dashboard API working${NC}"
else
  echo -e "${RED}✗ Dashboard API failed${NC}"
  echo "Response: $RESPONSE"
fi

# Test 4: Get My Stay
echo -e "${YELLOW}Test 4: Get My Stay${NC}"
echo "GET ${BASE_URL}/resident-portal/my-stay"
RESPONSE=$(curl -s -X GET "${BASE_URL}/resident-portal/my-stay" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Test 5: Get Payments
echo -e "${YELLOW}Test 5: Get Payments${NC}"
echo "GET ${BASE_URL}/resident-portal/payments"
RESPONSE=$(curl -s -X GET "${BASE_URL}/resident-portal/payments" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Test 6: Get Complaints
echo -e "${YELLOW}Test 6: Get Complaints${NC}"
echo "GET ${BASE_URL}/resident-portal/complaints"
RESPONSE=$(curl -s -X GET "${BASE_URL}/resident-portal/complaints" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Test 7: Get Notices
echo -e "${YELLOW}Test 7: Get Notices${NC}"
echo "GET ${BASE_URL}/resident-portal/notices"
RESPONSE=$(curl -s -X GET "${BASE_URL}/resident-portal/notices" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Test 8: Get Current Resident
echo -e "${YELLOW}Test 8: Get Current Resident${NC}"
echo "POST ${BASE_URL}/resident-auth/me"
RESPONSE=$(curl -s -X POST "${BASE_URL}/resident-auth/me" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Test 9: Logout
echo -e "${YELLOW}Test 9: Logout${NC}"
echo "POST ${BASE_URL}/resident-auth/logout"
RESPONSE=$(curl -s -X POST "${BASE_URL}/resident-auth/logout" \
  -b cookies.txt \
  -H "Content-Type: application/json")
echo "Response: $RESPONSE"
echo ""

# Cleanup
rm -f cookies.txt

echo -e "${GREEN}=========================================="
echo "Testing Complete!"
echo "==========================================${NC}"
