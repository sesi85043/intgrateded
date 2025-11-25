# Department & Team Member Management Guide

## ✅ What I've Implemented For You

I've added a complete department and team member management system to your Admin Hub! This allows you to organize your company structure with:

- **Departments**: HA (Home Appliances), DTV, HHP
- **Team Members**: Admins and Technicians in each department
- **Login Credentials**: Generated for each team member with their role and department info

## 🏢 Database Structure

### New Tables Created:

#### 1. **departments** table
- **id**: Unique identifier
- **name**: Full department name (e.g., "Home Appliances")
- **code**: Short code (e.g., "HA", "DTV", "HHP")
- **description**: Optional description
- **status**: active/inactive
- **createdAt/updatedAt**: Timestamps

#### 2. **team_members** table
- **id**: Unique identifier
- **userId**: Link to user account (optional, for login access)
- **departmentId**: Which department they belong to
- **employeeId**: Employee number (e.g., "EMP001", "HA-TEC-001")
- **email**: Employee email
- **firstName/lastName**: Full name
- **role**: "admin" or "technician"
- **phone**: Contact number (optional)
- **status**: active/inactive
- **createdAt/updatedAt**: Timestamps

## 🔌 API Endpoints Available

### Department Endpoints:

```
GET    /api/departments           - Get all departments
POST   /api/departments           - Create new department
PATCH  /api/departments/:id       - Update department
DELETE /api/departments/:id       - Delete department
```

### Team Member Endpoints:

```
GET    /api/team-members          - Get all team members
GET    /api/team-members?departmentId=xxx  - Get members by department
POST   /api/team-members          - Create new team member
PATCH  /api/team-members/:id      - Update team member
DELETE /api/team-members/:id      - Delete team member
```

## 📋 How to Use It

### Step 1: Create Your Departments

Use the API or create a setup script to add your departments:

```bash
# Example using curl (make sure you're logged in first)

# Create HA Department
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Home Appliances",
    "code": "HA",
    "description": "Home appliances division",
    "status": "active"
  }'

# Create DTV Department
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Digital TV",
    "code": "DTV",
    "description": "Digital TV and entertainment systems",
    "status": "active"
  }'

# Create HHP Department
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Handheld Products",
    "code": "HHP",
    "description": "Mobile and handheld devices",
    "status": "active"
  }'
```

### Step 2: Add Team Members

After creating departments, add your team members:

```bash
# Add an Admin to HA Department
curl -X POST http://localhost:5000/api/team-members \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "<department-id-from-step-1>",
    "employeeId": "HA-ADM-001",
    "email": "john.admin@company.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin",
    "phone": "+1234567890",
    "status": "active"
  }'

# Add a Technician to HA Department
curl -X POST http://localhost:5000/api/team-members \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "<department-id-from-step-1>",
    "employeeId": "HA-TEC-001",
    "email": "jane.tech@company.com",
    "firstName": "Jane",
    "lastName": "Technician",
    "role": "technician",
    "phone": "+1234567891",
    "status": "active"
  }'
```

## 🔐 Login Credentials Generation

### Option 1: Manual Employee ID Assignment

When creating team members, you can assign custom employee IDs:

```javascript
{
  "employeeId": "HA-ADM-001",      // Format: DEPT-ROLE-NUMBER
  "email": "john@company.com",
  "role": "admin",
  "departmentId": "xxx"
}
```

**Employee ID Format Examples:**
- `HA-ADM-001` → Home Appliances, Admin, #001
- `HA-TEC-001` → Home Appliances, Technician, #001
- `DTV-ADM-001` → Digital TV, Admin, #001
- `DTV-TEC-001` → Digital TV, Technician, #001
- `HHP-ADM-001` → Handheld Products, Admin, #001

### Option 2: Auto-Generate Employee IDs

You can create a helper function to auto-generate IDs:

```typescript
function generateEmployeeId(departmentCode: string, role: string, count: number): string {
  const roleCode = role === 'admin' ? 'ADM' : 'TEC';
  const number = String(count + 1).padStart(3, '0');
  return `${departmentCode}-${roleCode}-${number}`;
}

// Example usage:
// HA-ADM-001, HA-ADM-002, etc.
```

### Option 3: Link to User Authentication

If you want team members to have login access:

1. Create a user account first (or they login via dev auth)
2. Link the team member to that user:

```javascript
{
  "userId": "user-id-from-auth",   // Links to users table
  "departmentId": "dept-id",
  "employeeId": "HA-ADM-001",
  "email": "john@company.com",
  "firstName": "John",
  "lastName": "Admin",
  "role": "admin"
}
```

## 📊 Example Usage Scenarios

### Scenario 1: View all HA Department Members

```bash
GET /api/team-members?departmentId=<ha-department-id>
```

Response:
```json
[
  {
    "id": "member-1",
    "employeeId": "HA-ADM-001",
    "firstName": "John",
    "lastName": "Admin",
    "email": "john@company.com",
    "role": "admin",
    "status": "active"
  },
  {
    "id": "member-2",
    "employeeId": "HA-TEC-001",
    "firstName": "Jane",
    "lastName": "Technician",
    "email": "jane@company.com",
    "role": "technician",
    "status": "active"
  }
]
```

### Scenario 2: Generate Team Report

Query all departments and their members:

```javascript
// Get all departments
const departments = await fetch('/api/departments').then(r => r.json());

// For each department, get members
for (const dept of departments) {
  const members = await fetch(
    `/api/team-members?departmentId=${dept.id}`
  ).then(r => r.json());
  
  console.log(`${dept.name} (${dept.code}): ${members.length} members`);
  console.log(`  Admins: ${members.filter(m => m.role === 'admin').length}`);
  console.log(`  Technicians: ${members.filter(m => m.role === 'technician').length}`);
}
```

## 🎨 UI Integration (Next Steps)

You can create UI pages for:

### 1. **Departments Page** (`/departments`)
- List all departments
- Add/edit/delete departments
- View department statistics

### 2. **Team Members Page** (`/team`)
- List all team members
- Filter by department
- Filter by role (admin/technician)
- Add/edit/delete team members
- Bulk import via CSV

### 3. **Employee Dashboard**
- Show employee details
- Department assignment
- Role and permissions
- Activity history

## 🔄 Integration with Existing Features

### Activity Logs
All department and team member actions are automatically logged:
- `created_department`
- `updated_department`
- `deleted_department`
- `created_team_member`
- `updated_team_member`
- `deleted_team_member`

### Analytics Integration
You can add department-specific analytics:
```javascript
// Get metrics by department
const metrics = await storage.getAnalyticsMetrics();
// Filter by department or team member actions
```

## 💡 Best Practices

### Employee ID Naming Convention:
```
[DEPT_CODE]-[ROLE]-[NUMBER]

Examples:
  HA-ADM-001    (Home Appliances, Admin, #001)
  HA-TEC-001    (Home Appliances, Technician, #001)
  DTV-ADM-001   (Digital TV, Admin, #001)
  HHP-TEC-005   (Handheld Products, Technician, #005)
```

### Status Management:
- Use `"active"` for current employees
- Use `"inactive"` for temporarily unavailable employees
- Delete only when permanently removing records

### Email Requirements:
- Each team member must have a unique email
- Use company email format: `firstname.lastname@company.com`
- Email is used for notifications and login (if userId is linked)

## 🚀 Quick Setup Script

Here's a complete setup script to get you started:

```javascript
// setup-departments.js
async function setupDepartmentsAndTeam() {
  const departments = [
    { name: "Home Appliances", code: "HA", description: "Home appliances division" },
    { name: "Digital TV", code: "DTV", description: "Digital TV and entertainment" },
    { name: "Handheld Products", code: "HHP", description: "Mobile devices division" }
  ];

  // Create departments
  for (const dept of departments) {
    const response = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dept, status: 'active' })
    });
    const created = await response.json();
    console.log(`Created department: ${created.name} (${created.code})`);

    // Add sample team members
    await createTeamMember(created.id, created.code, 'admin', 1);
    await createTeamMember(created.id, created.code, 'technician', 1);
    await createTeamMember(created.id, created.code, 'technician', 2);
  }
}

async function createTeamMember(deptId, deptCode, role, num) {
  const roleCode = role === 'admin' ? 'ADM' : 'TEC';
  const employeeId = `${deptCode}-${roleCode}-${String(num).padStart(3, '0')}`;
  
  const member = {
    departmentId: deptId,
    employeeId: employeeId,
    email: `${employeeId.toLowerCase()}@company.com`,
    firstName: `${roleCode}${num}`,
    lastName: `User`,
    role: role,
    status: 'active'
  };

  const response = await fetch('/api/team-members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member)
  });

  const created = await response.json();
  console.log(`  Added ${role}: ${created.employeeId}`);
}

// Run setup
setupDepartmentsAndTeam();
```

## 📝 Summary

You now have a complete department and team member management system with:

✅ Department structure (HA, DTV, HHP)  
✅ Team member roles (Admin, Technician)  
✅ Employee ID system  
✅ Full CRUD APIs  
✅ Activity logging  
✅ Status management  

## Next Steps

1. **Create the UI pages** for department and team management
2. **Add bulk import** functionality (CSV/Excel)
3. **Generate printable employee cards** with credentials
4. **Add role-based permissions** (restrict features by role)
5. **Create department dashboards** with metrics

Would you like me to help with any of these next steps?
