import { Express } from 'express';
import { isTeamMemberAuthenticated } from './auth';
import { requireRoleOrHigher } from './rbac';
import { ROLE_TYPES, insertTeamSchema } from '@shared/schema';

export default function registerTeamRoutes(app: Express, storage: any) {
  
  app.get('/api/teams', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });

  app.get('/api/teams/:id', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const team = await storage.getTeam(id);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ message: 'Failed to fetch team' });
    }
  });

  app.post('/api/teams', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      
      await storage.createActivityLog(
        req.teamMember.id,
        'created_team',
        'team',
        team.id,
        undefined,
        { teamName: team.name, teamCode: team.code }
      );
      
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(400).json({ message: 'Failed to create team' });
    }
  });

  app.patch('/api/teams/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(id, validatedData);
      
      await storage.createActivityLog(
        req.teamMember.id,
        'updated_team',
        'team',
        id,
        undefined,
        { updates: validatedData }
      );
      
      res.json(team);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(400).json({ message: 'Failed to update team' });
    }
  });

  app.delete('/api/teams/:id', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.MANAGEMENT), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTeam(id);
      
      await storage.createActivityLog(
        req.teamMember.id,
        'deleted_team',
        'team',
        id
      );
      
      res.json({ message: 'Team deleted' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(400).json({ message: 'Failed to delete team' });
    }
  });

  app.get('/api/teams/:id/members', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const members = await storage.getMembersInTeam(id);
      const sanitized = members.map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        departmentId: m.departmentId,
        role: m.role,
        status: m.status,
      }));
      res.json(sanitized);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  app.post('/api/teams/:teamId/members/:memberId', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.DEPARTMENT_ADMIN), async (req: any, res) => {
    try {
      const { teamId, memberId } = req.params;
      const membership = await storage.addMemberToTeam(memberId, teamId, req.teamMember.id);
      
      await storage.createActivityLog(
        req.teamMember.id,
        'added_member_to_team',
        'team_member_teams',
        membership.id,
        undefined,
        { teamId, memberId }
      );
      
      res.status(201).json(membership);
    } catch (error) {
      console.error('Error adding member to team:', error);
      res.status(400).json({ message: 'Failed to add member to team' });
    }
  });

  app.delete('/api/teams/:teamId/members/:memberId', isTeamMemberAuthenticated, requireRoleOrHigher(ROLE_TYPES.DEPARTMENT_ADMIN), async (req: any, res) => {
    try {
      const { teamId, memberId } = req.params;
      await storage.removeMemberFromTeam(memberId, teamId);
      
      await storage.createActivityLog(
        req.teamMember.id,
        'removed_member_from_team',
        'team_member_teams',
        undefined,
        undefined,
        { teamId, memberId }
      );
      
      res.json({ message: 'Member removed from team' });
    } catch (error) {
      console.error('Error removing member from team:', error);
      res.status(400).json({ message: 'Failed to remove member from team' });
    }
  });

  app.get('/api/my-teams', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const memberTeams = await storage.getTeamsForMember(member.id);
      res.json(memberTeams);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ message: 'Failed to fetch your teams' });
    }
  });

  app.get('/api/my-team-ids', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const member = req.teamMember;
      const teamIds = await storage.getTeamIdsForMember(member.id);
      res.json(teamIds);
    } catch (error) {
      console.error('Error fetching user team IDs:', error);
      res.status(500).json({ message: 'Failed to fetch your team IDs' });
    }
  });

  app.get('/api/team-members/:id/teams', isTeamMemberAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const memberTeams = await storage.getTeamsForMember(id);
      res.json(memberTeams);
    } catch (error) {
      console.error('Error fetching member teams:', error);
      res.status(500).json({ message: 'Failed to fetch member teams' });
    }
  });
}
