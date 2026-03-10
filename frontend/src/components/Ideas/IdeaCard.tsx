import { Link } from "react-router-dom";
import { MessageSquare, DollarSign, ThumbsUp, ThumbsDown } from "lucide-react";
import { Idea } from "./types";
import { categoryColors } from "./constants";
import { formatTimeAgo } from "./utils";
import React from "react";

interface IdeaCardProps {
  idea: Idea;
  onUpvote: (id: string) => void;
  onDownvote: (id: string) => void;
  onClick: () => void;
}

export function IdeaCard({ idea, onUpvote, onDownvote, onClick }: IdeaCardProps) {
  const category = categoryColors[idea.category] || categoryColors["AI x Crypto"];
  const voteScore = idea.upvotes - idea.downvotes;

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
            onUpvote(idea.id);
          }}
          className={`group/vote flex items-center justify-center w-8 h-8 rounded-t-lg border-t border-l border-r transition-all ${
            idea.userVote === 'up'
              ? "bg-green-500/20 border-green-500/30 text-green-400"
              : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/10"
          }`}
          title="Upvote"
        >
          <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${idea.userVote !== 'up' ? "group-hover/vote:-translate-y-0.5" : ""}`} />
        </button>
        <div className={`w-8 h-6 flex items-center justify-center text-[11px] font-bold border-l border-r border-white/5 ${
          voteScore > 0 ? "text-green-400" : voteScore < 0 ? "text-orange-400" : "text-neutral-400"
        }`}>
          {voteScore}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownvote(idea.id);
          }}
          className={`group/vote flex items-center justify-center w-8 h-8 rounded-b-lg border-b border-l border-r transition-all ${
            idea.userVote === 'down'
              ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
              : "bg-neutral-800/40 border-white/5 text-neutral-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10"
          }`}
          title="Downvote"
        >
          <ThumbsDown className={`w-3.5 h-3.5 transition-transform ${idea.userVote !== 'down' ? "group-hover/vote:translate-y-0.5" : ""}`} />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-sm font-medium text-white tracking-tight group-hover:text-orange-100 transition-colors">
            {idea.title}
          </h3>
          <span
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${category.bg} ${category.text} ${category.border} border`}
          >
            {idea.category}
          </span>
          {idea.estimatedPrice && idea.estimatedPrice > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <DollarSign className="w-2.5 h-2.5" />
              {idea.estimatedPrice.toLocaleString()}
            </span>
          )}
        </div>
        <div className="text-xs text-neutral-400 leading-relaxed mb-3 line-clamp-2">
          <SimpleMarkdownRenderer text={idea.description} />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-medium">
          <Link 
            to={`/profile/${idea.authorUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-blue-400 transition-colors"
          >
            <img src={idea.authorAvatar} alt={idea.authorUsername} className="w-3.5 h-3.5 rounded-full bg-neutral-800" />
            <span>@{idea.authorUsername}</span>
          </Link>
          <span>•</span>
          <span>{formatTimeAgo(idea.createdAt)}</span>
          {idea.commentsCount > 0 && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                <MessageSquare className="w-3 h-3" /> {idea.commentsCount}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Generated Image - Right side */}
      {idea.generatedImageUrl && (
        <div className="hidden sm:block shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-white/5">
          <img
            src={idea.generatedImageUrl}
            alt={idea.title}
            className="w-full h-full object-cover"
            onLoad={() => {
              console.log("✅ [FRONTEND] Card image loaded:", idea.generatedImageUrl);
            }}
            onError={(e) => {
              console.error("❌ [FRONTEND] Card image failed to load:", {
                url: idea.generatedImageUrl,
                ideaId: idea.id,
                ideaTitle: idea.title,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

// Simple markdown renderer for card descriptions (handles bold, italic, and basic formatting)
function SimpleMarkdownRenderer({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Process bold (**text** or __text__)
  const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }
    // Add bold text
    parts.push(
      <strong key={`bold-${keyCounter++}`} className="font-semibold text-neutral-300">
        {match[1] || match[2]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}

export default IdeaCard;
