# Email Health API Security Implementation

This document provides an overview of the security implementation for the Email Health API endpoints. It explains the permission model, validation mechanisms, and how to verify that the security measures are working correctly.

## Permission Model

The Email Health API uses a permission-based access control system with three levels:

1. **Read Permission**: View account health data
2. **Write Permission**: Update health scores
3. **Admin Access**: Bulk operations and access to all accounts

Each API key has specific permission levels that determine what actions it can perform.

## Security Mechanisms

The following security mechanisms are implemented:

### 1. API Key Validation

All endpoints require a valid API key provided in the `X-API-KEY` header. The API key is validated against the database, and its permissions are checked.

### 2. Permission Decorators

Endpoints are decorated with permission requirements:

```python
@require_api_key(can_read=True, can_write=False, admin_only=False)
```

### 3. User-based Filtering

Non-admin users can only access their own accounts. This filtering is applied consistently across all endpoints using the `check_permission` utility function or the `filter_accounts_by_user_permission` function for collection endpoints.

### 4. Admin-only Operations

Certain operations, like bulk updates, are restricted to admin users only.

## Centralized Permission Checking

We've implemented a centralized permission checking mechanism to ensure consistent authorization across all endpoints. The core functions are:

### `check_permission(account_id, user_id, is_admin, permission_type)`

Validates if a user has permission to access or modify a specific account based on:
- Whether they are an admin
- Whether they own the account
- The type of permission required ('read', 'write', 'delete')

### `filter_accounts_by_user_permission(query, user_id, is_admin)`

Filters a query of accounts to only show the ones a user has permission to see.

## Testing the Security Implementation

### Automated Verification

Run the security implementation checker to verify that all security measures are in place:

```
python check_security_implementation.py
```

This will check for:
- Proper use of decorators
- Auth utility functions
- Correct implementation in routes

### Manual Testing

You can manually test the permission system using the test script:

```
python test_health_permissions.py --base-url http://localhost:5000 \
                                 --read-key YOUR_READ_KEY \
                                 --write-key YOUR_WRITE_KEY \
                                 --admin-key YOUR_ADMIN_KEY \
                                 --account-id VALID_ACCOUNT_ID
```

This script will test all endpoints with different API keys to ensure that permission checks are working correctly.

### Expected Behavior

- No API key → 401 Unauthorized
- Insufficient permissions → 403 Forbidden
- Admin accessing any account → 200 OK
- User accessing their own account → 200 OK
- User accessing another user's account → 403 Forbidden

## Security Best Practices

The implementation follows these security best practices:

1. **Principle of Least Privilege**: Users only have access to what they need.
2. **Defense in Depth**: Multiple layers of security checks.
3. **Centralized Validation**: Authorization logic is centralized to prevent inconsistencies.
4. **Proper Error Handling**: Clear error messages without leaking sensitive information.
5. **Comprehensive Logging**: Security-relevant actions are logged for audit purposes.

## Maintenance

When adding new endpoints to the Email Health API, ensure they follow the same security patterns:

1. Add appropriate `@require_api_key` decorators
2. Use `check_permission` for individual account access
3. Use `filter_accounts_by_user_permission` for collection endpoints
4. Implement proper error handling with clear but safe error messages
5. Add tests for the new endpoints