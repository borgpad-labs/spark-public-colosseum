// Ideas Feature Types

export interface UserProfile {
  xId?: string;
  xUsername?: string;
  xName?: string;
  xAvatar?: string;
  xConnected: boolean;
  walletAddress?: string;
  walletConnected: boolean;
}

export interface Idea {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  authorUsername: string;
  authorAvatar: string;
  authorTwitterId?: string;
  source: "user" | "twitter";
  tweetUrl?: string;
  tweetContent?: string;
  estimatedPrice?: number;
  raisedAmount?: number;
  capReachedAt?: string;
  commentsCount: number;
  createdAt: string;
  status: "pending" | "in_progress" | "completed" | "planned";
  generatedImageUrl?: string;
  marketAnalysis?: string;
  tokenAddress?: string;
  timelinePhase?: number;
}

export interface Comment {
  id: string;
  ideaId: string;
  parentCommentId?: string;
  authorUsername: string;
  authorAvatar: string;
  authorTwitterId?: string;
  content: string;
  isTeam: boolean;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  authorInvestment?: number; // Total USDC invested by this user in the idea
  replies?: Comment[];
}

export interface BuilderTeam {
  id: string;
  name: string;
  description: string;
  logo?: string;
  twitter?: string;
  website?: string;
  buildersCount: number;
  totalEarned: string;
  focus: string[];
  availability: "Available" | "Busy" | "Not Available";
  experience: string[];
}

export interface Investment {
  id: string;
  ideaId: string;
  investorWallet: string;
  amountUsdc: number;
  status: 'active' | 'claimed' | 'refunded';
  transactionSignature?: string;
  createdAt: string;
}

export type UserVotes = Record<string, 'up' | 'down'>;
export type UserCommentVotes = Record<string, 'up' | 'down'>;
export type ViewType = "ideas" | "idea-detail" | "agents" | "teams" | "explanation" | "roadmap" | "profile";
export type SortOption = "votes" | "newest" | "oldest" | "raised";

export interface DailyVoteTracker {
  date: string;
  count: number;
}

export interface NewIdeaForm {
  idea: string;
  category: string;
  problem: string;
  solution: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  why?: string;
  marketSize?: string;
  competitors?: string;
}
