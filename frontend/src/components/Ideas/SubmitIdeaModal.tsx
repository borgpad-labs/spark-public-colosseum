import { useState } from "react";
import { X, Loader2, Twitter, ChevronDown, ChevronUp, Link2, Check, Share2 } from "lucide-react";
import { UserProfile, NewIdeaForm } from "./types";
import { ideaCategories } from "./constants";

interface ShareInfo {
  slug: string;
  title: string;
}

interface SubmitIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (idea: NewIdeaForm) => Promise<{ slug?: string; title?: string } | void>;
  userProfile: UserProfile;
  onConnectX: () => void;
  isConnectingX: boolean;
}

export function SubmitIdeaModal({
  isOpen,
  onClose,
  onSubmit,
  userProfile,
  onConnectX,
  isConnectingX,
}: SubmitIdeaModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "tweet">("manual");
  const [tweetLink, setTweetLink] = useState("");
  const [isFetchingTweet, setIsFetchingTweet] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const MIN_BUDGET = 1000;
  const MAX_BUDGET = 100000;
  const STEP = 1000;
  const MIN_GAP = 5000;

  const [budgetMin, setBudgetMin] = useState(20000);
  const [budgetMax, setBudgetMax] = useState(30000);

  const [newIdea, setNewIdea] = useState<NewIdeaForm>({
    idea: "",
    category: "DeFi",
    problem: "",
    solution: "",
    estimatedPriceMin: 20000,
    estimatedPriceMax: 30000,
    why: "",
    marketSize: "",
    competitors: "",
  });

  const handleMinChange = (value: number) => {
    const clamped = Math.min(value, budgetMax - MIN_GAP);
    setBudgetMin(clamped);
    setNewIdea((prev) => ({ ...prev, estimatedPriceMin: clamped }));
  };

  const handleMaxChange = (value: number) => {
    const clamped = Math.max(value, budgetMin + MIN_GAP);
    setBudgetMax(clamped);
    setNewIdea((prev) => ({ ...prev, estimatedPriceMax: clamped }));
  };

  if (!isOpen) return null;

  const getIdeaUrl = (slug: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://justspark.fun';
    return `${baseUrl}/ideas/${slug}`;
  };

  const handleCopyLink = async () => {
    if (!shareInfo) return;
    const url = getIdeaUrl(shareInfo.slug);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareOnTwitter = () => {
    if (!shareInfo) return;
    const url = getIdeaUrl(shareInfo.slug);
    const text = `Check out this idea on @sparkdotfun: "${shareInfo.title}"`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.location.href = twitterUrl;
  };

  const handleCloseSharePopup = () => {
    const slug = shareInfo?.slug;
    setShareInfo(null);
    setLinkCopied(false);
    onClose();
    if (slug) {
      window.location.href = `/ideas/${slug}`;
    }
  };

  // Show share popup if we have share info
  if (shareInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseSharePopup} />
        <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Idea Submitted!</h2>
            </div>
            <button onClick={handleCloseSharePopup} className="text-neutral-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-sm text-neutral-400 mb-5 text-center">
              Your idea "<span className="text-white font-medium">{shareInfo.title}</span>" has been submitted successfully. Share it with your network!
            </p>

            <div className="space-y-3">
              {/* Share on Twitter */}
              <button
                onClick={handleShareOnTwitter}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Share on X (Twitter)
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-3 border rounded-lg text-sm font-medium transition-colors ${
                  linkCopied
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 bg-neutral-900/50">
            <button
              onClick={handleCloseSharePopup}
              className="w-full py-2.5 bg-orange-500 text-black font-semibold text-sm rounded-lg hover:bg-orange-400 transition-colors"
            >
              View My Idea
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!userProfile.xConnected || !newIdea.idea.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await onSubmit(newIdea);
      setBudgetMin(20000);
      setBudgetMax(30000);
      const submittedTitle = newIdea.idea;
      setNewIdea({
        idea: "",
        category: "DeFi",
        problem: "",
        solution: "",
        estimatedPriceMin: 20000,
        estimatedPriceMax: 30000,
        why: "",
        marketSize: "",
        competitors: "",
      });
      setShowMoreDetails(false);
      setActiveTab("manual");
      
      // Show share popup if we got a slug back
      if (result?.slug) {
        setShareInfo({ slug: result.slug, title: result.title || submittedTitle });
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTweet = async () => {
    if (!userProfile.xConnected || !tweetLink.trim()) return;
    setIsSubmitting(true);
    setIsFetchingTweet(true);
    try {
      // First, get tweet info from Sorsa
      console.log("🔍 [FRONTEND] Fetching tweet info from Sorsa:", tweetLink);
      const tweetInfoResponse = await fetch('/api/get-tweet-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_link: tweetLink }),
      });

      if (!tweetInfoResponse.ok) {
        const errorData = await tweetInfoResponse.json();
        throw new Error(errorData.message || 'Failed to fetch tweet info');
      }

      const tweetInfo = await tweetInfoResponse.json();
      console.log("✅ [FRONTEND] Tweet info fetched:", tweetInfo);

      // Then, create idea from tweet
      console.log("🔄 [FRONTEND] Creating idea from tweet...");
      const ideaResponse = await fetch('/api/ideas-from-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: tweetInfo.username,
          tweetUrl: tweetLink,
          tweetContent: tweetInfo.tweetContent,
        }),
      });

      if (!ideaResponse.ok) {
        const errorData = await ideaResponse.json();
        throw new Error(errorData.message || errorData.reason || 'Failed to create idea from tweet');
      }

      const ideaData = await ideaResponse.json();
      console.log("✅ [FRONTEND] Idea created from tweet:", ideaData);

      // Reset form
      setTweetLink("");
      setActiveTab("manual");
      
      // Show share popup
      if (ideaData.slug) {
        setShareInfo({ slug: ideaData.slug, title: ideaData.title || "New Idea" });
      } else {
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Failed to submit tweet:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit tweet. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsFetchingTweet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-base font-semibold text-white">Submit New Idea</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 text-center ${
              activeTab === "manual"
                ? "text-orange-400 border-orange-400"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab("tweet")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 text-center ${
              activeTab === "tweet"
                ? "text-orange-400 border-orange-400"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            From Tweet
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {activeTab === "manual" ? (
          <div className="space-y-5">
            {/* X Connection - Moved to top */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-2 block">
                Connect with X *
              </label>
              {userProfile.xConnected ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <img src={userProfile.xAvatar} alt={userProfile.xUsername} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-white">{userProfile.xName}</p>
                    <p className="text-xs text-emerald-400">@{userProfile.xUsername}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onConnectX}
                  disabled={isConnectingX}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {isConnectingX ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Twitter className="w-4 h-4" />
                      Connect with X to submit
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Idea Title */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Idea *
              </label>
              <input
                type="text"
                value={newIdea.idea}
                onChange={(e) => setNewIdea({ ...newIdea, idea: e.target.value })}
                placeholder="Your idea in one sentence..."
                className="w-full h-11 px-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Category
              </label>
              <select
                value={newIdea.category}
                onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                className="w-full h-11 px-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
              >
                {ideaCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Problem */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Problem that needs to be fixed
              </label>
              <textarea
                value={newIdea.problem}
                onChange={(e) => setNewIdea({ ...newIdea, problem: e.target.value })}
                placeholder="What problem does this solve?"
                rows={3}
                className="w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
              />
            </div>

            {/* Solution */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Solution
              </label>
              <textarea
                value={newIdea.solution}
                onChange={(e) => setNewIdea({ ...newIdea, solution: e.target.value })}
                placeholder="How would you solve it?"
                rows={3}
                className="w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
              />
            </div>

            {/* Estimated Budget Range — Dual Thumb Slider */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Estimated Budget Range for V1
              </label>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-neutral-400">
                  ${budgetMin.toLocaleString()} – ${budgetMax.toLocaleString()}
                </span>
              </div>
              <div className="relative h-6 flex items-center">
                {/* Track background */}
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-neutral-700" />
                {/* Active range highlight */}
                <div
                  className="absolute h-1.5 rounded-full bg-orange-500"
                  style={{
                    left: `${((budgetMin - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100}%`,
                    right: `${100 - ((budgetMax - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100}%`,
                  }}
                />
                {/* Min thumb */}
                <input
                  type="range"
                  min={MIN_BUDGET}
                  max={MAX_BUDGET}
                  step={STEP}
                  value={budgetMin}
                  onChange={(e) => handleMinChange(parseInt(e.target.value))}
                  className="dual-range-thumb absolute inset-0 w-full pointer-events-none appearance-none bg-transparent"
                />
                {/* Max thumb */}
                <input
                  type="range"
                  min={MIN_BUDGET}
                  max={MAX_BUDGET}
                  step={STEP}
                  value={budgetMax}
                  onChange={(e) => handleMaxChange(parseInt(e.target.value))}
                  className="dual-range-thumb absolute inset-0 w-full pointer-events-none appearance-none bg-transparent"
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>${MIN_BUDGET.toLocaleString()}</span>
                <span>${MAX_BUDGET.toLocaleString()}</span>
              </div>
            </div>

            {/* Collapsible More Details Section */}
            <div className="border-t border-white/5 pt-4">
              <button
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="flex items-center justify-between w-full text-[11px] font-medium text-neutral-400 uppercase tracking-wide hover:text-white transition-colors"
              >
                <span>Add More Details (Optional)</span>
                {showMoreDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showMoreDetails && (
                <div className="mt-4 space-y-4">
                  {/* Why */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                      Why (the deeper problem/thesis)
                    </label>
                    <textarea
                      value={newIdea.why || ""}
                      onChange={(e) => setNewIdea({ ...newIdea, why: e.target.value })}
                      placeholder="Explain the deeper problem or thesis..."
                      rows={3}
                      className="w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Market Size */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                      Market Size
                    </label>
                    <textarea
                      value={newIdea.marketSize || ""}
                      onChange={(e) => setNewIdea({ ...newIdea, marketSize: e.target.value })}
                      placeholder="Describe the market size and opportunity..."
                      rows={3}
                      className="w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Competitors */}
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                      Competitors
                    </label>
                    <textarea
                      value={newIdea.competitors || ""}
                      onChange={(e) => setNewIdea({ ...newIdea, competitors: e.target.value })}
                      placeholder="List and analyze competitors..."
                      rows={3}
                      className="w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          ) : (
          <div className="space-y-5">
            {/* X Connection */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-2 block">
                Connect with X *
              </label>
              {userProfile.xConnected ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <img src={userProfile.xAvatar} alt={userProfile.xUsername} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-white">{userProfile.xName}</p>
                    <p className="text-xs text-emerald-400">@{userProfile.xUsername}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onConnectX}
                  disabled={isConnectingX}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {isConnectingX ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Twitter className="w-4 h-4" />
                      Connect with X to submit
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Tweet Link Input */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5 block">
                Tweet Link *
              </label>
              <input
                type="text"
                value={tweetLink}
                onChange={(e) => setTweetLink(e.target.value)}
                placeholder="https://x.com/username/status/1234567890"
                className="w-full h-11 px-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              <p className="text-[10px] text-neutral-500 mt-1.5">
                Paste the full URL of the tweet you want to convert into an idea
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-neutral-900/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 text-sm font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          {activeTab === "manual" ? (
            <button
              onClick={handleSubmit}
              disabled={!userProfile.xConnected || !newIdea.idea.trim() || isSubmitting}
              className="px-6 py-2 bg-orange-500 text-black font-semibold text-sm rounded-lg hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Idea"
              )}
            </button>
          ) : (
            <button
              onClick={handleSubmitTweet}
              disabled={!userProfile.xConnected || !tweetLink.trim() || isSubmitting}
              className="px-6 py-2 bg-orange-500 text-black font-semibold text-sm rounded-lg hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isFetchingTweet ? "Fetching tweet..." : "Creating idea..."}
                </>
              ) : (
                "Submit Tweet"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubmitIdeaModal;
