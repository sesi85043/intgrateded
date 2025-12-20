# Tiered Support System - Implementation Guide

## Overview

The Admin Hub implements a tiered support architecture where:
- **Parent Email** (support@allelectronics.co.za) - Messages go to ALL staff
- **Department Emails** (ha@, hhp@, dtv@) - Messages only visible to that department's team

## Current Setup

### Teams Created (via seed)

| Team Name | Code | Type | Email Address | Who Sees It |
|-----------|------|------|---------------|-------------|
| All Staff | all_staff | all_staff | support@allelectronics.co.za | Everyone |
| Home Appliances Team | ha_team | department | ha@allelectronics.co.za | HA staff only |
| Home Entertainment Products Team | hhp_team | department | hhp@allelectronics.co.za | HHP staff only |
| Digital Television Team | dtv_team | department | dtv@allelectronics.co.za | DTV staff only |

### Default Admin Account

- **Email**: admin@company.com
- **Password**: admin123
- **Role**: Management (full access to all teams)

---

## API Endpoints

### Authentication

```
POST /api/auth/login
Body: { email: string, password: string }
Response: { user: TeamMember, message: "Login successful" }

POST /api/auth/logout
Response: { message: "Logged out" }

GET /api/auth/me
Response: TeamMember object (current logged-in user)
```

### Teams Management

```
GET /api/teams
- Returns all teams
- Requires: Authenticated user

GET /api/teams/:id
- Get single team by ID
- Requires: Authenticated user

POST /api/teams
- Create new team
- Requires: Management role
- Body: { name, code, description, teamType, departmentId?, emailAddress?, isDefault? }

PATCH /api/teams/:id
- Update team
- Requires: Management role

DELETE /api/teams/:id
- Delete team
- Requires: Management role
```

### Team Membership

```
GET /api/teams/:id/members
- Get all members in a specific team
- Requires: Authenticated user

POST /api/teams/:teamId/members/:memberId
- Add a staff member to a team
- Requires: Department Admin or higher

DELETE /api/teams/:teamId/members/:memberId
- Remove a staff member from a team
- Requires: Department Admin or higher
```

### User's Own Teams

```
GET /api/my-teams
- Get all teams the logged-in user belongs to
- Use for: Filtering messages by team membership

GET /api/my-team-ids
- Get just the team IDs (optimized for filtering)
- Use for: Quick lookups when fetching messages

GET /api/team-members/:id/teams
- Get teams for a specific staff member
- Use for: Admin viewing another user's team assignments
```

---

## How to Use the System

### Step 1: Chatwoot Configuration (Required)

Before Admin Hub can route messages, you must configure Chatwoot:

1. **Create Chatwoot Inboxes** (one per email):
   - "General Support" inbox → connect to support@allelectronics.co.za
   - "HA Direct" inbox → connect to ha@allelectronics.co.za
   - "HHP Direct" inbox → connect to hhp@allelectronics.co.za
   - "DTV Direct" inbox → connect to dtv@allelectronics.co.za

2. **Create Chatwoot Teams** (matching your Admin Hub teams):
   - "All Staff" team → assign to General Support inbox
   - "HA Team" → assign to HA Direct inbox
   - "HHP Team" → assign to HHP Direct inbox
   - "DTV Team" → assign to DTV Direct inbox

3. **Link Chatwoot IDs to Admin Hub**:
   Update the teams table with Chatwoot team/inbox IDs:
   ```
   PATCH /api/teams/:id
   Body: { chatwootTeamId: 1, chatwootInboxId: 1 }
   ```

### Step 2: Staff Registration Flow

When new staff register:

1. Staff fills registration form at `/register`
2. Registration goes to "pending" status
3. Management receives notification
4. Management approves with OTP verification
5. On approval:
   - Staff gets `isVerified = true`
   - Auto-joined to "All Staff" team
   - Auto-joined to their department's team
   - Optional: Auto-provisioned in Mailcow + Chatwoot

### Step 3: Fetching Messages for a User

When displaying messages in your frontend:

```typescript
// 1. Get user's team IDs
const response = await fetch('/api/my-team-ids');
const teamIds = await response.json();
// Example: ['uuid-all-staff', 'uuid-ha-team']

// 2. Fetch messages from Chatwoot filtered by teams
// Option A: Use Chatwoot team IDs stored in your teams
const teamsResponse = await fetch('/api/my-teams');
const teams = await teamsResponse.json();
const chatwootTeamIds = teams.map(t => t.chatwootTeamId).filter(Boolean);

// 3. Query Chatwoot API for conversations
// GET /api/v1/accounts/{account_id}/conversations?team_id={chatwootTeamIds.join(',')}

// 4. Display only messages where teamId is in user's teams
```

### Step 4: Message Visibility Logic

```typescript
// Pseudo-code for your message display component
async function getVisibleMessages(userId: string) {
  // Get user's team IDs from Admin Hub
  const teamIds = await fetch('/api/my-team-ids').then(r => r.json());
  
  // Fetch all conversations from Chatwoot
  const allConversations = await fetchChatwootConversations();
  
  // Filter to only show messages for user's teams
  const visibleMessages = allConversations.filter(conv => 
    teamIds.includes(conv.teamId) || conv.teamId === null
  );
  
  return visibleMessages;
}
```

---

## Database Schema

### teams table
```sql
id              VARCHAR PRIMARY KEY
name            VARCHAR(100) NOT NULL UNIQUE
code            VARCHAR(30) NOT NULL UNIQUE
description     TEXT
team_type       VARCHAR(30) -- 'all_staff', 'department', 'custom'
department_id   VARCHAR (FK to departments)
chatwoot_team_id    INTEGER  -- Chatwoot team ID
chatwoot_inbox_id   INTEGER  -- Chatwoot inbox ID
email_address   VARCHAR      -- Email for this team
is_default      BOOLEAN      -- If true, new staff auto-join
status          VARCHAR(20)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### team_member_teams table (junction)
```sql
id              VARCHAR PRIMARY KEY
team_member_id  VARCHAR NOT NULL (FK to team_members)
team_id         VARCHAR NOT NULL (FK to teams)
added_at        TIMESTAMP
added_by_id     VARCHAR (FK to team_members)
is_active       BOOLEAN DEFAULT true
```

---

## Storage Methods Available

```typescript
// Get all teams
storage.getAllTeams(): Promise<Team[]>

// Get specific team
storage.getTeam(id: string): Promise<Team | undefined>
storage.getTeamByCode(code: string): Promise<Team | undefined>

// Create/Update/Delete teams
storage.createTeam(team: InsertTeam): Promise<Team>
storage.updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team>
storage.deleteTeam(id: string): Promise<void>

// Team membership
storage.getTeamsForMember(teamMemberId: string): Promise<Team[]>
storage.getTeamIdsForMember(teamMemberId: string): Promise<string[]>
storage.getMembersInTeam(teamId: string): Promise<TeamMember[]>
storage.addMemberToTeam(teamMemberId: string, teamId: string, addedById?: string): Promise<TeamMemberTeam>
storage.removeMemberFromTeam(teamMemberId: string, teamId: string): Promise<void>
storage.isMemberInTeam(teamMemberId: string, teamId: string): Promise<boolean>

// Default teams
storage.getDefaultTeams(): Promise<Team[]>
storage.autoJoinDefaultTeams(teamMemberId: string): Promise<void>
storage.getTeamsByDepartment(departmentId: string): Promise<Team[]>
```

---

## Example Scenarios

### Scenario A: John (Works in HA Department)

**John's Teams**: All Staff + HA Team

**What John sees**:
- Emails to support@ (via All Staff membership)
- Emails to ha@ (via HA Team membership)
- Does NOT see emails to hhp@ or dtv@

### Scenario B: Sarah (Works in HHP Department)

**Sarah's Teams**: All Staff + HHP Team

**What Sarah sees**:
- Emails to support@ (via All Staff membership)
- Emails to hhp@ (via HHP Team membership)
- Does NOT see emails to ha@ or dtv@

### Scenario C: Admin (Management Role)

**Admin's Teams**: All Staff + HA + HHP + DTV

**What Admin sees**:
- ALL emails from all sources

---

## Integration Checklist

- [ ] Chatwoot inboxes created for each email address
- [ ] Chatwoot teams created and assigned to inboxes
- [ ] Admin Hub teams updated with chatwootTeamId and chatwootInboxId
- [ ] Staff registration form working
- [ ] Approval flow with OTP working
- [ ] Auto-join to default teams on approval
- [ ] Frontend message display filtering by team membership
- [ ] Reply functionality sending through Chatwoot API

---

## Next Steps

1. **Build Chatwoot Integration**: Connect to Chatwoot API to fetch/send messages
2. **Build Message UI**: Create the inbox view filtered by user's teams
3. **Add Real-time Updates**: WebSocket or polling for new messages
4. **Build Reply Interface**: Allow staff to reply through Admin Hub
