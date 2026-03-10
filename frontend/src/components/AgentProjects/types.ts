// File: components/AgentProjects/types.ts
// TypeScript types for Agent Projects feature

export interface AgentProject {
  id: string;
  title: string;
  slug: string;
  description: string;
  team_name: string;
  status: "Draft" | "Published";

  // Colosseum votes (read-only)
  human_votes: number;
  agent_votes: number;
  total_votes: number;

  // Spark platform votes (interactive)
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;

  // Investment
  estimated_price?: number;
  raised_amount?: number;
  treasury_wallet?: string;

  // Metadata
  colosseum_url: string;
  colosseum_project_id: string;
  generated_image_url?: string;
  market_analysis?: string;
  comments_count?: number;
  created_at: string;
  scraped_at: string;
  updated_at: string;
  /** JSON array of category strings from Colosseum */
  categories?: string[];
}

export interface AgentProjectComment {
  id: string;
  project_id: string;
  parent_comment_id?: string;
  content: string;
  author_username: string;
  author_avatar?: string;
  author_twitter_id?: string;
  author_investment?: number;
  is_team: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  replies?: AgentProjectComment[];
  userVote?: 'up' | 'down' | null;
}

export interface AgentProjectInvestment {
  id: string;
  project_id: string;
  investor_wallet: string;
  amount_usdc: number;
  status: 'active' | 'claimed' | 'refunded';
  transaction_signature?: string;
  created_at: string;
}

export interface AgentProjectFilters {
  status?: "Draft" | "Published" | "all";
  sortBy?: "votes" | "newest" | "oldest" | "raised" | "colosseum_votes" | "downvotes";
  limit?: number;
  offset?: number;
}

export interface AgentProjectsResponse {
  projects: AgentProject[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface VoteResponse {
  success: boolean;
  action: "voted" | "unvoted" | "changed";
  voteType: 'up' | 'down' | null;
}
