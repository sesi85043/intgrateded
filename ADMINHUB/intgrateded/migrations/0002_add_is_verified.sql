-- Add is_verified column to team_members table for manual admin approval workflow
ALTER TABLE "team_members" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;
