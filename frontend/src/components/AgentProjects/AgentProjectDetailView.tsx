// AgentProjectDetailView - same layout as IdeaDetailView (grid + sidebar, vote, invest, comments)

import React, { useState } from "react";
import { ArrowLeft, ExternalLink, ThumbsUp, ThumbsDown, User, Bot, Users } from "lucide-react";
import { AgentProject, AgentProjectComment } from "./types";
import { InvestmentSectionVault } from "./InvestmentSectionVault";
import type { UserProfile } from "../Ideas";
import { categoryColors } from "../Ideas/constants";

interface AgentProjectDetailViewProps {
  project: AgentProject;
  comments: AgentProjectComment[];
  onBack: () => void;
  onVote: (projectId: string, action: "upvote" | "downvote") => void;
  onCommentSubmit: (content: string, parentId?: string) => void;
  onCommentVote: (commentId: string, action: "upvote" | "downvote") => void;
  userProfile: UserProfile;
  onConnectWallet: () => void;
  isConnectingWallet: boolean;
}

function getCategoryStyle(category: string) {
  return categoryColors[category] || {
    bg: "bg-neutral-500/10",
    text: "text-neutral-400",
    border: "border-neutral-500/20",
  };
}

export function AgentProjectDetailView({
  project,
  comments,
  onBack,
  onVote,
  onCommentSubmit,
  onCommentVote,
  userProfile,
  onConnectWallet,
  isConnectingWallet,
}: AgentProjectDetailViewProps) {
  const [commentContent, setCommentContent] = useState("");
  const voteScore = (project.upvotes || 0) - (project.downvotes || 0);
  const categories = Array.isArray(project.categories) ? project.categories : (typeof project.categories === "string" ? (() => { try { return JSON.parse(project.categories); } catch { return []; } })() : []);
  const primaryCategory = categories[0] || "—";
  const categoryStyle = getCategoryStyle(primaryCategory);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.trim()) {
      onCommentSubmit(commentContent);
      setCommentContent("");
    }
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to all projects
      </button>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="col-span-1 md:col-span-8 lg:col-span-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
              <button
                onClick={() => onVote(project.id, "upvote")}
                className={`group/vote flex items-center justify-center w-10 h-10 rounded-t-xl border-t border-l border-r transition-all ${
                  project.userVote === "up"
                    ? "bg-green-500/20 border-green-500/30 text-green-400"
                    : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/10"
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${project.userVote !== "up" ? "group-hover/vote:-translate-y-0.5" : ""}`} />
              </button>
              <div
                className={`w-10 h-8 flex items-center justify-center text-sm font-bold border-l border-r border-white/5 ${
                  voteScore > 0 ? "text-green-400" : voteScore < 0 ? "text-orange-400" : "text-neutral-400"
                }`}
              >
                {voteScore}
              </div>
              <button
                onClick={() => onVote(project.id, "downvote")}
                className={`group/vote flex items-center justify-center w-10 h-10 rounded-b-xl border-b border-l border-r transition-all ${
                  project.userVote === "down"
                    ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                    : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10"
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${project.userVote !== "down" ? "group-hover/vote:translate-y-0.5" : ""}`} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-white mb-2">{project.title}</h1>
              <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{project.team_name}</span>
                </div>
                <span>•</span>
                <a
                  href={project.colosseum_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Colosseum
                </a>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
          </div>

          <div className="flex items-center gap-6 p-4 bg-neutral-800/30 rounded-lg border border-white/5 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Spark Votes</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-400">Up: {project.upvotes || 0}</span>
                <span className="text-sm text-neutral-400">Down: {project.downvotes || 0}</span>
              </div>
            </div>
            <div className="border-l border-white/10 pl-6">
              <h3 className="text-sm font-semibold text-white mb-3">Colosseum Votes</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-neutral-300">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{project.human_votes || 0}</span>
                  <span className="text-neutral-500">human</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <Bot className="w-4 h-4" />
                  <span className="font-medium">{project.agent_votes || 0}</span>
                  <span className="text-neutral-500">agent</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <span className="font-medium">{project.total_votes || 0}</span>
                  <span className="text-neutral-500">total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="border-t border-white/5 pt-6">
            <h3 className="text-sm font-semibold text-white mb-4">Discussion ({comments.length})</h3>
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 bg-neutral-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={!commentContent.trim()}
                className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Post Comment
              </button>
            </form>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 bg-neutral-800/30 rounded-lg border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">@{comment.author_username}</span>
                      {comment.is_team === 1 && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded border border-orange-500/30">
                          Team
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-neutral-300 mb-3 whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onCommentVote(comment.id, "upvote")}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.userVote === "up" ? "text-green-400" : "text-neutral-500 hover:text-green-400"
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.upvotes || 0}</span>
                    </button>
                    <button
                      onClick={() => onCommentVote(comment.id, "downvote")}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.userVote === "down" ? "text-orange-400" : "text-neutral-500 hover:text-orange-400"
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{comment.downvotes || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - same structure as IdeaDetailView */}
        <aside className="col-span-1 md:col-span-4 lg:col-span-4 space-y-6">
          <InvestmentSectionVault
            project={project}
            userProfile={userProfile}
            onConnectWallet={onConnectWallet}
            isConnectingWallet={isConnectingWallet}
            onInvestmentSuccess={() => {}}
          />

          <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/5">
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Status</h4>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full border ${
                      project.status === "Published" ? "bg-green-500 border-green-500/30" : "bg-neutral-500 border-neutral-500/30"
                    }`}
                  />
                  <span className="text-xs font-medium text-neutral-300">{project.status}</span>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Category</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                  {primaryCategory}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
