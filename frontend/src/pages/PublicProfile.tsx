import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Twitter, ThumbsUp, ThumbsDown, Lightbulb, ExternalLink, Loader2 } from "lucide-react";
import { backendSparkApi, IdeaModel, IdeaVoteModel } from "@/data/api/backendSparkApi";

// Category colors - same as in Ideas.tsx
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  "AI x Crypto": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  "Consumer Apps": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  "DAO Tooling & Governance": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  "DeFi": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  "Gaming": { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  "Identity & Reputation": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  "Infrastructure": { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  "Payments & Fintech": { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  "Robotic": { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  "RWA": { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  "WEB2": { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
};

interface PublicIdea {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  upvotes: number;
  downvotes: number;
  commentsCount: number;
  createdAt: string;
}

interface PublicVote {
  ideaId: string;
  ideaTitle: string;
  ideaSlug: string;
  ideaCategory: string;
  voteType: 'up' | 'down';
  createdAt: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ideas' | 'votes'>('ideas');
  const [ideas, setIdeas] = useState<PublicIdea[]>([]);
  const [votes, setVotes] = useState<PublicVote[]>([]);
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string } | null>(null);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (username) {
      fetchUserProfile(username);
      fetchUserIdeas(username);
      fetchUserVotes(username);
    }
  }, [username]);

  const fetchUserProfile = async (username: string) => {
    setIsLoadingProfile(true);
    try {
      const response = await fetch(`/api/twitter-users?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUserProfile({
            name: data.user.name,
            avatar: data.user.profile_image_url || `https://unavatar.io/twitter/${username}`
          });
        } else {
          setUserProfile({
            avatar: `https://unavatar.io/twitter/${username}`
          });
        }
      } else {
        setUserProfile({
          avatar: `https://unavatar.io/twitter/${username}`
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setUserProfile({
        avatar: `https://unavatar.io/twitter/${username}`
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchUserIdeas = async (authorUsername: string) => {
    setIsLoadingIdeas(true);
    try {
      const response = await backendSparkApi.getIdeas({ authorUsername });
      const mappedIdeas: PublicIdea[] = response.ideas.map((idea: IdeaModel) => ({
        id: idea.id,
        title: idea.title,
        slug: idea.slug,
        description: idea.description,
        category: idea.category,
        upvotes: idea.upvotes || 0,
        downvotes: idea.downvotes || 0,
        commentsCount: idea.comments_count || 0,
        createdAt: idea.created_at,
      }));
      setIdeas(mappedIdeas);
    } catch (error) {
      console.error("Failed to fetch user ideas:", error);
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const fetchUserVotes = async (voterUsername: string) => {
    setIsLoadingVotes(true);
    try {
      const response = await backendSparkApi.getUserVotes(voterUsername);
      const mappedVotes: PublicVote[] = response.votes.map((vote: IdeaVoteModel) => ({
        ideaId: vote.idea_id,
        ideaTitle: vote.idea_title || "Unknown Idea",
        ideaSlug: vote.idea_slug || "",
        ideaCategory: vote.idea_category || "Unknown",
        voteType: vote.vote_type,
        createdAt: vote.created_at,
      }));
      setVotes(mappedVotes);
    } catch (error) {
      console.error("Failed to fetch user votes:", error);
    } finally {
      setIsLoadingVotes(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const upvotesCount = votes.filter(v => v.voteType === 'up').length;
  const downvotesCount = votes.filter(v => v.voteType === 'down').length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,80,255,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_20%,rgba(255,100,50,0.08),transparent)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-black/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <Link to="/" className="flex items-center gap-2">
            <img src="/sparklogo.png" alt="Spark" className="h-6" />
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-20 max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {isLoadingProfile ? (
              <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-white/10 animate-pulse" />
            ) : (
              <img
                src={userProfile?.avatar || `https://unavatar.io/twitter/${username}`}
                alt={username}
                className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-white/10"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {userProfile?.name || `@${username}`}
              </h1>
              <p className="text-sm text-neutral-400 mb-1">@{username}</p>
              <a
                href={`https://x.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Twitter className="w-4 h-4" />
                View on X
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-orange-400" />
              <span className="text-white font-medium">{ideas.length}</span>
              <span className="text-neutral-400">Ideas</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-400" />
              <span className="text-white font-medium">{upvotesCount}</span>
              <span className="text-neutral-400">Upvotes</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-400" />
              <span className="text-white font-medium">{downvotesCount}</span>
              <span className="text-neutral-400">Downvotes</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/5">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ideas'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ideas ({ideas.length})
          </button>
          <button
            onClick={() => setActiveTab('votes')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'votes'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vote History ({votes.length})
          </button>
        </div>

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="space-y-4">
            {isLoadingIdeas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                <span className="ml-2 text-neutral-400">Loading ideas...</span>
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-12">
                <Lightbulb className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-400">No ideas submitted yet</p>
              </div>
            ) : (
              ideas.map((idea) => {
                const category = categoryColors[idea.category] || categoryColors["AI x Crypto"];
                const voteScore = idea.upvotes - idea.downvotes;
                return (
                  <Link
                    key={idea.id}
                    to={`/ideas/${idea.slug}`}
                    className="block p-4 rounded-xl bg-neutral-900/30 border border-white/5 hover:border-white/10 hover:bg-neutral-900/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        voteScore > 0 ? 'bg-green-500/10 text-green-400' : voteScore < 0 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {voteScore > 0 ? '+' : ''}{voteScore}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-white mb-1">{idea.title}</h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-2">{idea.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                          <span className={`px-1.5 py-0.5 rounded ${category.bg} ${category.text} ${category.border} border`}>
                            {idea.category}
                          </span>
                          <span>{formatTimeAgo(idea.createdAt)}</span>
                          <span>{idea.commentsCount} comments</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div className="space-y-3">
            {isLoadingVotes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                <span className="ml-2 text-neutral-400">Loading votes...</span>
              </div>
            ) : votes.length === 0 ? (
              <div className="text-center py-12">
                <ThumbsUp className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-400">No votes yet</p>
              </div>
            ) : (
              votes.map((vote, index) => {
                const category = categoryColors[vote.ideaCategory] || categoryColors["AI x Crypto"];
                return (
                  <Link
                    key={`${vote.ideaId}-${index}`}
                    to={`/ideas/${vote.ideaSlug}`}
                    className="flex items-center gap-4 p-3 rounded-lg bg-neutral-900/30 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      vote.voteType === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {vote.voteType === 'up' ? (
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{vote.ideaTitle}</p>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <span className={`px-1 py-0.5 rounded ${category.bg} ${category.text}`}>
                          {vote.ideaCategory}
                        </span>
                        <span>{formatTimeAgo(vote.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${
                      vote.voteType === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {vote.voteType === 'up' ? 'Upvoted' : 'Downvoted'}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
