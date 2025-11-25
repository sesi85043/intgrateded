# Admin Dashboard Design Guidelines

## Design Approach

**Design System**: Material Design principles with Carbon Design data patterns for enterprise admin functionality. This dashboard prioritizes information density, workflow efficiency, and data clarity over aesthetic appeal.

**Key Principles**:
- Information hierarchy through clear visual structure
- Efficient task completion with minimal clicks
- Scannable data presentation
- Consistent, predictable interactions

## Typography

**Font Family**: Inter or Roboto via Google Fonts CDN

**Hierarchy**:
- Page titles: text-3xl font-semibold
- Section headers: text-xl font-medium
- Card titles: text-lg font-medium  
- Body text: text-base font-normal
- Labels/metadata: text-sm font-normal
- Table headers: text-xs font-semibold uppercase tracking-wide
- Metrics/stats: text-4xl font-bold (large numbers)

## Layout System

**Spacing Scale**: Use Tailwind units of 2, 4, 6, and 8 consistently (p-2, p-4, p-6, p-8, gap-4, space-y-6, etc.)

**Grid Structure**:
- Main container: max-w-7xl mx-auto px-6
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Metric cards: grid grid-cols-2 md:grid-cols-4 gap-4
- Sidebar + content: grid grid-cols-[240px_1fr] gap-6

## Component Library

### Navigation
**Top Navigation Bar**:
- Full-width sticky header (h-16)
- Logo/brand left, user profile/logout right
- Service switcher dropdown (Metabase, Chatwoot, Typebot, Mailcow)

**Sidebar Navigation** (240px fixed width):
- Dashboard, User Management, Analytics, Activity Logs, Configuration
- Active state with visual indicator (border-l-4)
- Icons from Heroicons (outline style)
- Collapsible on mobile

### Dashboard Cards
**Metric Cards**:
- Compact design with metric value (text-4xl), label (text-sm), and change indicator
- Grid layout for 4 metrics across desktop
- Icon in top-right corner
- min-h-32 for consistency

**Service Status Cards**:
- Service name, status badge, last sync time, action button
- 2-column grid on desktop, stack on mobile

### Data Tables
**User Management Table**:
- Sticky header row
- Columns: Avatar, Name, Email, Role, Platform, Status, Actions
- Row actions: Edit (pencil icon), Deactivate (ban icon), Delete (trash icon)
- Pagination controls at bottom (10/25/50 per page)
- Search bar above table (w-full md:w-96)
- Filter dropdowns (Platform, Role, Status) - inline above table

**Activity Log Table**:
- Columns: Timestamp, Admin, Action, Target User, Platform, Details
- Expandable row for detailed logs
- Date range filter

### Forms
**User Creation/Edit Modal**:
- Modal overlay (fixed inset-0)
- Modal content (max-w-2xl centered)
- Form fields: Full Name, Email, Role (select), Platform (multi-select checkboxes)
- Two-button footer: Cancel (secondary), Save (primary)

**Configuration Form**:
- Accordion sections for each service (Metabase, Chatwoot, Typebot, Mailcow)
- Fields: API URL, API Key, Enable/Disable toggle
- Test Connection button per service

### Analytics Components
**Chart Cards**:
- Card container with header (title + time range selector)
- Chart.js or similar library integration areas
- Types needed: Line charts (conversations over time), Bar charts (user activity), Pie charts (platform distribution)
- min-h-80 for chart containers

**Stat Comparison Grid**:
- Side-by-side platform metrics
- 4-column grid: platform name, active users, conversations/submissions, growth %

### UI Elements
**Badges**:
- Status: Active, Inactive, Suspended (rounded-full px-2 py-1 text-xs)
- Platform tags: rounded px-2 py-1 text-xs

**Buttons**:
- Primary: px-4 py-2 rounded font-medium
- Secondary: px-4 py-2 rounded border-2
- Icon buttons: p-2 rounded (for table actions)
- Danger: red treatment for delete actions

**Dropdown Menus**:
- User profile menu (top-right)
- Action menus in tables (three-dot icon)
- Filter dropdowns

**Search & Filters**:
- Search input with magnifying glass icon
- Filter chips showing active filters (dismissible)

### Empty States
- Icon + message + action button
- "No users found" - Create First User button
- "No activity yet" - explanatory text

## Page Layouts

**Dashboard Home**:
- 4 metric cards at top (grid-cols-4)
- 2-column section: Recent Activity (left) + Quick Actions (right)
- Service status cards grid below

**User Management**:
- Page header with title + "Add User" button (right-aligned)
- Search and filters row
- Data table filling remaining space
- Pagination footer

**Analytics**:
- Time range selector (top-right)
- Platform selector tabs
- 3-chart layout: 2 side-by-side, 1 full-width below
- Metric comparison table at bottom

**Activity Logs**:
- Date range filter + export button
- Full-width table with detailed view

**Configuration**:
- Accordion list of services
- Save button (sticky footer)

## Interaction Patterns

**Modal Workflows**: User creation, editing, deletion confirmations
**Inline Editing**: Quick role/status changes in tables  
**Toast Notifications**: Success/error messages (top-right, auto-dismiss)
**Loading States**: Skeleton screens for tables, spinner for actions
**Confirmation Dialogs**: For destructive actions (delete user)

## Accessibility

- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Focus indicators on all inputs and buttons
- Sufficient contrast ratios (handled by design system)
- Table headers properly associated with data

## Images

No hero images or marketing imagery. This is a pure utility interface. Icons only from Heroicons (outline style for navigation, solid for status indicators).