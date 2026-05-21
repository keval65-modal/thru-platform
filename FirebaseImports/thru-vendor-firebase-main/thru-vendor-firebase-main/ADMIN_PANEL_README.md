# Thru Super Admin Panel

## Overview

A comprehensive, dedicated Super Admin Panel for Thru operations, finance, settlements, coverage expansion, support, and analytics. This is a true admin dashboard and control center, separate from the vendor-facing interface.

## Architecture

### Layout Structure
- **AdminShell Component**: Dedicated admin layout with sidebar navigation and header
- **Navigation**: 13 main modules accessible via left sidebar
- **Brand Colors**: Uses Thru brand color #F6675E (already configured in globals.css)

### Key Components

#### Shared Admin Components
- `AdminShell.tsx`: Main layout wrapper with sidebar and header
- `DashboardWidget.tsx`: Reusable widget component for dashboard cards
- `PageHeader.tsx`: Standardized page header component

#### Navigation Config
- `admin-nav.ts`: Centralized navigation configuration for all 13 admin modules

## Modules

### 1. Dashboard (`/admin`)
- Widget-based command center
- Key metrics: shops, KYC status, users, orders, GMV, earnings, settlements, expenses
- Global date range filter
- Quick search and actions
- Modular layout ready for expansion

### 2. Map / Coverage (`/admin/map`)
- Google Maps integration with shop markers
- Category-based filtering
- KYC and active status filters
- H3 grid overlay placeholder (ready for h3-js implementation)
- Coverage legend and category statistics

### 3. Shops (`/admin/shops`)
- **List View**: Comprehensive table with filtering, sorting, search, CSV export
- **Detail View**: Deep vendor profile with tabs:
  - Overview: Basic info, contact, registration, performance
  - KYC & Documents: KYC workflow and document management
  - Orders: Order history
  - Financial: Revenue and earnings breakdown
  - History & Notes: Audit trail

### 4. Users (`/admin/users`)
- User list with spending behavior metrics
- User detail page with:
  - Profile information
  - Usage statistics
  - Order history
  - Issues & complaints

### 5. Orders (`/admin/orders`)
- Operations-first order management
- Comprehensive filtering (status, payment, issues, date range)
- Order detail page with timeline and payment breakdown

### 6. Finance (`/admin/finance`)
- **Revenue Overview Tab**:
  - GMV, Thru earnings, vendor payouts, settlements
  - Top grossing vendors and categories
- **Expense Tracker Tab**:
  - Daily expense entries
  - Category breakdown
  - Tax-friendly export

### 7. Settlements (`/admin/settlements`)
- Vendor payout tracking
- Settlement status management
- Platform fee calculation (configurable, currently ₹10)
- Settlement detail views

### 8. Reports (`/admin/reports`)
- Multiple report types:
  - Revenue, Settlement, Vendor earnings
  - Category-wise, Area-wise performance
  - Expense, Tax summary
  - User spend, Order issues
- Date range filtering
- CSV export ready

### 9. Support / Issues (`/admin/issues`)
- Issue management system
- Filters: status, severity, source, type
- Linked to orders, users, vendors
- Resolution tracking

### 10. Notifications (`/admin/notifications`)
- Internal communication center
- Notification templates
- Delivery status tracking
- Future-ready for vendor/user announcements

### 11. Analytics (`/admin/analytics`)
- Insight-driven metrics:
  - Active vendors/users
  - Average order value
  - Repeat customer rate
  - Completion/cancellation rates
  - Area-wise coverage
- Chart-ready structure

### 12. Audit Logs (`/admin/audit-logs`)
- Complete audit trail
- Admin actions tracking
- Entity-level change history
- Ready for multi-admin support

### 13. Settings (`/admin/settings`)
- Platform fee configuration
- Shop categories management
- Settlement cycle defaults
- Notification templates
- Admin profile management
- System status monitoring

## Design Principles

1. **Data-Heavy but Scannable**: Clean tables, cards, and summaries
2. **Modular & Scalable**: Easy to add new widgets and features
3. **Drill-Down Navigation**: Clickable widgets lead to filtered detail pages
4. **Professional UI**: White/light neutral theme with Thru brand accents
5. **Operational Focus**: Internal tool, not vendor-facing

## Backend Integration

All pages are structured to connect with Supabase backend:
- Shops: Uses existing `getAllVendors()` and `getVendorForEditing()` actions
- Orders: Ready for `placed_orders` table queries
- Users: Ready for `users` table queries
- Finance: Ready for revenue/expense calculations
- Settlements: Ready for settlement tracking
- Issues: Ready for issue management system
- Analytics: Ready for aggregated metrics

## Future Enhancements

1. **H3 Grid Implementation**: Install `h3-js` and implement coverage grid overlay
2. **Chart Integration**: Add Recharts components for analytics visualizations
3. **Real-time Updates**: WebSocket integration for live order tracking
4. **PDF Export**: Add PDF generation for reports
5. **Advanced Filtering**: More sophisticated filter combinations
6. **Bulk Actions**: Batch operations for shops, orders, settlements
7. **Role-Based Access**: Multi-admin support with permissions

## File Structure

```
src/
├── components/
│   └── admin/
│       ├── AdminShell.tsx          # Main admin layout
│       ├── DashboardWidget.tsx      # Reusable widget component
│       └── PageHeader.tsx           # Standardized page header
├── config/
│   └── admin-nav.ts                 # Admin navigation configuration
└── app/
    └── (app)/
        └── admin/
            ├── layout.tsx            # Admin route layout
            ├── page.tsx              # Dashboard
            ├── map/
            ├── shops/
            ├── users/
            ├── orders/
            ├── finance/
            ├── settlements/
            ├── reports/
            ├── issues/
            ├── notifications/
            ├── analytics/
            ├── audit-logs/
            └── settings/
```

## Getting Started

1. The admin panel is accessible at `/admin` (requires admin role)
2. All pages use the AdminShell layout automatically
3. Navigation is handled via `admin-nav.ts` configuration
4. Pages are ready to connect with backend data sources

## Notes

- Brand color #F6675E is already configured in `globals.css`
- All UI components use existing Radix UI components
- Responsive design optimized for desktop first
- Empty states and loading states are included
- Status badges use consistent color coding
