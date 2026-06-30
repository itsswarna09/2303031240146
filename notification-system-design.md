# Notification System Design

## Stage 1: REST API Design

### Overview
The notification platform needs endpoints to fetch, filter, and update notification status for logged-in students. Below are the proposed REST endpoints with their contracts.

### Endpoints

#### 1. Get All Notifications
- **Method:** GET
- **Path:** `/api/notifications`
- **Headers:** `Authorization: Bearer <token>`
- **Query Params:** `page` (int, optional), `limit` (int, optional), `type` (string, optional — Event/Result/Placement)
- **Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "string",
      "timestamp": "2026-04-22T17:51:30Z",
      "isRead": false
    }
  ],
  "page": 1,
  "totalPages": 5
}
```

#### 2. Get Single Notification
- **Method:** GET
- **Path:** `/api/notifications/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** single notification object as above
- **Response (404):** `{ "error": "Notification not found" }`

#### 3. Mark Notification as Read
- **Method:** PATCH
- **Path:** `/api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** `{ "id": "uuid", "isRead": true }`

#### 4. Get Priority/Top Notifications
- **Method:** GET
- **Path:** `/api/notifications/priority`
- **Headers:** `Authorization: Bearer <token>`
- **Query Params:** `n` (int, default 10)
- **Response (200):** array of top N notifications sorted by weight (Placement > Result > Event) then recency

### Design Principles
- Predictable, resource-based naming (`/notifications`, not `/getNotifications`)
- Plural nouns for collections, consistent verb-less paths (HTTP method conveys the action)
- Pagination on list endpoints to avoid large payloads
- All endpoints require Bearer token authentication
- Consistent JSON envelope and field naming (camelCase) across responses