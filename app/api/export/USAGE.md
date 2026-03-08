# FleetFlow Export Endpoint

## Overview

The export endpoint (`/api/export`) provides secure, authenticated data export functionality for FleetFlow. It supports multiple formats (CSV and PDF) and data types (shipments, routes, drivers, customers, or all).

## Authentication

All requests must include a valid authentication session cookie (`fleetflow_session`). Requests without authentication will return a 401 Unauthorized error.

## API Parameters

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `csv` | Export format: `csv` or `pdf` |
| `dataType` | string | `shipments` | Data type: `shipments`, `routes`, `drivers`, `customers`, or `all` |
| `status` | string | optional | Filter by shipment status (e.g., PENDING, DELIVERED, FAILED) |
| `startDate` | string | optional | Start date for filtering (ISO 8601 format: YYYY-MM-DD) |
| `endDate` | string | optional | End date for filtering (ISO 8601 format: YYYY-MM-DD) |

## Usage Examples

### Export Shipments as CSV

```bash
GET /api/export?format=csv&dataType=shipments
```

**Response Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="shipments-2026-03-08.csv"
```

**CSV Columns:** Reference, Customer, Status, Origin, Destination, Planned Date, Driver, Vehicle, Distance

### Export Delivered Shipments

```bash
GET /api/export?format=csv&dataType=shipments&status=DELIVERED
```

### Export Shipments by Date Range

```bash
GET /api/export?format=csv&dataType=shipments&startDate=2026-03-01&endDate=2026-03-08
```

### Export Routes as CSV

```bash
GET /api/export?format=csv&dataType=routes
```

**CSV Columns:** Name, Driver, Vehicle, Status, Planned Start, Distance (km), Est. Duration (min)

### Export Drivers as CSV

```bash
GET /api/export?format=csv&dataType=drivers
```

**CSV Columns:** Name, Phone, Email, Status, Created At

### Export Customers as CSV

```bash
GET /api/export?format=csv&dataType=customers
```

**CSV Columns:** Name, Email, Phone, Address, Created At

### Export All Data as CSV

```bash
GET /api/export?format=csv&dataType=all
```

Returns a single CSV file with multiple sections:
- SHIPMENTS (with all columns)
- ROUTES (with all columns)
- DRIVERS (with all columns)
- CUSTOMERS (with all columns)

### Export Shipments as PDF

```bash
GET /api/export?format=pdf&dataType=shipments
```

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="shipments-2026-03-08.pdf"
```

## Features

### Data Handling

- **Tenant Isolation:** All exports are scoped to the authenticated user's tenant
- **Large Dataset Handling:** Queries are limited to 10,000 records per data type to prevent memory issues
- **CSV Escaping:** Fields containing commas, quotes, or newlines are properly escaped
- **Date Formatting:** Dates are formatted as "08 Mar 2026" for readability
- **NULL Handling:** Missing values are displayed as "N/A" or "Unassigned"

### Security

- Authentication required (401 Unauthorized if missing)
- Tenant isolation enforced at database level
- No sensitive data exposure in error messages
- Cache headers prevent caching of sensitive data

### Error Handling

| Status | Description |
|--------|-------------|
| 200 | Success - file will be downloaded |
| 400 | Bad Request - invalid parameters (e.g., invalid format or dataType) |
| 401 | Unauthorized - missing or invalid session |
| 500 | Internal Server Error - server-side exception |

**Error Response Format:**
```json
{
  "error": "Invalid format. Must be \"csv\" or \"pdf\"",
  "details": "Optional additional context"
}
```

## Implementation Details

### CSV Generation

- Uses Papa Parse compatible format
- Proper field escaping for RFC 4180 compliance
- Headers included as first row
- One row per entity

### PDF Generation

- Lightweight PDF generation without external dependencies
- Text-based format suitable for tabular data
- Timestamp included in header
- Proper PDF structure for compatibility with standard readers

### Performance Considerations

- Database queries include pagination limits (10,000 records max)
- Efficient field selection to minimize database load
- Streaming response for large files
- No in-memory file accumulation for multi-section exports

## Integration Examples

### JavaScript/React

```javascript
// Export shipments as CSV
const response = await fetch('/api/export?format=csv&dataType=shipments')
const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'shipments-export.csv'
a.click()
```

### cURL

```bash
curl -X GET "http://localhost:3000/api/export?format=csv&dataType=shipments" \
  -H "Cookie: fleetflow_session=your_token" \
  -o shipments.csv
```

## Limitations and Future Enhancements

- PDF export currently limited to tabular text format (no charts/graphs)
- Maximum 10,000 records per data type to prevent memory exhaustion
- Status filter only applies to shipment exports
- Date filtering only applies to shipment plannedDate field

Future enhancements could include:
- Advanced PDF formatting with charts and graphics
- Excel (.xlsx) export format
- Scheduled/batch exports
- Email delivery of exports
- Custom field selection
- Advanced filtering options
