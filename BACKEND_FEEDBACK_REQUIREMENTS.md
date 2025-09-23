# Backend Feedback System Implementation Requirements

This document outlines the complete backend implementation requirements for the Tabsy feedback system. The frontend has been fully implemented and is waiting for these backend APIs to become functional.

## Overview

**Status**: Frontend Complete, Backend Missing
**Priority**: High - Customer experience feature
**Estimated Effort**: 2-3 weeks for full implementation
**Dependencies**: Existing user authentication, file upload infrastructure

## Current Situation

### ✅ Frontend Implementation (Complete)
- Customer feedback form with ratings, comments, and photo uploads
- Restaurant dashboard feedback management interface
- Comprehensive error handling and user experience
- TypeScript types and API client ready
- Integration points in table sessions and payment flow

### ❌ Backend Implementation (Missing)
- **NO feedback endpoints exist** in the current 86 documented API endpoints
- **NO database schema** for feedback storage
- **NO file upload handling** for feedback photos
- **NO business logic** for feedback processing

## Database Schema Requirements

### 1. Feedback Table
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),           -- Optional: link to specific order
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  table_id UUID REFERENCES tables(id),           -- Optional: table context
  user_id UUID REFERENCES users(id),             -- Optional: authenticated user
  session_id VARCHAR(255),                       -- Optional: guest session

  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Content
  comment TEXT,
  quick_feedback JSONB,                          -- Array of predefined feedback tags

  -- Guest information
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(255),

  -- Status and moderation
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'FLAGGED', 'HIDDEN')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT feedback_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_feedback_restaurant_id ON feedback(restaurant_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
CREATE INDEX idx_feedback_overall_rating ON feedback(overall_rating);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_order_id ON feedback(order_id) WHERE order_id IS NOT NULL;
```

### 2. Feedback Photos Table
```sql
CREATE TABLE feedback_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  thumbnail_path VARCHAR(500),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_image_type CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT valid_file_size CHECK (file_size <= 5242880) -- 5MB limit
);

-- Indexes
CREATE INDEX idx_feedback_photos_feedback_id ON feedback_photos(feedback_id);
```

### 3. Feedback Responses Table
```sql
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  responded_by VARCHAR(255) NOT NULL,
  responded_by_user_id UUID REFERENCES users(id),
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Only one response per feedback
  UNIQUE(feedback_id)
);
```

### 4. Feedback Flags Table
```sql
CREATE TABLE feedback_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('INAPPROPRIATE', 'SPAM', 'FAKE', 'OFFENSIVE', 'OTHER')),
  details TEXT,
  flagged_by_user_id UUID REFERENCES users(id),
  flagged_by_session_id VARCHAR(255),
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate flags from same user/session
  UNIQUE(feedback_id, flagged_by_user_id),
  UNIQUE(feedback_id, flagged_by_session_id)
);
```

## API Endpoints Implementation

### 1. Create Feedback
```http
POST /api/v1/feedback
```

**Request Validation**:
- `restaurantId`: Required, must exist in restaurants table
- `overallRating`: Required, integer 1-5
- `categories.*`: Optional, integer 1-5 if provided
- `comment`: Optional, max 1000 characters, HTML sanitization
- `photos`: Optional, validate photo IDs exist and belong to session
- Email validation for guest info if provided

**Business Logic**:
- Prevent duplicate feedback per order (if order_id provided)
- Auto-approve feedback with rating >= 4, set pending for rating < 4
- Link to authenticated user or validate guest session
- Process photo associations
- Send notifications to restaurant staff

**Response**: Created feedback object with generated ID

### 2. Get Restaurant Feedback
```http
GET /api/v1/restaurants/:restaurantId/feedback
```

**Authorization**: Restaurant owner or admin only
**Query Parameters**: Pagination, filtering by rating, date range, status
**Business Logic**: Aggregate statistics, apply filters, paginate results
**Response**: Feedback list with pagination and stats

### 3. Feedback Statistics
```http
GET /api/v1/restaurants/:restaurantId/feedback/stats
```

**Authorization**: Restaurant owner or admin only
**Business Logic**:
- Calculate average ratings overall and by category
- Generate rating distribution (1-5 star counts)
- Compute trends over time periods
- Analyze quick feedback sentiment
- Count response rate

### 4. Photo Upload
```http
POST /api/v1/feedback/photos
```

**File Handling**:
- Multipart form data processing
- File type validation (JPEG, PNG, WebP only)
- Size validation (5MB max per file, 5 files max total)
- Virus scanning integration
- Image optimization and thumbnail generation
- Secure file storage with unique filenames

**Business Logic**:
- Generate secure file paths
- Create thumbnails for UI performance
- Store metadata in database
- Return URLs for frontend access

### 5. Restaurant Response
```http
POST /api/v1/feedback/:feedbackId/respond
```

**Authorization**: Restaurant owner/admin, verify restaurant ownership
**Validation**: Max 500 characters, HTML sanitization
**Business Logic**: One response per feedback, send notification to customer

### 6. Flag Feedback
```http
POST /api/v1/feedback/:feedbackId/flag
```

**Authorization**: Any authenticated user or guest session
**Business Logic**: Prevent duplicate flags, auto-hide if multiple flags, notify admins

## File Upload Infrastructure

### Storage Strategy
- **Development**: Local filesystem with proper permissions
- **Production**: AWS S3 or similar cloud storage
- **CDN**: CloudFront or similar for public photo access
- **Security**: Signed URLs for photo access, no direct file system exposure

### File Processing Pipeline
1. **Upload Validation**: Type, size, virus scanning
2. **Image Processing**: Resize, optimize, generate thumbnails
3. **Storage**: Secure file path generation, metadata storage
4. **Cleanup**: Remove orphaned files, expired temporary uploads

## Security Implementation

### 1. Input Validation
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML sanitization for comments)
- File upload security (type validation, virus scanning)
- Rate limiting on feedback submission (prevent spam)

### 2. Authorization
- Guest sessions: Can create and flag feedback
- Restaurant owners: Can view their restaurant's feedback and respond
- Admins: Can moderate all feedback and manage flags
- Users: Can view their own feedback history

### 3. Data Privacy
- Guest information is optional and handled per privacy policy
- Photo metadata scrubbing (remove EXIF data)
- Secure file access (no direct file system paths exposed)

## Business Logic Requirements

### 1. Feedback Processing
- **Auto-approval**: 4-5 star ratings auto-approved
- **Manual review**: 1-3 star ratings require approval
- **Duplicate prevention**: One feedback per order per session
- **Guest linking**: Associate guest feedback with orders when possible

### 2. Notifications
- **Real-time**: WebSocket notifications to restaurant dashboard
- **Email**: Summary emails to restaurant owners (configurable)
- **Alerts**: Low rating alerts, response reminders

### 3. Analytics
- **Trending**: Rating trends over time
- **Benchmarking**: Compare with restaurant averages
- **Insights**: Category performance, common complaints/praise

## Testing Requirements

### 1. Unit Tests
- Feedback CRUD operations
- Rating calculations and aggregations
- File upload processing
- Input validation

### 2. Integration Tests
- End-to-end feedback submission flow
- Photo upload and retrieval
- Restaurant dashboard data loading
- Notification delivery

### 3. Performance Tests
- Large dataset feedback queries
- File upload stress testing
- Database query optimization
- Cache effectiveness

## Deployment Considerations

### 1. Database Migration
- Schema creation scripts
- Index creation for performance
- Data migration if updating existing system

### 2. File Storage Setup
- Cloud storage configuration
- CDN setup for photo delivery
- Backup and recovery procedures

### 3. Monitoring
- API endpoint monitoring
- File upload success rates
- Database performance metrics
- Error rate tracking

## Success Metrics

### 1. Technical Metrics
- API response times < 200ms for feedback queries
- Photo upload success rate > 98%
- Zero data loss or corruption
- 99.9% uptime for feedback system

### 2. Business Metrics
- Customer feedback submission rate > 15% of orders
- Restaurant response rate > 60%
- Average time to response < 24 hours
- Customer satisfaction with feedback process > 4.0/5

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- Database schema implementation
- Basic CRUD API endpoints
- Authentication integration
- Input validation

### Phase 2: Advanced Features (Week 2)
- Photo upload system
- Analytics and statistics
- Restaurant response system
- Real-time notifications

### Phase 3: Polish & Production (Week 3)
- Performance optimization
- Security hardening
- Monitoring setup
- Documentation and testing

## API Documentation Requirements

Once implemented, update the main API documentation with:
- Complete endpoint specifications
- Request/response examples
- Error codes and handling
- Rate limiting information
- Authentication requirements

## Frontend Integration Notes

The frontend is ready and waiting for these APIs. Once implemented:

1. **Update API base URL** if needed in frontend configuration
2. **Test error handling** - frontend has comprehensive error handling ready
3. **Verify data formats** match the implemented backend responses
4. **Test file upload flow** end-to-end
5. **Validate real-time features** work as expected

The frontend error handling is specifically designed to gracefully handle the current "404 not found" errors and will automatically work once the backend is deployed.