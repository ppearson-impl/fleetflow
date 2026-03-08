# Batch Operations API Documentation

## Overview

The Batch Operations API (`/api/batch`) provides efficient bulk operations for data management in FleetFlow. It supports multiple operation types with full transaction support, validation, and comprehensive error handling.

## Authentication & Authorization

- **Method**: Cookie-based JWT token (`fleetflow_session`)
- **Required Role**: `ADMIN` or `PLANNER`
- **Returns**:
  - 401 Unauthorized if not authenticated
  - 403 Forbidden if role is insufficient

## Request Structure

All batch operations use the same endpoint with a POST request:

```json
{
  "operation": "operationName",
  ...operationSpecificFields
}
```

### Response Structure

```json
{
  "operation": "operationName",
  "successCount": 15,
  "failureCount": 2,
  "totalTime": 342,
  "results": [
    {
      "id": "ship1",
      "success": true
    },
    {
      "id": "ship2",
      "success": false,
      "error": "Invalid status transition from PENDING to DELIVERED"
    }
  ],
  "metrics": {
    "shipmentsUpdated": 15,
    "routesAffected": 3,
    "failedOperations": 2
  }
}
```

## Operation Types

### 1. Update Shipment Statuses

**Operation**: `updateStatuses`

Updates multiple shipments to a new status with automatic state transition validation.

#### Request

```json
{
  "operation": "updateStatuses",
  "shipmentIds": ["ship1", "ship2", "ship3"],
  "newStatus": "DISPATCHED"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipmentIds` | string[] | Yes | Array of shipment IDs (max 1000) |
| `newStatus` | string | Yes | Target status (PENDING, PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED, FAILED, CANCELLED) |

#### Valid Status Transitions

```
PENDING → PLANNED, CANCELLED
PLANNED → DISPATCHED, CANCELLED
DISPATCHED → IN_TRANSIT, FAILED, CANCELLED
IN_TRANSIT → DELIVERED, FAILED
DELIVERED → (no transitions)
FAILED → PENDING, PLANNED
CANCELLED → (no transitions)
```

#### Response Metrics

```json
{
  "shipmentsUpdated": 15,
  "routesAffected": 3,
  "failedOperations": 2
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=your_token" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship1", "ship2", "ship3"],
    "newStatus": "DISPATCHED"
  }'
```

---

### 2. Assign Shipments to Routes

**Operation**: `assignToRoutes`

Assigns multiple shipments to a specific route and creates corresponding stops.

#### Request

```json
{
  "operation": "assignToRoutes",
  "shipmentIds": ["ship1", "ship2", "ship3"],
  "routeId": "route123"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipmentIds` | string[] | Yes | Array of shipment IDs (max 1000) |
| `routeId` | string | Yes | Target route ID |

#### Constraints

- Shipments must be in `PENDING` or `PLANNED` status
- Route must exist and belong to the same tenant
- Automatically creates stops for each shipment
- Sets shipment status to `PLANNED`

#### Response Metrics

```json
{
  "shipmentsAssigned": 15,
  "targetRoute": "route123",
  "failedOperations": 2
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=your_token" \
  -d '{
    "operation": "assignToRoutes",
    "shipmentIds": ["ship1", "ship2"],
    "routeId": "route123"
  }'
```

---

### 3. Create Exceptions

**Operation**: `createExceptions`

Creates exceptions for multiple shipments in bulk.

#### Request

```json
{
  "operation": "createExceptions",
  "shipmentIds": ["ship1", "ship2"],
  "exceptionType": "LATE_DELIVERY",
  "description": "Delay due to traffic congestion",
  "assignedTo": "user123"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipmentIds` | string[] | Yes | Array of shipment IDs (max 1000) |
| `exceptionType` | string | Yes | Exception type (see valid types below) |
| `description` | string | Yes | Exception description |
| `assignedTo` | string | No | User ID to assign exception to |

#### Valid Exception Types

- `LATE_DELIVERY` - Shipment is late for delivery
- `MISSED_TIME_WINDOW` - Missed customer time window
- `VEHICLE_BREAKDOWN` - Vehicle technical issue
- `DRIVER_INCIDENT` - Driver-related incident
- `CUSTOMER_UNAVAILABLE` - Customer not available
- `DAMAGED_GOODS` - Goods damaged in transit
- `OTHER` - Other exception type

#### Constraints

- Only one open exception per shipment allowed
- Existing open exceptions prevent creation of duplicates
- Status automatically set to `OPEN`

#### Response Metrics

```json
{
  "exceptionsCreated": 15,
  "exceptionType": "LATE_DELIVERY",
  "failedOperations": 2
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=your_token" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship1", "ship2"],
    "exceptionType": "LATE_DELIVERY",
    "description": "Delay due to traffic",
    "assignedTo": "user123"
  }'
```

---

### 4. Acknowledge Exceptions

**Operation**: `acknowledgeExceptions`

Batch acknowledge and assign exceptions to users.

#### Request

```json
{
  "operation": "acknowledgeExceptions",
  "exceptionIds": ["exc1", "exc2", "exc3"]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `exceptionIds` | string[] | Yes | Array of exception IDs (max 1000) |

#### Constraints

- Transitions exception status from `OPEN` to `IN_PROGRESS`
- Automatically assigns to current user
- Cannot acknowledge closed exceptions
- Used by operations managers to take ownership of issues

#### Response Metrics

```json
{
  "exceptionsAcknowledged": 15,
  "failedOperations": 2
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=your_token" \
  -d '{
    "operation": "acknowledgeExceptions",
    "exceptionIds": ["exc1", "exc2", "exc3"]
  }'
```

---

### 5. Update Stop Status

**Operation**: `updateStopStatus`

Updates multiple stops with a status and optional metadata.

#### Request

```json
{
  "operation": "updateStopStatus",
  "stopIds": ["stop1", "stop2", "stop3"],
  "status": "DELIVERED",
  "arrivedAt": "2024-03-08T14:30:00Z",
  "failureReason": "Customer not available"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stopIds` | string[] | Yes | Array of stop IDs (max 1000) |
| `status` | string | Yes | Target status (PENDING, ARRIVED, DELIVERED, FAILED, SKIPPED) |
| `arrivedAt` | ISO string | No | Arrival timestamp (used with ARRIVED) |
| `failureReason` | string | No | Reason for failure (used with FAILED) |

#### Valid Stop Statuses

- `PENDING` - Awaiting arrival
- `ARRIVED` - Arrived at location
- `DELIVERED` - Successfully delivered
- `FAILED` - Delivery failed
- `SKIPPED` - Stop skipped

#### Auto-set Fields

- `ARRIVED`: Sets `arrivedAt` to provided value or current time
- `DELIVERED` or `FAILED`: Sets `completedAt` to current time

#### Response Metrics

```json
{
  "stopsUpdated": 15,
  "targetStatus": "DELIVERED",
  "failedOperations": 2
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=your_token" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop1", "stop2"],
    "status": "DELIVERED"
  }'
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success (check results for individual failures) | Operation processed |
| 400 | Bad request (malformed JSON) | Invalid JSON syntax |
| 401 | Unauthorized | Missing or invalid session token |
| 403 | Forbidden | Insufficient permissions |
| 422 | Unprocessable entity (validation error) | Invalid parameters |
| 500 | Internal server error | Database error |

### Error Response

```json
{
  "error": "Maximum 1000 shipments per batch operation",
  "code": "VALIDATION_ERROR",
  "details": "..."
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | No valid session token |
| `FORBIDDEN` | Insufficient role permissions |
| `INVALID_JSON` | JSON parsing failed |
| `INVALID_REQUEST` | Missing or invalid required fields |
| `VALIDATION_ERROR` | Input validation failed |
| `UNKNOWN_OPERATION` | Unknown operation type |
| `INTERNAL_ERROR` | Server error during processing |

---

## Validation Rules

### Batch Limits

- Maximum 1000 items per operation
- Minimum 1 item per operation
- Request body must be valid JSON

### Field Validation

- All IDs must be non-empty strings
- Array fields must be arrays
- Required fields cannot be null or undefined
- Status values must be from defined enums

### Tenant Isolation

- All resources validated against user's tenant
- Cross-tenant access is prevented
- Shipments must belong to order in user's tenant

---

## Audit Trail

All operations create audit events:

- **Event Type**: `STATUS_CHANGED`, `ASSIGNED_TO_ROUTE`, `STOP_STATUS_CHANGED`
- **Actor**: Current user name
- **Metadata**: Operation-specific details
- **Timestamp**: Automatic

### Example Event

```json
{
  "shipmentId": "ship1",
  "eventType": "STATUS_CHANGED",
  "description": "Status changed from PENDING to DISPATCHED",
  "actor": "john.doe@company.com",
  "metadata": {
    "from": "PENDING",
    "to": "DISPATCHED"
  }
}
```

---

## Performance Considerations

### Execution Time

- Operations are NOT atomic across all items
- Individual failures don't rollback successful operations
- Large batches (900+ items) may take 2-5 seconds
- Network latency adds to total time

### Database Efficiency

- Bulk fetches minimize query count
- Each operation creates individual events (intended for audit)
- Consider batch size based on network conditions

### Rate Limiting

- Recommended: Max 100 operations per minute per user
- Consider spreading large imports across multiple requests

---

## Examples

### Example 1: Dispatch multiple shipments to a route

```bash
# Step 1: Create route
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{"name": "Morning Route", "driverId": "driver1", "vehicleId": "vehicle1"}'
# Response: {"id": "route123", ...}

# Step 2: Assign shipments to route
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{
    "operation": "assignToRoutes",
    "shipmentIds": ["ship1", "ship2", "ship3"],
    "routeId": "route123"
  }'

# Step 3: Update route status
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{
    "operation": "updateStatuses",
    "shipmentIds": ["ship1", "ship2", "ship3"],
    "newStatus": "DISPATCHED"
  }'
```

### Example 2: Handle delivery exceptions

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{
    "operation": "createExceptions",
    "shipmentIds": ["ship5", "ship6"],
    "exceptionType": "CUSTOMER_UNAVAILABLE",
    "description": "Customer not available for delivery",
    "assignedTo": "manager1"
  }'
```

### Example 3: Complete deliveries

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{
    "operation": "updateStopStatus",
    "stopIds": ["stop1", "stop2", "stop3"],
    "status": "DELIVERED"
  }'
```

---

## TypeScript Types

```typescript
interface BatchOperation {
  operation: string
  [key: string]: unknown
}

interface OperationResult {
  id: string
  success: boolean
  error?: string
}

interface BatchResponse {
  operation: string
  successCount: number
  failureCount: number
  totalTime: number
  results: OperationResult[]
  metrics?: Record<string, unknown>
}

interface ErrorResponse {
  error: string
  code: string
  details?: unknown
}
```

---

## Best Practices

1. **Check Individual Results**: Always check the `results` array for individual failures
2. **Retry Failed Items**: Collect failed IDs and retry in a subsequent request
3. **Monitor Metrics**: Use metrics to understand impact (routes affected, items updated, etc.)
4. **Batch Sizing**: Use 100-500 items per request for optimal performance
5. **Error Handling**: Implement exponential backoff for failed batches
6. **Audit**: Review shipment events to verify all operations completed correctly
7. **Validation**: Validate data before batching to reduce failures

---

## Limitations & Future Improvements

- No transaction support across all items (atomic per item only)
- No scheduled batch operations yet
- No batch reversal/undo functionality
- Maximum batch size of 1000 items

---

## Support

For issues or questions about the Batch API:

1. Check the error response for specific validation failures
2. Review individual item errors in the results array
3. Verify tenant isolation and permissions
4. Check audit events for detailed operation history
