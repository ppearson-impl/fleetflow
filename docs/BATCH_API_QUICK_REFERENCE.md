# Batch API - Quick Reference Card

## Endpoint
```
POST /api/batch
```

## Authentication
Cookie-based JWT: `fleetflow_session=token`
Required role: `ADMIN` or `PLANNER`

---

## Operations Quick Guide

### 1. Update Shipment Statuses
```json
{
  "operation": "updateStatuses",
  "shipmentIds": ["id1", "id2"],
  "newStatus": "DISPATCHED"
}
```
**Max**: 1000 items | **Returns**: `shipmentsUpdated`, `routesAffected`

---

### 2. Assign to Routes
```json
{
  "operation": "assignToRoutes",
  "shipmentIds": ["id1", "id2"],
  "routeId": "route_id"
}
```
**Max**: 1000 items | **Returns**: `shipmentsAssigned`, `targetRoute`

---

### 3. Create Exceptions
```json
{
  "operation": "createExceptions",
  "shipmentIds": ["id1", "id2"],
  "exceptionType": "LATE_DELIVERY",
  "description": "Description text",
  "assignedTo": "user_id"
}
```
**Types**: LATE_DELIVERY, MISSED_TIME_WINDOW, VEHICLE_BREAKDOWN, DRIVER_INCIDENT, CUSTOMER_UNAVAILABLE, DAMAGED_GOODS, OTHER
**Max**: 1000 items | **Returns**: `exceptionsCreated`

---

### 4. Acknowledge Exceptions
```json
{
  "operation": "acknowledgeExceptions",
  "exceptionIds": ["id1", "id2"]
}
```
**Max**: 1000 items | **Returns**: `exceptionsAcknowledged`

---

### 5. Update Stop Status
```json
{
  "operation": "updateStopStatus",
  "stopIds": ["id1", "id2"],
  "status": "DELIVERED",
  "arrivedAt": "2024-03-08T14:30:00Z",
  "failureReason": "Reason text"
}
```
**Statuses**: PENDING, ARRIVED, DELIVERED, FAILED, SKIPPED
**Max**: 1000 items | **Returns**: `stopsUpdated`, `targetStatus`

---

## Status Transitions

### Shipment Statuses
```
PENDING → PLANNED, CANCELLED
PLANNED → DISPATCHED, CANCELLED
DISPATCHED → IN_TRANSIT, FAILED, CANCELLED
IN_TRANSIT → DELIVERED, FAILED
DELIVERED → (none)
FAILED → PENDING, PLANNED
CANCELLED → (none)
```

### Stop Statuses
```
PENDING → ARRIVED, DELIVERED, FAILED, SKIPPED
ARRIVED → DELIVERED, FAILED
DELIVERED → (none)
FAILED → SKIPPED
SKIPPED → (none)
```

---

## Response Format

```json
{
  "operation": "operationName",
  "successCount": 15,
  "failureCount": 2,
  "totalTime": 342,
  "results": [
    { "id": "item1", "success": true },
    { "id": "item2", "success": false, "error": "reason" }
  ],
  "metrics": { "custom": "values" }
}
```

---

## Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| 400 | INVALID_JSON | Malformed JSON |
| 401 | UNAUTHORIZED | Missing token |
| 403 | FORBIDDEN | Insufficient role |
| 422 | VALIDATION_ERROR | Invalid parameters |
| 500 | INTERNAL_ERROR | Server error |

---

## Common Errors

| Error | Fix |
|-------|-----|
| shipmentIds cannot be empty | Provide at least 1 ID |
| Maximum 1000 shipments | Split into smaller batches |
| Invalid transition from X to Y | Check valid transitions |
| Route not found | Verify routeId exists |
| Unauthorized | Add valid session token |
| Forbidden | Use ADMIN or PLANNER role |

---

## Usage Patterns

### Pattern 1: Dispatch Multiple Shipments
```bash
# 1. Assign to route
POST /api/batch
{ "operation": "assignToRoutes", "shipmentIds": [...], "routeId": "r1" }

# 2. Update status
POST /api/batch
{ "operation": "updateStatuses", "shipmentIds": [...], "newStatus": "DISPATCHED" }
```

### Pattern 2: Handle Delivery Issues
```bash
# 1. Create exceptions
POST /api/batch
{ "operation": "createExceptions", "shipmentIds": [...], "exceptionType": "..." }

# 2. Acknowledge them
POST /api/batch
{ "operation": "acknowledgeExceptions", "exceptionIds": [...] }
```

### Pattern 3: Complete Route
```bash
# Update all stops to DELIVERED
POST /api/batch
{ "operation": "updateStopStatus", "stopIds": [...], "status": "DELIVERED" }
```

### Pattern 4: Retry Failed Items
```bash
const result = await batch.updateStatuses(ids, status);
const failed = result.results.filter(r => !r.success).map(r => r.id);
if (failed.length > 0) {
  // Retry with failed IDs only
  await batch.updateStatuses(failed, status);
}
```

### Pattern 5: Process Large Import
```bash
const CHUNK_SIZE = 200;
for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
  const chunk = allIds.slice(i, i + CHUNK_SIZE);
  await batch.assignToRoutes(chunk, routeId);
  await delay(500); // Avoid overload
}
```

---

## TypeScript Client

```typescript
import { BatchAPIClient } from './docs/BATCH_API_EXAMPLES'

const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

// Update statuses
const result = await client.updateStatuses(
  ['ship1', 'ship2'],
  'DISPATCHED',
  { retryAttempts: 3 }
)

// Assign to route
await client.assignToRoutes(['ship3', 'ship4'], 'route1')

// Create exceptions
await client.createExceptions(
  ['ship5'],
  'LATE_DELIVERY',
  'Delayed delivery',
  'manager1'
)

// Update stop status
await client.updateStopStatus(
  ['stop1', 'stop2'],
  'DELIVERED'
)
```

---

## cURL Examples

### Update Statuses
```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{"operation":"updateStatuses","shipmentIds":["s1","s2"],"newStatus":"PLANNED"}'
```

### Assign to Route
```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{"operation":"assignToRoutes","shipmentIds":["s1"],"routeId":"r1"}'
```

### Create Exceptions
```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{"operation":"createExceptions","shipmentIds":["s1"],"exceptionType":"LATE_DELIVERY","description":"Delay"}'
```

### Update Stops
```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -b "fleetflow_session=token" \
  -d '{"operation":"updateStopStatus","stopIds":["st1"],"status":"DELIVERED"}'
```

---

## Performance Tips

1. **Batch Size**: Use 100-500 items per request
2. **Retry Logic**: Implement exponential backoff
3. **Chunking**: Split large imports into chunks
4. **Rate Limiting**: Max 100 ops/min per user recommended
5. **Error Handling**: Always check `results` array for failures

---

## Testing Checklist

- [ ] Authentication (missing token = 401)
- [ ] Authorization (wrong role = 403)
- [ ] Invalid operation (unknown = 422)
- [ ] Empty array (0 items = 422)
- [ ] Too many items (> 1000 = 422)
- [ ] Valid transitions only
- [ ] Tenant isolation
- [ ] Audit events created
- [ ] Metrics returned
- [ ] Error details in results

---

## Documentation Links

- Full API Docs: `BATCH_API.md`
- Code Examples: `BATCH_API_EXAMPLES.ts`
- Test Guide: `BATCH_API_TESTS.md`
- Implementation: `app/api/batch/route.ts`

---

## Version Info
- Version: 1.0.0
- Implementation: Production Ready
- Last Updated: 2024-03-08
