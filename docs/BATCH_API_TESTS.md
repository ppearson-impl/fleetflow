# Batch API Testing Guide

## Testing the Batch Operations Endpoint

This guide provides curl commands and test scenarios for validating the batch operations API.

## Prerequisites

1. Running FleetFlow application on `http://localhost:3000`
2. Valid authentication token (replace `YOUR_TOKEN` in examples)
3. Test data (shipments, routes, stops, exceptions)

## Get Authentication Token

First, obtain a valid session token:

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123",
    "tenantSlug": "your-tenant"
  }' \
  -c cookies.txt

# Extract token from response and use in subsequent requests
export TOKEN="your_token_here"
```

Or use cookies from the response:

```bash
curl -b cookies.txt -c cookies.txt http://localhost:3000/api/batch ...
```

## Test 1: Update Shipment Statuses

### Test Case 1.1: Valid Status Transition

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship_test_1", "ship_test_2"],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount` > 0
- `metrics.shipmentsUpdated` matches success count

### Test Case 1.2: Invalid Status Transition

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship_test_1"],
    "newStatus": "INVALID_STATUS"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- Error message about invalid status
- No items updated

### Test Case 1.3: Empty Array

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": [],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "shipmentIds cannot be empty"

### Test Case 1.4: Too Many Items

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ['"$(printf '%s,' $(seq 1 1001) | sed 's/,$//')"'],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "Maximum 1000 shipments per batch operation"

## Test 2: Assign Shipments to Routes

### Test Case 2.1: Valid Assignment

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "assignToRoutes",
    "shipmentIds": ["ship_test_3", "ship_test_4"],
    "routeId": "route_test_1"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount` > 0
- `metrics.targetRoute` equals provided routeId
- `metrics.shipmentsAssigned` > 0

### Test Case 2.2: Invalid Route

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "assignToRoutes",
    "shipmentIds": ["ship_test_5"],
    "routeId": "nonexistent_route"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- Error message about route not found

### Test Case 2.3: Missing Route ID

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "assignToRoutes",
    "shipmentIds": ["ship_test_6"]
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "routeId field is required"

## Test 3: Create Exceptions

### Test Case 3.1: Valid Exception Creation

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship_test_7"],
    "exceptionType": "LATE_DELIVERY",
    "description": "Delay due to traffic congestion",
    "assignedTo": "user_test_1"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount` > 0
- `metrics.exceptionType`: "LATE_DELIVERY"
- `metrics.exceptionsCreated` > 0

### Test Case 3.2: Invalid Exception Type

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship_test_8"],
    "exceptionType": "INVALID_TYPE",
    "description": "Test exception"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- Error message listing valid types

### Test Case 3.3: Missing Description

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship_test_9"],
    "exceptionType": "LATE_DELIVERY"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "description field is required"

### Test Case 3.4: Duplicate Open Exception

Create an exception, then try to create another for same shipment:

```bash
# First creation
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship_test_10"],
    "exceptionType": "LATE_DELIVERY",
    "description": "First exception"
  }' | jq .

# Second creation (should fail)
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship_test_10"],
    "exceptionType": "VEHICLE_BREAKDOWN",
    "description": "Second exception"
  }' | jq .
```

**Expected Response**: 200 OK (with individual failure)
- `successCount`: 0
- `results[0].success`: false
- `results[0].error`: "An open exception already exists"

## Test 4: Acknowledge Exceptions

### Test Case 4.1: Valid Acknowledgement

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "acknowledgeExceptions",
    "exceptionIds": ["exc_test_1", "exc_test_2"]
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount` > 0
- `metrics.exceptionsAcknowledged` > 0

### Test Case 4.2: Nonexistent Exception

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "acknowledgeExceptions",
    "exceptionIds": ["nonexistent_exc"]
  }' | jq .
```

**Expected Response**: 200 OK (no failures, just no matches)
- `successCount`: 0

## Test 5: Update Stop Status

### Test Case 5.1: Update to DELIVERED

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop_test_1", "stop_test_2"],
    "status": "DELIVERED"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount` > 0
- `metrics.stopsUpdated` > 0
- `metrics.targetStatus`: "DELIVERED"

### Test Case 5.2: Update to ARRIVED with Timestamp

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop_test_3"],
    "status": "ARRIVED",
    "arrivedAt": "2024-03-08T14:30:00Z"
  }' | jq .
```

**Expected Response**: 200 OK
- Stop record should have `arrivedAt` timestamp set

### Test Case 5.3: Update to FAILED with Reason

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop_test_4"],
    "status": "FAILED",
    "failureReason": "Customer not available for delivery"
  }' | jq .
```

**Expected Response**: 200 OK
- Stop should have `failureReason` set
- `completedAt` should be set to current time

### Test Case 5.4: Invalid Status

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop_test_5"],
    "status": "INVALID"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- Error message listing valid statuses

## Test 6: Authentication & Authorization

### Test Case 6.1: Missing Authentication

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship1"],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 401 Unauthorized
- `error`: "Unauthorized"
- `code`: "UNAUTHORIZED"

### Test Case 6.2: Insufficient Permissions (Driver Role)

First, get a token for a user with DRIVER role:

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=DRIVER_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship1"],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 403 Forbidden
- `error`: "Forbidden - batch operations require ADMIN or PLANNER role"
- `code`: "FORBIDDEN"

## Test 7: Invalid Request Format

### Test Case 7.1: Missing Operation Field

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "shipmentIds": ["ship1"],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "operation field is required"

### Test Case 7.2: Invalid JSON

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d 'not valid json' | jq .
```

**Expected Response**: 400 Bad Request
- `error`: "Invalid JSON in request body"
- `code`: "INVALID_JSON"

### Test Case 7.3: Unknown Operation

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "unknownOperation",
    "data": {}
  }' | jq .
```

**Expected Response**: 422 Unprocessable Entity
- `error`: "Invalid operation..."

## Test 8: Partial Failure Handling

### Test Case 8.1: Mixed Success and Failure

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship_valid_1", "ship_invalid_status"],
    "newStatus": "DISPATCHED"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount`: 1
- `failureCount`: 1
- `results` contains both successful and failed entries
- Overall request succeeds even with partial failures

## Test 9: Performance Testing

### Test Case 9.1: Measure Performance with 500 Items

```bash
# Generate array of 500 shipment IDs
SHIPMENT_IDS=$(python3 -c "print('[' + ','.join([f'\"ship_{i}\"' for i in range(500)]) + ']')")

time curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=YOUR_TOKEN" \
  -d "{
    \"operation\": \"updateStatuses\",
    \"shipmentIds\": $SHIPMENT_IDS,
    \"newStatus\": \"PLANNED\"
  }" | jq '.totalTime'
```

**Expectation**: Should complete in < 5000ms
- Check `totalTime` in response
- Verify `successCount + failureCount` = 500

## Test 10: Tenant Isolation

### Test Case 10.1: Cross-Tenant Access Prevention

Get tokens for two different tenants, try to access resources from different tenant:

```bash
# Get shipment ID from tenant A
TENANT_A_SHIPMENT="ship_tenant_a"

# Try to update using tenant B's token
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=TENANT_B_TOKEN" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["'"$TENANT_A_SHIPMENT"'"],
    "newStatus": "PLANNED"
  }' | jq .
```

**Expected Response**: 200 OK
- `successCount`: 0
- `failureCount`: 1
- Shipment from tenant A should not be found/updated by tenant B

## Automated Test Script

```bash
#!/bin/bash

# Run all tests and generate report

ENDPOINT="http://localhost:3000/api/batch"
TOKEN="YOUR_TOKEN"

test_count=0
pass_count=0
fail_count=0

run_test() {
  local name=$1
  local expected_status=$2
  local data=$3

  echo "Running: $name"
  response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -b "fleetflow_session=$TOKEN" \
    -d "$data")

  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -1)

  test_count=$((test_count + 1))

  if [ "$status" = "$expected_status" ]; then
    echo "✓ PASS (Status: $status)"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL (Expected: $expected_status, Got: $status)"
    echo "Response: $body"
    fail_count=$((fail_count + 1))
  fi
  echo ""
}

# Run tests
run_test "Valid update statuses" 200 '{"operation":"updateStatuses","shipmentIds":["ship1"],"newStatus":"PLANNED"}'
run_test "Missing operation" 422 '{"shipmentIds":["ship1"]}'
run_test "Empty array" 422 '{"operation":"updateStatuses","shipmentIds":[],"newStatus":"PLANNED"}'
run_test "Unauthorized" 401 '{"operation":"updateStatuses","shipmentIds":["ship1"],"newStatus":"PLANNED"}'

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total: $test_count"
echo "Passed: $pass_count"
echo "Failed: $fail_count"
echo "Success Rate: $((pass_count * 100 / test_count))%"
```

## Monitoring & Debugging

### Check API Logs

```bash
# View recent API errors
docker logs fleetflow-api | grep batch | tail -20
```

### Enable Debug Logging

Set environment variable:

```bash
NODE_ENV=development
```

This will include error details in 500 responses.

### Monitor Database Queries

Use database query logs to verify:
- Number of queries executed
- Query execution time
- Transactions created

### Performance Profiling

Use Chrome DevTools Network tab to monitor:
- Request time
- Response payload size
- Network latency

## Test Data Setup

```sql
-- Insert test shipments
INSERT INTO shipments (id, order_id, origin, destination, status, created_at, updated_at)
SELECT
  'ship_test_' || generate_series(1, 100),
  (SELECT id FROM orders LIMIT 1),
  'Warehouse A',
  'Customer ' || generate_series(1, 100),
  'PENDING',
  NOW(),
  NOW();

-- Insert test routes
INSERT INTO routes (id, tenant_id, name, status, created_at, updated_at)
SELECT
  'route_test_' || generate_series(1, 10),
  (SELECT id FROM tenants LIMIT 1),
  'Route ' || generate_series(1, 10),
  'DRAFT',
  NOW(),
  NOW();

-- Insert test stops
INSERT INTO stops (id, route_id, shipment_id, sequence, location, status, created_at, updated_at)
SELECT
  'stop_test_' || ROW_NUMBER() OVER (),
  'route_test_1',
  'ship_test_' || generate_series(1, 50),
  generate_series(1, 50),
  'Destination ' || generate_series(1, 50),
  'PENDING',
  NOW(),
  NOW();
```

---

End of Testing Guide
