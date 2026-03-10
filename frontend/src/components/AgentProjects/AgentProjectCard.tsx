import { Link } from "react-router-dom";
import { MessageSquare, DollarSign, ThumbsUp, ThumbsDown, ExternalLink, Users, User, Bot } from "lucide-react";
import { AgentProject } from "./types";
import { formatTimeAgo } from "../Ideas/utils";
import React from "react";

interface AgentProjectCardProps {
  project: AgentProject;
  onUpvote: (id: string) => void;
  onDownvote: (id: string) => void;
  onClick: () => void;
}

// Simple markdown renderer for card preview
function SimpleMarkdownRenderer({ text }: { text: string }) {
  return <span>{text}</span>;
}

export function AgentProjectCard({ project, onUpvote, onDownvote, onClick }: AgentProjectCardProps) {
  const voteScore = (project.upvotes || 0) - (project.downvotes || 0);

  return (
    <div
      className="group relative flex gap-4 p-5 rounded-xl bg-neutral-900/30 border border-white/5 hover:border-white/10 hover:bg-neutral-900/60 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer select-none"
      onClick={onClick}
    >
      {/* Vote Buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpvote(project.id);
          }}
          className={`group/vote flex items-center justify-center w-8 h-8 rounded-t-lg border-t border-l border-r transition-all ${
            project.userVote === 'up'
              ? "bg-green-500/20 border-green-500/30 text-green-400"
              : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/10"
          }`}
          title="Upvote"
        >
          <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${project.userVote !== 'up' ? "group-hover/vote:-translate-y-0.5" : ""}`} />
        </button>
        <div className={`w-8 h-6 flex items-center justify-center text-[11px] font-bold border-l border-r border-white/5 ${
          voteScore > 0 ? "text-green-400" : voteScore < 0 ? "text-orange-400" : "text-neutral-400"
        }`}>
          {voteScore}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownvote(project.id);
          }}
          className={`group/vote flex items-center justify-center w-8 h-8 rounded-b-lg border-b border-l border-r transition-all ${
            project.userVote === 'down'
              ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
              : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10"
          }`}
          title="Downvote"
        >
          <ThumbsDown className={`w-3.5 h-3.5 transition-transform ${project.userVote !== 'down' ? "group-hover/vote:translate-y-0.5" : ""}`} />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-sm font-medium text-white tracking-tight group-hover:text-orange-100 transition-colors">
            {project.title}
          </h3>

          {/* Status Badge */}
          <span
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
              project.status === "Published"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
            } border`}
          >
            {project.status}
          </span>

          {/* Raised Amount */}
          {project.raised_amount && project.raised_amount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <DollarSign className="w-2.5 h-2.5" />
              {project.raised_amount.toLocaleString()}
            </span>
          )}

          {/* External Link to Colosseum */}
          <a
            href={project.colosseum_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            title="View on Colosseum"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div className="text-xs text-neutral-400 leading-relaxed mb-3 line-clamp-2">
          <SimpleMarkdownRenderer text={project.description} />
        </div>

        {/* Colosseum Vote Counts */}
        <div className="flex items-center gap-3 mb-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <User className="w-3 h-3" />
            <span className="font-medium">{project.human_votes || 0}</span>
            <span className="text-neutral-500">human</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Bot className="w-3 h-3" />
            <span className="font-medium">{project.agent_votes || 0}</span>
            <span className="text-neutral-500">agent</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className="font-medium">{project.total_votes || 0}</span>
            <span className="text-neutral-500">total</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-medium">
          {/* Team Name */}
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Users className="w-3 h-3" />
            <span>{project.team_name}</span>
          </div>
          <span>•</span>
          <span>{formatTimeAgo(project.created_at)}</span>

          {project.comments_count && project.comments_count > 0 && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                <MessageSquare className="w-3 h-3" /> {project.comments_count}
              </div>
            </>
          )}

          {/* Data Freshness Indicator */}
          <span>•</span>
          <span className="text-neutral-600 text-[9px]" title={`Last synced: ${new Date(project.scraped_at).toLocaleString()}`}>
            synced {formatTimeAgo(project.scraped_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
