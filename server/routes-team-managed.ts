import { Express } from 'express';
import { isAuthenticated } from './devAuth';

export default function registerTeamManagedRoutes(app: Express, storage: any) {
  app.post('/api/team-members/:id/assign-platforms', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params; // team member id
      const { platforms, platformUserIds, roles } = req.body;

      // validate team member exists
      const member = await storage.getTeamMember(id);
      if (!member) return res.status(404).json({ message: 'Team member not found' });

      // upsert managed user linked to this team member
      const managed = await storage.upsertManagedUserForTeamMember(id, {
        platforms: Array.isArray(platforms) ? platforms : [],
        platformUserIds: platformUserIds || {},
        roles: roles || {},
        email: member.email,
        fullName: `${member.firstName} ${member.lastName}`,
      });

      await storage.createActivityLog(
        req.user.claims.sub,
        'assigned_platforms',
        'team_member',
        id,
        Array.isArray(platforms) ? platforms.join(', ') : undefined,
        { assignedTo: member.email, platforms }
      );

      res.json(managed);
    } catch (error) {
      console.error('Error assigning platforms to team member:', error);
      res.status(500).json({ message: 'Failed to assign platforms' });
    }
  });

  // Fetch managed user record for a given team member (if any)
  app.get('/api/team-members/:id/managed-user', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = await storage.getTeamMember(id);
      if (!member) return res.status(404).json({ message: 'Team member not found' });

      const managed = await storage.getManagedUserByTeamMemberId(id);
      res.json(managed || null);
    } catch (error) {
      console.error('Error fetching managed user for team member:', error);
      res.status(500).json({ message: 'Failed to fetch managed user' });
    }
  });
}
