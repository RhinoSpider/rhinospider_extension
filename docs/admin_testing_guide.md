# RhinoSpider Admin Interface Testing Guide

## Overview
This guide covers testing procedures for the RhinoSpider admin interface, which manages scraping tasks, user access, and analytics data through Internet Computer (ICP) canisters.

## Prerequisites
- Node.js (v16 or higher)
- DFX CLI (latest version)
- Internet Identity configured locally
- Access to a principal ID with SuperAdmin privileges

## Setup Instructions

### 1. Local Development Setup
```bash
# Start the local ICP network
dfx start --clean --background

# Deploy the canisters
cd canisters
dfx deploy

# Install dependencies and start the admin interface
cd ../apps/admin
npm install
npm run dev
```

### 2. Canister Configuration
The following canisters should be deployed:
- `admin_canister`: Manages users, roles, and permissions
- `task_canister`: Handles scraping tasks and configurations
- `analytics_canister`: Stores analytics and usage data
- `storage_canister`: Manages content and metadata storage

## Testing Scenarios

### 1. Authentication Testing

#### SuperAdmin Login
1. Navigate to the admin interface (http://localhost:5173)
2. Click "Sign in with Internet Identity"
3. Use the SuperAdmin principal ID
4. Verify access to all sections (Users, Tasks, Analytics)

#### Expected Results:
- Successful authentication
- Access to all admin features
- Correct role display in navbar

### 2. User Management Testing

#### Adding New Users
1. Navigate to Users section
2. Test adding users with different roles:
   - Add Admin user
   - Add Operator user
3. Verify user listing updates

#### Role Permissions
Test access levels for each role:
- SuperAdmin: Full access
- Admin: Task management, analytics
- Operator: View-only access

#### Expected Results:
- Users successfully added with correct roles
- Proper access restrictions based on roles
- Audit trail showing who added each user

### 3. Task Management Testing

#### Creating Tasks
1. Navigate to Tasks section
2. Create new scraping task:
   ```json
   {
     "id": "test-task-1",
     "url": "https://example.com",
     "frequency": 3600,
     "filters": ["tech", "ai"],
     "topics": ["artificial intelligence", "machine learning"]
   }
   ```

#### Monitoring Tasks
1. Verify task status updates
2. Check task execution history
3. Test task modification and deletion

#### Expected Results:
- Task creation successful
- Status updates reflect correctly
- Task modifications persist

### 4. Analytics Testing

#### Data Collection
1. Verify analytics data collection:
   - Scraping statistics
   - User engagement metrics
   - System performance data

#### Data Visualization
1. Test analytics dashboard:
   - Check graphs and charts
   - Verify data accuracy
   - Test date range filters

#### Expected Results:
- Real-time data updates
- Accurate metrics display
- Proper data aggregation

### 5. Storage Testing

#### Content Management
1. Test content storage:
   - Verify scraped content storage
   - Check metadata preservation
   - Test content retrieval

#### Storage Limits
1. Monitor storage usage
2. Test large content handling
3. Verify cleanup processes

#### Expected Results:
- Efficient content storage
- Fast retrieval times
- Proper error handling

## Error Scenarios to Test

### Authentication Errors
- Invalid principal ID
- Expired sessions
- Unauthorized access attempts

### Task Management Errors
- Invalid task configurations
- Network failures
- Resource limitations

### Storage Errors
- Capacity limits
- Data corruption
- Sync issues

## Performance Testing

### Load Testing
1. Test with multiple concurrent users
2. Monitor system response times
3. Check canister cycle consumption

### Resource Usage
1. Monitor memory usage
2. Track storage growth
3. Measure query response times

## Security Testing

### Access Control
- Test role-based access
- Verify permission boundaries
- Check authentication persistence

### Data Protection
- Test data encryption
- Verify secure communications
- Check audit logging

## Troubleshooting Guide

### Common Issues
1. Authentication failures:
   - Check Internet Identity connection
   - Verify principal ID permissions

2. Task execution issues:
   - Check canister cycles
   - Verify network connectivity
   - Review task configurations

3. Storage problems:
   - Monitor storage limits
   - Check data integrity
   - Verify backup processes

## Deployment Checklist

### Pre-deployment
- [ ] All tests pass
- [ ] Canister cycles sufficient
- [ ] Backup systems configured
- [ ] Security measures verified

### Post-deployment
- [ ] Monitor system performance
- [ ] Check user access
- [ ] Verify data integrity
- [ ] Test backup/restore procedures
