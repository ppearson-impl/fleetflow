# Export Endpoint Test Cases

This document provides test cases for validating the export endpoint functionality.

## Prerequisites

1. Authenticated session with valid `fleetflow_session` cookie
2. Test data in the database (shipments, routes, drivers, customers)
3. Access to the development or staging environment

## Test Cases

### TC-1: Shipments CSV Export - Basic

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Results:**
- Status: 200 OK
- Content-Type: text/csv; charset=utf-8
- Headers include: Reference, Customer, Status, Origin, Destination, Planned Date, Driver, Vehicle, Distance
- File downloads with name pattern: `shipments-YYYY-MM-DD.csv`
- No empty lines at start
- All CSV fields properly escaped

**Verification Steps:**
1. Open browser DevTools > Network tab
2. Make request and verify response headers
3. Open downloaded CSV in text editor
4. Check first line contains headers separated by commas
5. Verify data rows match database records

---

### TC-2: Shipments CSV Export - With Status Filter

**Request:**
```
GET /api/export?format=csv&dataType=shipments&status=DELIVERED
```

**Expected Results:**
- Status: 200 OK
- CSV contains only shipments with status = DELIVERED
- Record count matches database query

**Verification Steps:**
1. Count rows in exported CSV
2. Query database: `SELECT COUNT(*) FROM shipments WHERE status='DELIVERED'`
3. Verify counts match (accounting for header row)

---

### TC-3: Shipments CSV Export - Date Range Filter

**Request:**
```
GET /api/export?format=csv&dataType=shipments&startDate=2026-03-01&endDate=2026-03-08
```

**Expected Results:**
- Status: 200 OK
- Only shipments with plannedDate between 2026-03-01 and 2026-03-08
- Dates formatted as "08 Mar 2026"

**Verification Steps:**
1. Check minimum and maximum dates in CSV
2. Verify all dates are within range
3. Confirm date formatting

---

### TC-4: Routes CSV Export

**Request:**
```
GET /api/export?format=csv&dataType=routes
```

**Expected Results:**
- Status: 200 OK
- Headers: Name, Driver, Vehicle, Status, Planned Start, Distance (km), Est. Duration (min)
- All route records included
- Unassigned drivers/vehicles show as "Unassigned"

---

### TC-5: Drivers CSV Export

**Request:**
```
GET /api/export?format=csv&dataType=drivers
```

**Expected Results:**
- Status: 200 OK
- Headers: Name, Phone, Email, Status, Created At
- All active and inactive drivers included
- Missing phone/email show as "N/A"

---

### TC-6: Customers CSV Export

**Request:**
```
GET /api/export?format=csv&dataType=customers
```

**Expected Results:**
- Status: 200 OK
- Headers: Name, Email, Phone, Address, Created At
- All customers for current tenant
- Missing data displays as "N/A"

---

### TC-7: All Data Export - CSV

**Request:**
```
GET /api/export?format=csv&dataType=all
```

**Expected Results:**
- Status: 200 OK
- File contains multiple sections:
  - `# SHIPMENTS` followed by shipment data
  - `# ROUTES` followed by route data
  - `# DRIVERS` followed by driver data
  - `# CUSTOMERS` followed by customer data
- Sections separated by blank lines
- File named: `fleetflow-export-YYYY-MM-DD.csv`

---

### TC-8: Shipments PDF Export

**Request:**
```
GET /api/export?format=pdf&dataType=shipments
```

**Expected Results:**
- Status: 200 OK
- Content-Type: application/pdf
- File downloads with name: `shipments-YYYY-MM-DD.pdf`
- PDF opens in PDF reader without errors
- Header shows "FleetFlow Export Report - Shipments"
- Generated timestamp visible

**Verification Steps:**
1. Download file
2. Open with PDF reader (Adobe Reader, browser PDF viewer)
3. Verify content is readable
4. Check header includes generation timestamp

---

### TC-9: Routes PDF Export

**Request:**
```
GET /api/export?format=pdf&dataType=routes
```

**Expected Results:**
- Status: 200 OK
- PDF contains route data in table format
- Headers properly displayed

---

### TC-10: Drivers PDF Export

**Request:**
```
GET /api/export?format=pdf&dataType=drivers
```

**Expected Results:**
- Status: 200 OK
- PDF contains driver information

---

### TC-11: Customers PDF Export

**Request:**
```
GET /api/export?format=pdf&dataType=customers
```

**Expected Results:**
- Status: 200 OK
- PDF contains customer information

---

### TC-12: All Data PDF Export

**Request:**
```
GET /api/export?format=pdf&dataType=all
```

**Expected Results:**
- Status: 200 OK
- Content-Type: application/pdf
- File named: `fleetflow-export-YYYY-MM-DD.pdf`
- PDF header shows "FleetFlow Complete Export"

---

### TC-13: Invalid Format Parameter

**Request:**
```
GET /api/export?format=json&dataType=shipments
```

**Expected Results:**
- Status: 400 Bad Request
- Response body: `{ "error": "Invalid format. Must be \"csv\" or \"pdf\"" }`

---

### TC-14: Invalid DataType Parameter

**Request:**
```
GET /api/export?format=csv&dataType=invalid
```

**Expected Results:**
- Status: 400 Bad Request
- Response body: `{ "error": "Invalid dataType. Must be \"shipments\", \"routes\", \"drivers\", \"customers\", or \"all\"" }`

---

### TC-15: Invalid Start Date

**Request:**
```
GET /api/export?format=csv&dataType=shipments&startDate=not-a-date
```

**Expected Results:**
- Status: 400 Bad Request
- Response body: `{ "error": "Invalid startDate format" }`

---

### TC-16: Invalid End Date

**Request:**
```
GET /api/export?format=csv&dataType=shipments&endDate=2026-13-45
```

**Expected Results:**
- Status: 400 Bad Request
- Response body: `{ "error": "Invalid endDate format" }`

---

### TC-17: Missing Authentication

**Request:**
```
GET /api/export?format=csv&dataType=shipments
(without fleetflow_session cookie)
```

**Expected Results:**
- Status: 401 Unauthorized
- Response body: `{ "error": "Unauthorized" }`

**Verification Steps:**
1. Clear all cookies or use incognito mode
2. Make request without logging in
3. Verify 401 response

---

### TC-18: Invalid/Expired Session

**Request:**
```
GET /api/export?format=csv&dataType=shipments
(with tampered fleetflow_session cookie)
```

**Expected Results:**
- Status: 401 Unauthorized
- Response body: `{ "error": "Unauthorized" }`

---

### TC-19: Tenant Isolation

**Test Scenario:**
1. User A (Tenant X) exports shipments
2. User B (Tenant Y) exports shipments
3. Verify User A's export doesn't contain User B's data and vice versa

**Expected Results:**
- Each user only sees their own tenant's data
- Record counts are different for each tenant
- No cross-tenant data leakage

---

### TC-20: CSV Field Escaping

**Setup:** Create test shipment with:
- Origin: "City, Country"
- Destination: 'City "New" Town'
- Driver: "Name with \n newline"

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Results:**
- Fields with commas are quoted: "City, Country"
- Fields with quotes have escaped quotes: "City ""New"" Town"
- Fields with newlines are quoted and newlines preserved
- CSV is still properly parseable

**Verification Steps:**
1. Export CSV
2. Open in CSV parser or spreadsheet
3. Verify fields are correctly parsed despite special characters
4. Run through CSV validator: https://csvlint.io/

---

### TC-21: Large Dataset Performance

**Setup:** Database contains 10,000+ shipments

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Results:**
- Status: 200 OK
- Response completes within reasonable time (< 30 seconds)
- File size is reasonable (< 50 MB for 10,000 records)
- No server timeout or 500 errors
- Memory usage remains stable

**Verification Steps:**
1. Monitor server memory during export
2. Check response time in DevTools
3. Verify server doesn't crash
4. Check application logs for errors

---

### TC-22: Default Parameters

**Request:**
```
GET /api/export
```

**Expected Results:**
- Status: 200 OK
- Uses defaults: format=csv, dataType=shipments
- Returns CSV export of all shipments

---

### TC-23: CSV Contains All Expected Records

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Results:**
- Count of CSV rows (minus header) = count in database

**Verification Steps:**
1. Export CSV
2. Run database query: `SELECT COUNT(*) FROM shipments WHERE order.tenantId = [user's tenant]`
3. Count CSV data rows
4. Verify counts match (accounting for header)

---

### TC-24: Filename Includes Current Date

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Results:**
- Downloaded filename: `shipments-YYYY-MM-DD.csv`
- Date matches current date at time of request

**Verification Steps:**
1. Check Content-Disposition header
2. Verify filename pattern
3. Confirm date is today's date

---

### TC-25: Response Headers Are Correct

**Request:**
```
GET /api/export?format=csv&dataType=shipments
```

**Expected Response Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="shipments-2026-03-08.csv"
Cache-Control: no-cache, no-store, must-revalidate
```

**Verification Steps:**
1. Open DevTools > Network tab
2. Check response headers match expected
3. Verify file will be downloaded (attachment), not opened in browser

---

## Performance Benchmarks

Expected response times (with typical database):

| Export Type | Data Count | CSV Time | PDF Time |
|-------------|-----------|----------|----------|
| Shipments (100) | 100 | < 100ms | < 200ms |
| Shipments (1,000) | 1,000 | < 500ms | < 1000ms |
| Shipments (10,000) | 10,000 | < 2000ms | < 3000ms |
| All Data (All) | ~20,000 | < 5000ms | < 6000ms |

---

## Regression Testing

After any code changes, run these critical tests:

1. TC-1: Shipments CSV Export - Basic
2. TC-17: Missing Authentication
3. TC-19: Tenant Isolation
4. TC-20: CSV Field Escaping
5. TC-21: Large Dataset Performance

---

## Browser Compatibility

Test in the following browsers:

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Verify:
- File downloads correctly
- Correct filename is used
- No console errors
- CSV opens in Excel/Sheets
- PDF opens in PDF reader

---

## Security Testing

1. **SQL Injection:** Test with parameters: `dataType=shipments'; DROP TABLE shipments; --`
   - Expected: 400 Bad Request (invalid dataType)

2. **XSS in Parameters:** Test with: `status=<script>alert('xss')</script>`
   - Expected: No execution, treated as literal string or error

3. **Path Traversal:** Test with unusual paths
   - Expected: 404 Not Found (wrong route)

4. **CORS:** Test from different origin
   - Expected: Appropriate CORS handling or 401/403

---

## Accessibility Testing

1. Can the CSV be opened by screen readers?
2. Are headers properly identified?
3. Is the data structure logical when read aloud?
