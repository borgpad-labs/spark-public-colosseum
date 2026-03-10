-- Add additional fields for detailed project information

-- Add categories/tags field (JSON array)
ALTER TABLE agent_projects ADD COLUMN categories TEXT;

-- Add repository URL
ALTER TABLE agent_projects ADD COLUMN repository_url TEXT;

-- Add demo/website URL
ALTER TABLE agent_projects ADD COLUMN demo_url TEXT;

-- Add team members (JSON array)
ALTER TABLE agent_projects ADD COLUMN team_members TEXT;


-- Update existing null values
UPDATE agent_projects
SET categories = '[]',
    repository_url = NULL,
    demo_url = NULL,
    team_members = '[]'
WHERE categories IS NULL;
