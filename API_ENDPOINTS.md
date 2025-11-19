# Backend API Endpoints Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

All endpoints except `/auth/*` require JWT authentication.
Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔓 Public Endpoints (No Authentication Required)

### Authentication

#### POST `/auth/login`
Login user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid credentials

---

#### POST `/auth/register`
Register a new user.

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "businessName": "Business Name" // Optional
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "businessName": "Business Name",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201` - User created successfully
- `409` - User with this email already exists
- `400` - Validation error

---

---

## 🔒 Protected Endpoints (JWT Authentication Required)

### Account

#### GET `/auth/me`
Get the authenticated user's profile.

**Response:**
```json
{
  "_id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "user",
  "businessInfo": {
    "businessName": "Business Name",
    "address": "Street 123",
    "phone": "+62 812 3456 7890",
    "taxId": "NPWP123"
  },
  "subscription": {
    "plan": "free",
    "status": "inactive"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-10T00:00:00.000Z"
}
```

---

#### PUT `/auth/profile`
Update the authenticated user's profile details.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "businessName": "Updated Business",
  "address": "Jl. Sudirman No. 1",
  "phone": "+62 811 2345 678",
  "taxId": "NPWP-987"
}
```

**Response:**
Same as `GET /auth/me` with updated data.

---

### Products

#### GET `/products`
Get all products for the authenticated user.

**Query Parameters:**
- `category` (optional) - Filter by category
- `search` (optional) - Search in name and description
- `status` (optional) - Filter by status (in_stock, low_stock, out_of_stock)

**Example:**
```
GET /products?category=food&search=pizza&status=in_stock
```

**Response:**
```json
[
  {
    "_id": "product_id",
    "name": "Product Name",
    "description": "Product Description",
    "price": 29.99,
    "category": "food",
    "inventory": 100,
    "sku": "SKU123",
    "imageUrl": "https://example.com/image.jpg",
    "status": "in_stock",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/products/stats`
Get product statistics for the authenticated user.

**Response:**
```json
{
  "total": 150,
  "inStock": 120,
  "lowStock": 20,
  "outOfStock": 10
}
```

---

#### GET `/products/:id`
Get a single product by ID.

**Response:**
```json
{
  "_id": "product_id",
  "name": "Product Name",
  "description": "Product Description",
  "price": 29.99,
  "category": "food",
  "inventory": 100,
  "sku": "SKU123",
  "imageUrl": "https://example.com/image.jpg",
  "status": "in_stock",
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Product not found

---

#### POST `/products`
Create a new product.

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Product Description",
  "price": 29.99,
  "category": "food",
  "inventory": 100,
  "sku": "SKU123",
  "imageUrl": "https://example.com/image.jpg",
  "detailedImages": [
    { "url": "https://example.com/image1.jpg" },
    { "url": "https://example.com/image2.jpg" }
  ]
}
```

**Response:**
```json
{
  "_id": "product_id",
  "name": "Product Name",
  "description": "Product Description",
  "price": 29.99,
  "category": "food",
  "inventory": 100,
  "sku": "SKU123",
  "imageUrl": "https://example.com/image.jpg",
  "status": "in_stock",
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201` - Product created successfully
- `400` - Validation error

---

#### PUT `/products/:id`
Update an existing product.

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Product Name",
  "price": 39.99,
  "inventory": 150
}
```

**Response:**
```json
{
  "_id": "product_id",
  "name": "Updated Product Name",
  "price": 39.99,
  "inventory": 150,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Product not found
- `400` - Validation error

---

#### DELETE `/products/:id`
Delete a product.

**Response:**
```json
{
  "_id": "product_id",
  "name": "Product Name",
  "deleted": true
}
```

**Status Codes:**
- `200` - Success
- `404` - Product not found

---

### Orders

#### GET `/orders`
Get all orders for the authenticated user.

**Query Parameters:**
- `startDate` (optional) - Filter orders from this date (ISO format: YYYY-MM-DD)
- `endDate` (optional) - Filter orders until this date (ISO format: YYYY-MM-DD)
- `status` (optional) - Filter by status (pending, completed, cancelled)

**Example:**
```
GET /orders?startDate=2024-01-01&endDate=2024-01-31&status=completed
```

**Response:**
```json
[
  {
    "_id": "order_id",
    "orderNumber": "ORD-20240101-001",
    "items": [
      {
        "productId": "product_id",
        "productName": "Product Name",
        "price": 29.99,
        "quantity": 2,
        "imageUrl": "https://example.com/image.jpg"
      }
    ],
    "subtotal": 59.98,
    "tax": 5.998,
    "total": 65.978,
    "paymentMethod": "cash",
    "status": "completed",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/orders/stats`
Get order statistics for the authenticated user.

**Query Parameters:**
- `startDate` (optional) - Start date for statistics (ISO format: YYYY-MM-DD)
- `endDate` (optional) - End date for statistics (ISO format: YYYY-MM-DD)

**Response:**
```json
{
  "totalOrders": 150,
  "totalSales": 15000.00,
  "averageOrderValue": 100.00,
  "byPaymentMethod": {
    "cash": 75,
    "card": 50,
    "digital": 25
  },
  "dailySales": [
    {
      "date": "2024-01-01",
      "sales": 500.00,
      "orders": 5
    }
  ]
}
```

---

#### GET `/orders/:id`
Get a single order by ID.

**Response:**
```json
{
  "_id": "order_id",
  "orderNumber": "ORD-20240101-001",
  "items": [
    {
      "productId": "product_id",
      "productName": "Product Name",
      "price": 29.99,
      "quantity": 2,
      "imageUrl": "https://example.com/image.jpg"
    }
  ],
  "subtotal": 59.98,
  "tax": 5.998,
  "total": 65.978,
  "paymentMethod": "cash",
  "status": "completed",
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Order not found

---

#### POST `/orders`
Create a new order.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product_id",
      "productName": "Product Name",
      "price": 29.99,
      "quantity": 2,
      "imageUrl": "https://example.com/image.jpg"
    }
  ],
  "subtotal": 59.98,
  "tax": 5.998,
  "total": 65.978,
  "paymentMethod": "cash",
  "customerName": "John Doe" // Optional
}
```

**Response:**
```json
{
  "_id": "order_id",
  "orderNumber": "ORD-20240101-001",
  "items": [...],
  "subtotal": 59.98,
  "tax": 5.998,
  "total": 65.978,
  "paymentMethod": "cash",
  "status": "completed",
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201` - Order created successfully
- `400` - Validation error or insufficient stock
- `404` - Product not found

---

#### PUT `/orders/:id/status`
Update order status.

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Status Values:**
- `pending`
- `completed`
- `cancelled`

**Response:**
```json
{
  "_id": "order_id",
  "orderNumber": "ORD-20240101-001",
  "status": "completed",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Order not found
- `400` - Invalid status

---

### Analytics

#### GET `/analytics/dashboard`
Get dashboard statistics for the authenticated user.

**Response:**
```json
{
  "totalRevenue": 15000.00,
  "totalOrders": 150,
  "totalProducts": 50,
  "averageOrderValue": 100.00,
  "salesByDay": [
    {
      "date": "2024-01-01",
      "sales": 500.00,
      "orders": 5
    }
  ],
  "topProducts": [
    {
      "name": "Product Name",
      "quantity": 100,
      "sales": 2999.00
    }
  ]
}
```

---

#### GET `/analytics/category-sales`
Get sales statistics by category.

**Query Parameters:**
- `startDate` (optional) - Start date (ISO format: YYYY-MM-DD)
- `endDate` (optional) - End date (ISO format: YYYY-MM-DD)

**Response:**
```json
{
  "food": 10000.00,
  "drinks": 3000.00,
  "snacks": 2000.00
}
```

---

### Menu (Legacy - Consider migrating to Products API)

#### GET `/menu`
Get all menu items for the authenticated user.

**Query Parameters:**
- `category` (optional) - Filter by category
- `search` (optional) - Search in name and description

**Response:**
```json
[
  {
    "_id": "menu_id",
    "name": "Menu Item",
    "description": "Description",
    "price": 29.99,
    "category": "food",
    "stock": 100,
    "isAvailable": true,
    "image": {
      "url": "https://example.com/image.jpg",
      "publicId": "image_id"
    },
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/menu/:id`
Get a single menu item by ID.

**Response:**
```json
{
  "_id": "menu_id",
  "name": "Menu Item",
  "description": "Description",
  "price": 29.99,
  "category": "food",
  "stock": 100,
  "isAvailable": true,
  "image": {
    "url": "https://example.com/image.jpg",
    "publicId": "image_id"
  },
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Menu item not found

---

#### POST `/menu`
Create a new menu item.

**Request Body:**
```json
{
  "name": "Menu Item",
  "description": "Description",
  "price": 29.99,
  "category": "food",
  "stock": 100,
  "sku": "SKU123",
  "isAvailable": true,
  "image": {
    "url": "https://example.com/image.jpg",
    "publicId": "image_id"
  }
}
```

**Response:**
```json
{
  "_id": "menu_id",
  "name": "Menu Item",
  "description": "Description",
  "price": 29.99,
  "category": "food",
  "stock": 100,
  "isAvailable": true,
  "image": {
    "url": "https://example.com/image.jpg",
    "publicId": "image_id"
  },
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### PUT `/menu/:id`
Update an existing menu item.

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Menu Item",
  "price": 39.99,
  "stock": 150
}
```

**Response:**
```json
{
  "_id": "menu_id",
  "name": "Updated Menu Item",
  "price": 39.99,
  "stock": 150,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Menu item not found

---

#### DELETE `/menu/:id`
Delete a menu item.

**Response:**
```json
{
  "_id": "menu_id",
  "name": "Menu Item",
  "deleted": true
}
```

**Status Codes:**
- `200` - Success
- `404` - Menu item not found

---

### File Upload

#### POST `/upload`
Upload an image file.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File types: `image/jpeg`, `image/png`, `image/jpg`, `image/webp`
- Max file size: 5MB

**Response:**
```json
{
  "url": "http://localhost:3000/uploads/filename.jpg",
  "publicId": "filename.jpg",
  "originalName": "original.jpg",
  "size": 123456
}
```

**Status Codes:**
- `201` - File uploaded successfully
- `400` - No file uploaded or invalid file type
- `413` - File too large

**Note:** Uploaded files are served statically at `/uploads/:filename`

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Resource already exists",
  "error": "Conflict"
}
```

---

## Notes

1. **Authentication:** All protected endpoints require a valid JWT token in the Authorization header
2. **User Isolation:** All data is filtered by the authenticated user's ID
3. **Date Formats:** Use ISO 8601 format (YYYY-MM-DD) for date parameters
4. **File Uploads:** Files are stored locally in the `uploads` directory and served at `/uploads/:filename`
5. **Menu vs Products:** The `/menu` endpoints are legacy. Consider migrating to `/products` endpoints

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | Login user |
| POST | `/auth/register` | ❌ | Register user |
| GET | `/products` | ✅ | Get all products |
| GET | `/products/stats` | ✅ | Get product statistics |
| GET | `/products/:id` | ✅ | Get product by ID |
| POST | `/products` | ✅ | Create product |
| PUT | `/products/:id` | ✅ | Update product |
| DELETE | `/products/:id` | ✅ | Delete product |
| GET | `/orders` | ✅ | Get all orders |
| GET | `/orders/stats` | ✅ | Get order statistics |
| GET | `/orders/:id` | ✅ | Get order by ID |
| POST | `/orders` | ✅ | Create order |
| PUT | `/orders/:id/status` | ✅ | Update order status |
| GET | `/analytics/dashboard` | ✅ | Get dashboard stats |
| GET | `/analytics/category-sales` | ✅ | Get category sales |
| GET | `/menu` | ✅ | Get all menu items |
| GET | `/menu/:id` | ✅ | Get menu item by ID |
| POST | `/menu` | ✅ | Create menu item |
| PUT | `/menu/:id` | ✅ | Update menu item |
| DELETE | `/menu/:id` | ✅ | Delete menu item |
| POST | `/upload` | ✅ | Upload file |

