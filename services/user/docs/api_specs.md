# Đặc tả API: Auth-Service 🔐

---

## I. Tổng quan

* **Mô tả:**  
  Auth-Service chịu trách nhiệm đăng ký người dùng, xác thực đăng nhập, phát và làm mới JWT, quản lý refresh token.  
* **Công nghệ sử dụng (Stack):**  
  Node.js, Express, bcrypt, jsonwebtoken  
* **Cơ sở dữ liệu:**  
  PostgreSQL: lưu thông tin người dùng và refresh token.

---

## II. Xác thực & Ủy quyền

* **Cơ chế xác thực API:**  
  - Các endpoint ngoài `/auth/register` và `/auth/login` yêu cầu header  
    `Authorization: Bearer <JWT>`.  
  - JWT ký RS256 (HS256 cho môi trường dev).  
* **Cơ chế ủy quyền:**  
  - JWT chứa claim `roles` (ví dụ `["SYSTEM_ADMIN","CLUB_ADMIN"]`).  
  - Middleware kiểm `roles` phù hợp với quyền của từng endpoint.

---

## III. Các Endpoint API

### 1. POST /auth/register

* **Mô tả:** Đăng ký tài khoản mới.  
* **Authorization Required:** không  
* **Request Body:**
    ```json
    {
      "email": "user@example.com",          
      "password": "P@ssw0rd!",              
      "full_name": "Nguyễn Văn A"           
    }
    ```
* **Response 201 Created:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "message": "Đăng ký thành công. Vui lòng xác nhận email."
    }
    ```
* **Errors:**
  * **400 Bad Request:** email đã tồn tại.  
  * **500 Internal Server Error:** lỗi server.

---

### 2. POST /auth/login

* **Mô tả:** Xác thực đăng nhập, trả về access + refresh token.  
* **Authorization Required:** không  
* **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "P@ssw0rd!"
    }
    ```
* **Response 200 OK:**
    ```json
    {
      "access_token": "<JWT_ACCESS_TOKEN>",
      "refresh_token": "<REFRESH_TOKEN>"
    }
    ```
* **Errors:**
  * **400 Bad Request:** thiếu thông tin.  
  * **401 Unauthorized:** sai email hoặc mật khẩu.

---

### 3. POST /auth/refresh

* **Mô tả:** Đổi refresh token lấy access token mới.  
* **Authorization Required:** không  
* **Request Body:**
    ```json
    {
      "refresh_token": "<REFRESH_TOKEN>"
    }
    ```
* **Response 200 OK:**
    ```json
    {
      "access_token": "<NEW_JWT_TOKEN>"
    }
    ```
* **Errors:**
  * **401 Unauthorized:** refresh token không hợp lệ hoặc hết hạn.

---

### 4. GET /auth/me

* **Mô tả:** Lấy thông tin người dùng đang đăng nhập.  
* **Authorization Required:** `Bearer <JWT>`  
* **Response 200 OK:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "roles": ["SYSTEM_ADMIN"]
    }
    ```
* **Errors:**
  * **401 Unauthorized:** token không hợp lệ hoặc thiếu.

---

## IV. Luồng nghiệp vụ & Tương tác

* **Register:**  
  1. Client → `POST /auth/register`.  
  2. Hash mật khẩu, lưu bảng `users`.  
  3. Publish event `UserRegistered` → RabbitMQ topic `auth.user`.  

---

## V. Cấu trúc Database

* **Loại:** PostgreSQL  
* **Bảng `users`:**  
  - `id` UUID PK  
  - `email` VARCHAR UNIQUE  
  - `password_hash` VARCHAR  
  - `full_name` VARCHAR  
  - `created_at` TIMESTAMP  
* **Bảng `refresh_tokens`:**  
  - `id` UUID PK  
  - `user_id` UUID FK → `users.id`  
  - `token` VARCHAR  
  - `expires_at` TIMESTAMP  
