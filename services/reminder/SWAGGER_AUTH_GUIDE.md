# 🔐 Swagger Authorization Guide for Reminder Service

## 🎯 **Fixed Authorization Issue**

The Swagger authorization has been updated to include **both required security schemes**:
- **ApiGatewayAuth** (JWT token)  
- **UserHeaders** (x-user-id)

## 📋 **Step-by-Step Instructions**

### 1. **Open Swagger UI**
```
http://localhost:3004/api-docs
```

### 2. **Click the 🔒 "Authorize" Button**
You'll see **TWO authorization fields**:

#### **ApiGatewayAuth (Optional for testing)**
```
Value: Bearer your-jwt-token-here
```
*Note: You can leave this empty for testing*

#### **UserHeaders (REQUIRED)**
```
Value: 123e4567-e89b-12d3-a456-426614174000
```
*This is the x-user-id header value*

### 3. **Click "Authorize"**
Both authorization schemes should now show as ✅ **Authorized**

### 4. **Test Any Endpoint**
- Click "Try it out" on any `/api/reminders/*` endpoint
- Fill in parameters if needed
- Click "Execute"
- You should now see successful responses instead of 401 errors

## 🧪 **Test Values**

Use these test values in Swagger UI:

**UserHeaders (x-user-id):**
```
123e4567-e89b-12d3-a456-426614174000
```

**Create Reminder Body:**
```json
{
  "taskId": "123e4567-e89b-12d3-a456-426614174001",
  "dueDate": "2024-12-25T10:00:00.000Z",
  "remindBefore": 30
}
```
*Note: userId is automatically extracted from your authentication headers*

## 🎯 **What Was Fixed**

### **Before (Broken):**
```yaml
security:
  - ApiGatewayAuth: []  # Only JWT token, missing x-user-id
```

### **After (Fixed):**
```yaml
security:
  - ApiGatewayAuth: []
    UserHeaders: []     # Now includes x-user-id requirement
```

## 🔍 **Verification**

After authorization, you should be able to:
- ✅ GET `/api/reminders/my` - Get your reminders
- ✅ POST `/api/reminders` - Create a reminder  
- ✅ GET `/api/reminders/pending` - Get pending reminders
- ✅ PUT `/api/reminders/{taskId}` - Update a reminder
- ✅ DELETE `/api/reminders/{taskId}` - Delete a reminder

## 🚨 **Common Issues**

1. **Still getting 401?** Make sure you filled in the **UserHeaders** field, not just ApiGatewayAuth
2. **Invalid UUID?** Use the exact format: `123e4567-e89b-12d3-a456-426614174000`
3. **Wrong endpoint?** Make sure you're testing `/api/reminders/*` endpoints, not just `/reminders`

## 🎉 **Success!**

You should now be able to test all reminder API endpoints through Swagger UI without authorization errors! 