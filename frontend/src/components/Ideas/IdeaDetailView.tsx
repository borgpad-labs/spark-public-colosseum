import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Bell, Share2, ExternalLink, Reply, Loader2, Twitter, ChevronDown, ChevronUp, Lightbulb, DollarSign, Target, Rocket, Trophy, Users as UsersIcon } from "lucide-react";
import { Idea, Comment, UserProfile } from "./types";
import { categoryColors, statusColors } from "./constants";
import { formatTimeAgo } from "./utils";
// Use on-chain vault by default (set VITE_USE_ONCHAIN_VAULT=false to use legacy treasury system)
const USE_ONCHAIN_VAULT = import.meta.env.VITE_USE_ONCHAIN_VAULT !== "false";
import InvestmentSectionLegacy from "./InvestmentSection";
import InvestmentSectionVault from "./InvestmentSectionVault";
const InvestmentSection = USE_ONCHAIN_VAULT ? InvestmentSectionVault : InvestmentSectionLegacy;
import DescriptionRenderer from "./DescriptionRenderer";
import { VotersSection } from "./VotersSection";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface IdeaDetailViewProps {
  idea: Idea;
  comments: Comment[];
  isLoadingComments: boolean;
  onBack: () => void;
  onUpvote: (id: string) => void;
  onDownvote: (id: string) => void;
  onCommentVote: (commentId: string, voteType: 'up' | 'down') => void;
  onSubmitComment: (content: string, parentCommentId?: string) => void;
  onShare: () => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  userProfile: UserProfile;
  commentSortBy: "votes" | "newest" | "oldest";
  setCommentSortBy: (sort: "votes" | "newest" | "oldest") => void;
  onConnectWallet: () => void;
  isConnectingWallet: boolean;
}

// Market Analysis Section with Toggle
function MarketAnalysisSection({ analysis }: { analysis: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-blue-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">Market Analysis by Gemini</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5">
          <MarkdownRenderer content={analysis} />
        </div>
      )}
    </div>
  );
}

export function IdeaDetailView({
  idea,
  comments,
  isLoadingComments,
  onBack,
  onUpvote,
  onDownvote,
  onCommentVote,
  onSubmitComment,
  onShare,
  replyingTo,
  setReplyingTo,
  userProfile,
  commentSortBy,
  setCommentSortBy,
  onConnectWallet,
  isConnectingWallet,
}: IdeaDetailViewProps) {
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const status = statusColors[idea.status];
  const category = categoryColors[idea.category] || categoryColors["AI x Crypto"];
  const voteScore = idea.upvotes - idea.downvotes;

  const handlePostComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onSubmitComment(commentText);
    setCommentText("");
    setIsSubmitting(false);
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onSubmitComment(replyText, parentCommentId);
    setReplyText("");
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  // Render comment with voting (only on parent comments, not replies)
  const renderComment = (c: Comment, isReply = false, depth = 0): JSX.Element => {
    const commentVoteScore = c.upvotes - c.downvotes;
    return (
      <div key={c.id} className="flex gap-3">
        {/* Vote buttons for parent comments only */}
        {!isReply && (
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <button
              onClick={() => onCommentVote(c.id, 'up')}
              disabled={!userProfile.xConnected}
              className={`group/vote flex items-center justify-center w-6 h-6 rounded-t-lg border-t border-l border-r transition-all ${
                c.userVote === 'up'
                  ? "bg-green-500/20 border-green-500/30 text-green-400"
                  : "bg-neutral-800/40 border-white/5 text-neutral-500 hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/10"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={userProfile.xConnected ? "Upvote" : "Connect X to vote"}
            >
              <ThumbsUp className="w-2.5 h-2.5" />
            </button>
            <div className={`w-6 h-5 flex items-center justify-center text-[9px] font-bold border-l border-r border-white/5 ${
              commentVoteScore > 0 ? "text-green-400" : commentVoteScore < 0 ? "text-orange-400" : "text-neutral-500"
            }`}>
              {commentVoteScore}
            </div>
            <button
              onClick={() => onCommentVote(c.id, 'down')}
              disabled={!userProfile.xConnected}
              className={`group/vote flex items-center justify-center w-6 h-6 rounded-b-lg border-b border-l border-r transition-all ${
                c.userVote === 'down'
                  ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                  : "bg-neutral-800/40 border-white/5 text-neutral-500 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={userProfile.xConnected ? "Downvote" : "Connect X to vote"}
            >
              <ThumbsDown className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Link to={`/profile/${c.authorUsername}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <img src={c.authorAvatar} alt={c.authorUsername} className="w-5 h-5 rounded-full bg-neutral-800" />
              <span className="text-xs font-medium text-blue-400">@{c.authorUsername}</span>
            </Link>
            {c.authorInvestment && c.authorInvestment > 0 && (
              <span className="text-[10px] font-medium text-emerald-400">
                ${c.authorInvestment.toLocaleString(undefined, { maximumFractionDigits: 0 })} invested
              </span>
            )}
            <span className="text-[10px] text-neutral-500">{formatTimeAgo(c.createdAt)}</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed mb-2">{c.content}</p>
          <button
            onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
            disabled={!userProfile.xConnected}
            className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>

          {/* Reply Input */}
          {replyingTo === c.id && userProfile.xConnected && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${c.authorUsername}...`}
                className="flex-1 px-3 py-2 bg-neutral-900/50 border border-white/10 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostReply(c.id);
                  }
                }}
              />
              <button
                onClick={() => handlePostReply(c.id)}
                disabled={!replyText.trim() || isSubmitting}
                className="px-3 py-2 bg-white text-black text-[10px] font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Reply"}
              </button>
            </div>
          )}

          {/* Nested Replies */}
          {c.replies && c.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-white/5 pl-4" style={{ marginLeft: `${(depth + 1) * 1}rem` }}>
              {c.replies.map((reply) => renderComment(reply, true, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to all ideas
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="col-span-1 md:col-span-8 lg:col-span-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
              <button
                onClick={() => onUpvote(idea.id)}
                className={`group/vote flex items-center justify-center w-10 h-10 rounded-t-xl border-t border-l border-r transition-all ${
                  idea.userVote === 'up'
                    ? "bg-green-500/20 border-green-500/30 text-green-400"
                    : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/10"
                }`}
              >
                <ThumbsUp className={`w-4 h-4 transition-transform ${idea.userVote !== 'up' ? "group-hover/vote:-translate-y-0.5" : ""}`} />
              </button>
              <div className={`w-10 h-8 flex items-center justify-center text-sm font-bold border-l border-r border-white/5 ${
                voteScore > 0 ? "text-green-400" : voteScore < 0 ? "text-orange-400" : "text-neutral-400"
              }`}>
                {voteScore}
              </div>
              <button
                onClick={() => onDownvote(idea.id)}
                className={`group/vote flex items-center justify-center w-10 h-10 rounded-b-xl border-b border-l border-r transition-all ${
                  idea.userVote === 'down'
                    ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                    : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10"
                }`}
              >
                <ThumbsDown className={`w-4 h-4 transition-transform ${idea.userVote !== 'down' ? "group-hover/vote:translate-y-0.5" : ""}`} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-white mb-2">{idea.title}</h1>
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <Link to={`/profile/${idea.authorUsername}`} className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                  <img src={idea.authorAvatar} alt={idea.authorUsername} className="w-5 h-5 rounded-full bg-neutral-800" />
                  <span>@{idea.authorUsername}</span>
                </Link>
                <span>•</span>
                <span>{formatTimeAgo(idea.createdAt)}</span>
                {idea.tweetUrl && (
                  <>
                    <span>•</span>
                    <a href={idea.tweetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                      <Twitter className="w-3 h-3" />
                      View Tweet
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description and Image */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DescriptionRenderer description={idea.description} />
            </div>
            {/* Generated Image */}
            {idea.generatedImageUrl && (
              <div className="lg:col-span-1">
                <div className="rounded-xl overflow-hidden border border-white/5">
                  <img
                    src={idea.generatedImageUrl}
                    alt={idea.title}
                    className="w-full h-auto object-cover"
                    onLoad={() => {
                      console.log("✅ [FRONTEND] Image loaded successfully:", idea.generatedImageUrl);
                    }}
                    onError={(e) => {
                      console.error("❌ [FRONTEND] Image failed to load:", {
                        url: idea.generatedImageUrl,
                        ideaId: idea.id,
                        ideaTitle: idea.title,
                        error: e,
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Market Analysis */}
          {idea.marketAnalysis && (
            <MarketAnalysisSection analysis={idea.marketAnalysis} />
          )}

          {/* Timeline */}
          {idea.estimatedPrice && idea.estimatedPrice > 0 && (() => {
            const raised = idea.raisedAmount || 0;
            const goal = idea.estimatedPrice || 0;
            const capReached = raised >= goal && goal > 0;
            const capReachedAt = idea.capReachedAt ? new Date(idea.capReachedAt) : null;
            const capDeadlinePassed = capReachedAt ? new Date() > new Date(capReachedAt.getTime() + 48 * 60 * 60 * 1000) : false;

            // Determine current step (0-indexed)
            // 0: Idea Created (always done)
            // 1: Start Funding (done if raised > 0)
            // 2: Funding Reached - open 72h (done if cap reached)
            // 3: Launch Token (done if cap deadline passed)
            // 4: Start Hackathon (future)
            // 5: End Hackathon - Market decides (future)
            let currentStep = 0;
            if (raised > 0) currentStep = 1;
            if (capReached) currentStep = 2;
            if (capDeadlinePassed) currentStep = 3;
            // Manual override via timeline_phase column
            if (idea.timelinePhase != null) currentStep = idea.timelinePhase;

            const steps = [
              {
                icon: Lightbulb,
                title: "Idea Created",
                description: "Submitted by the community",
                color: "orange",
              },
              {
                icon: DollarSign,
                title: "Start Funding",
                description: "USDC deposits open",
                color: "orange",
              },
              {
                icon: Target,
                title: "Funding Reached",
                description: "Open for 48h more",
                color: "orange",
              },
              {
                icon: Rocket,
                title: "Token Launch",
                description: "≈24h after raise (Meteora) / Treasury in Squads",
                color: "orange",
              },
              {
                icon: Trophy,
                title: "Hackathon Starts",
                description: "≈24h after token launch",
                color: "orange",
              },
              {
                icon: UsersIcon,
                title: "Market Decides",
                description: "5-10 days — Futarchy decides who builds",
                color: "orange",
              },
            ];

            const colorMap: Record<string, { bg: string; border: string; text: string; dot: string; line: string }> = {
              orange: { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-400", dot: "bg-orange-500", line: "from-orange-500" },
              emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-500", line: "from-emerald-500" },
              blue: { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-500", line: "from-blue-500" },
              purple: { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-400", dot: "bg-purple-500", line: "from-purple-500" },
              cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-400", dot: "bg-cyan-500", line: "from-cyan-500" },
              pink: { bg: "bg-pink-500/20", border: "border-pink-500/40", text: "text-pink-400", dot: "bg-pink-500", line: "from-pink-500" },
            };

            return (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-white mb-4">Timeline</h3>
                {/* Desktop */}
                <div className="hidden md:block relative">
                  {/* Progress bar background — positioned below the icons (top of icon is 0, icon is 40px, bar at 48px) */}
                  <div className="absolute left-0 right-0 h-1 bg-neutral-800 rounded-full" style={{ top: '48px' }} />
                  {/* Progress bar filled */}
                  <div
                    className="absolute left-0 h-1 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-all duration-700 overflow-hidden"
                    style={{ top: '48px', width: `${Math.min(100, ((currentStep + 0.5) / steps.length) * 100)}%` }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 60%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                  <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

                  <div className="relative flex justify-between">
                    {steps.map((step, i) => {
                      const done = i <= currentStep;
                      const active = i === currentStep;
                      const colors = colorMap[step.color];
                      const Icon = step.icon;
                      return (
                        <div key={i} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                          {/* Dot */}
                          <div
                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                              active
                                ? `${colors.bg} ${colors.border} ${colors.text}`
                                : done
                                ? `${colors.bg} ${colors.border} ${colors.text}`
                                : "bg-neutral-900 border-neutral-700 text-neutral-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {/* Label */}
                          <p className={`mt-4 text-[10px] font-semibold text-center leading-tight ${
                            done ? "text-white" : "text-neutral-600"
                          }`}>
                            {step.title}
                          </p>
                          <p className={`mt-0.5 text-[9px] text-center leading-tight max-w-[100px] ${
                            done ? "text-neutral-400" : "text-neutral-700"
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile - vertical */}
                <div className="md:hidden space-y-0">
                  {steps.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    const colors = colorMap[step.color];
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              active
                                ? `${colors.bg} ${colors.border} ${colors.text}`
                                : done
                                ? `${colors.bg} ${colors.border} ${colors.text}`
                                : "bg-neutral-900 border-neutral-700 text-neutral-600"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`w-0.5 h-8 ${done ? "bg-neutral-600" : "bg-neutral-800"}`} />
                          )}
                        </div>
                        <div className="pt-1">
                          <p className={`text-xs font-semibold ${done ? "text-white" : "text-neutral-600"}`}>
                            {step.title}
                            {active && <span className="ml-2 text-[9px] font-normal text-orange-400">(current)</span>}
                          </p>
                          <p className={`text-[10px] ${done ? "text-neutral-400" : "text-neutral-700"}`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Comments Section */}
          <div className="border-t border-white/5 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-medium text-white">Discussion ({comments.length})</h3>
              </div>
              
              {/* Sort Options */}
              <div className="flex items-center gap-1 bg-neutral-900/30 border border-white/5 rounded-lg p-0.5">
                {(["votes", "newest", "oldest"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setCommentSortBy(sort)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                      commentSortBy === sort
                        ? "bg-white/10 text-white"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {sort === "votes" ? "Top Voted" : sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Comment */}
            <div className="mb-6">
              <div className="relative">
                {!userProfile.xConnected ? (
                  <div className="p-4 bg-neutral-900/30 border border-white/10 rounded-lg text-center">
                    <p className="text-xs text-neutral-400 mb-2">Connect your X account to comment</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full p-3 bg-neutral-900/30 border border-white/10 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/30 transition-all resize-none block"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <button 
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || isSubmitting}
                        className="px-3 py-1 bg-white text-black text-[10px] font-semibold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Loading Comments */}
            {isLoadingComments && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                <span className="ml-2 text-xs text-neutral-400">Loading comments...</span>
              </div>
            )}

            {/* Thread */}
            {!isLoadingComments && (
              <div className="space-y-6">
                {comments.length === 0 && (
                  <p className="text-xs text-neutral-500 text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                )}

                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    {renderComment(comment, false, 0)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Sidebar */}
        <aside className="col-span-1 md:col-span-4 lg:col-span-4 space-y-6">
          {/* Investment Section */}
          {idea.estimatedPrice && idea.estimatedPrice > 0 && (
            <InvestmentSection 
              idea={idea}
              userProfile={userProfile}
              onConnectWallet={onConnectWallet}
              isConnectingWallet={isConnectingWallet}
            />
          )}

          {/* Status Card */}
          <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/5">
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Status</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full border ${status.dot} ${idea.status === "in_progress" ? "animate-pulse" : ""}`} />
                  <span className={`text-xs font-medium ${status.text}`}>
                    {idea.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Category</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ${category.bg} ${category.text} ${category.border} border`}>
                  {idea.category}
                </span>
              </div>
            </div>
          </div>

          {/* Voters Section */}
          <VotersSection ideaId={idea.id} />

          {/* Actions */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-lg transition-colors group">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" />
                Subscribe to updates
              </div>
            </button>
            <button 
              onClick={onShare}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" />
                Share idea
              </div>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default IdeaDetailView;
