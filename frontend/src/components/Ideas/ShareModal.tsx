import { useState } from "react";
import { X, Copy, Twitter, Check, ArrowUpRight } from "lucide-react";
import { Idea } from "./types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Idea;
}

export function ShareModal({ isOpen, onClose, idea }: ShareModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/ideas/${idea.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Share Idea</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors ${
              linkCopied
                ? "bg-green-500/10 border-green-500/20"
                : "bg-neutral-800/50 border-white/5 hover:bg-neutral-700/50"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              linkCopied ? "bg-green-500/20" : "bg-neutral-700"
            }`}>
              {linkCopied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-300" />
              )}
            </div>
            <div className="text-left">
              <p className={`text-xs font-medium ${linkCopied ? "text-green-400" : "text-white"}`}>
                {linkCopied ? "Copied!" : "Copy Link"}
              </p>
              <p className="text-[10px] text-neutral-500">
                {linkCopied ? "Link copied to clipboard" : "Copy the idea URL to clipboard"}
              </p>
            </div>
          </button>

          {/* Share on Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this idea: "${idea.title}"`)}&url=${encodeURIComponent(`${window.location.origin}/ideas/${idea.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800/50 border border-white/5 rounded-lg hover:bg-neutral-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Twitter className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-white">Share on X</p>
              <p className="text-[10px] text-neutral-500">Share this idea on Twitter/X</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-neutral-500 ml-auto" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
