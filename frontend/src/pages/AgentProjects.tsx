// AgentProjects Page - Adapted from Ideas.tsx
// Displays Colosseum Agent Hackathon projects with voting and investment

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AgentProject, AgentProjectComment, AgentProjectFilters } from "../components/AgentProjects/types";
import { AgentProjectCard } from "../components/AgentProjects/AgentProjectCard";
import { AgentProjectDetailView } from "../components/AgentProjects/AgentProjectDetailView";
import { IdeasHeader } from "../components/Ideas/IdeasHeader";
import { UserProfile, loadUserProfile, saveUserProfile, getUserId, generateCodeVerifier, generateCodeChallenge, generateState } from "../components/Ideas";
import { WalletSelector } from "../components/Ideas/WalletSelector";
import { Loader2 } from "lucide-react";

export default function AgentProjects() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // User profile state (same as Ideas)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);

  const [projects, setProjects] = useState<AgentProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AgentProject | null>(null);
  const [comments, setComments] = useState<AgentProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AgentProjectFilters>({
    status: "all",
    sortBy: "votes",
    limit: 50,
    offset: 0
  });

  // View management for header
  const currentView = "agents" as const;
  const remainingVotes = 10; // Placeholder

  const handleViewChange = (view: any) => {
    if (view === "ideas") navigate("/ideas");
    else if (view === "teams") navigate("/teams");
    else if (view === "explanation") navigate("/explanation");
    else if (view === "roadmap") navigate("/roadmap");
  };

  // Handle Twitter OAuth callback when returning to /agents?code=...&state=...
  const handleTwitterCallback = async (code: string, state: string) => {
    setIsConnectingX(true);
    try {
      const storedState = localStorage.getItem("twitter_oauth_state");
      const storedTimestamp = localStorage.getItem("twitter_oauth_timestamp");
      if (storedTimestamp) {
        const elapsed = Date.now() - parseInt(storedTimestamp, 10);
        if (elapsed > 5 * 60 * 1000) throw new Error("OAuth session expired. Please try again.");
      }
      if (state !== storedState) throw new Error("State mismatch - please try connecting again");
      const codeVerifier = localStorage.getItem("twitter_code_verifier");
      if (!codeVerifier) throw new Error("Code verifier not found - please try connecting again");

      const redirectUri = `${window.location.origin}/agents`;
      const response = await fetch("/api/twitter-oauth-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to exchange token");
      }
      const data = await response.json();
      const newProfile: UserProfile = {
        ...loadUserProfile(),
        xId: data.user.id,
        xUsername: data.user.username,
        xName: data.user.name,
        xAvatar: data.user.profile_image_url || `https://unavatar.io/twitter/${data.user.username}`,
        xConnected: true,
      };
      setUserProfile(newProfile);
      saveUserProfile(newProfile);
      if (newProfile.walletAddress) {
        try {
          await fetch("/api/link-wallet-to-twitter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ twitterId: data.user.id, walletAddress: newProfile.walletAddress }),
          }).catch((err) => console.error("Failed to link wallet:", err));
        } catch (e) {
          console.error("Failed to link wallet to Twitter:", e);
        }
      }
      localStorage.removeItem("twitter_code_verifier");
      localStorage.removeItem("twitter_oauth_state");
      localStorage.removeItem("twitter_oauth_timestamp");
      navigate("/agents", { replace: true });
    } catch (error) {
      console.error("Twitter OAuth callback failed:", error);
      localStorage.removeItem("twitter_code_verifier");
      localStorage.removeItem("twitter_oauth_state");
      localStorage.removeItem("twitter_oauth_timestamp");
      alert(`Failed to connect to X: ${error instanceof Error ? error.message : "Unknown error"}`);
      navigate("/agents", { replace: true });
    } finally {
      setIsConnectingX(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state) handleTwitterCallback(code, state);
  }, [searchParams]);

  const handleConnectX = async () => {
    setIsConnectingX(true);
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();
      localStorage.setItem("twitter_code_verifier", codeVerifier);
      localStorage.setItem("twitter_oauth_state", state);
      localStorage.setItem("twitter_oauth_timestamp", Date.now().toString());
      const redirectUri = `${window.location.origin}/agents`;
      const response = await fetch("/api/twitter-oauth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate OAuth URL");
      }
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to initiate X connection:", error);
      alert(
        `Failed to connect to X: ${error instanceof Error ? error.message : "Unknown error"}\n\n` +
          `Make sure the redirect URI ${window.location.origin}/agents is registered in your Twitter Developer Portal.`
      );
      setIsConnectingX(false);
    }
  };

  const handleDisconnectX = () => {
    const updated = { ...userProfile, xConnected: false, xUsername: "", xName: "", xAvatar: "" };
    setUserProfile(updated);
    saveUserProfile(updated);
  };

  const handleConnectWallet = () => {
    setIsWalletSelectorOpen(true);
  };

  const handleWalletSelected = async (address: string) => {
    const newProfile: UserProfile = {
      ...userProfile,
      walletAddress: address,
      walletConnected: true,
    };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    setIsWalletSelectorOpen(false);
    if (userProfile.xConnected && userProfile.xId) {
      try {
        await fetch("/api/link-wallet-to-twitter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ twitterId: userProfile.xId, walletAddress: address }),
        }).catch((err) => console.error("Failed to link wallet:", err));
      } catch (e) {
        console.error("Failed to link wallet to Twitter:", e);
      }
    }
  };

  const handleDisconnectWallet = () => {
    const updated = { ...userProfile, walletConnected: false, walletAddress: "" };
    setUserProfile(updated);
    saveUserProfile(updated);
  };

  const handleOpenSubmitModal = () => {
    // Not used in Agent Projects, but required by header
  };

  // Fetch projects on mount and when filters change
  useEffect(() => {
    fetchProjects();
  }, [filters]);

  // Handle slug parameter: from list click or direct URL /agents/:slug
  useEffect(() => {
    if (!slug) return;
    const fromList = projects.find(p => p.slug === slug);
    if (fromList) {
      fetchProjectDetails(fromList.id);
      return;
    }
    // Direct link: fetch by slug so detail view loads even before list
    const fetchBySlug = async () => {
      try {
        const res = await fetch(`/api/agent-projects?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.project) {
          setSelectedProject(data.project);
          setComments(data.comments || []);
        }
      } catch (e) {
        console.error("Failed to fetch project by slug:", e);
      }
    };
    fetchBySlug();
  }, [slug, projects]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // API call to /api/agent-projects
      const queryParams = new URLSearchParams();
      if (filters.status && filters.status !== "all") queryParams.set("status", filters.status);
      if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
      if (filters.limit) queryParams.set("limit", filters.limit.toString());
      if (filters.offset) queryParams.set("offset", filters.offset.toString());

      const response = await fetch(`/api/agent-projects?${queryParams.toString()}`);
      const data = await response.json();

      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const response = await fetch(`/api/agent-projects?id=${projectId}`);
      const data = await response.json();

      if (data.project) {
        setSelectedProject(data.project);
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch project details:", error);
    }
  };

  const handleProjectClick = (project: AgentProject) => {
    navigate(`/agents/${project.slug}`);
    setSelectedProject(project);
    fetchProjectDetails(project.id);
  };

  const handleCloseDetail = () => {
    navigate("/agents");
    setSelectedProject(null);
    setComments([]);
  };

  const handleVote = async (projectId: string, action: 'upvote' | 'downvote') => {
    try {
      const userId = getUserId();

      const response = await fetch("/api/agent-projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          action,
          userId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Optimistic UI update
        setProjects(projects.map(p => {
          if (p.id === projectId) {
            const currentUpvotes = p.upvotes || 0;
            const currentDownvotes = p.downvotes || 0;
            const currentVote = p.userVote;

            let newUpvotes = currentUpvotes;
            let newDownvotes = currentDownvotes;
            let newUserVote: 'up' | 'down' | null = result.voteType;

            // Handle vote logic
            if (result.action === "voted") {
              if (result.voteType === 'up') newUpvotes++;
              else newDownvotes++;
            } else if (result.action === "unvoted") {
              if (currentVote === 'up') newUpvotes--;
              else if (currentVote === 'down') newDownvotes--;
            } else if (result.action === "changed") {
              if (currentVote === 'up') newUpvotes--;
              else if (currentVote === 'down') newDownvotes--;
              if (result.voteType === 'up') newUpvotes++;
              else newDownvotes++;
            }

            return {
              ...p,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              userVote: newUserVote
            };
          }
          return p;
        }));

        // Update selected project if open
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(prev => prev ? {
            ...prev,
            upvotes: (prev.upvotes || 0) + (action === 'upvote' ? 1 : 0),
            downvotes: (prev.downvotes || 0) + (action === 'downvote' ? 1 : 0),
            userVote: result.voteType
          } : null);
        }
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const handleCommentSubmit = async (content: string, parentId?: string) => {
    if (!selectedProject) return;

    try {
      const response = await fetch("/api/agent-project-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          content,
          parentCommentId: parentId,
          authorUsername: userProfile.xUsername || userProfile.walletAddress?.slice(0, 8) || "anonymous",
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh comments
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  const handleCommentVote = async (commentId: string, action: 'upvote' | 'downvote') => {
    try {
      const userId = getUserId();

      const response = await fetch("/api/agent-project-comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: commentId,
          action,
          userId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update comments optimistically
        setComments(comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              upvotes: c.upvotes + (action === 'upvote' ? 1 : 0),
              downvotes: c.downvotes + (action === 'downvote' ? 1 : 0),
              userVote: result.voteType
            };
          }
          return c;
        }));
      }
    } catch (error) {
      console.error("Failed to vote on comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-black">
      <WalletSelector
        isOpen={isWalletSelectorOpen}
        onClose={() => setIsWalletSelectorOpen(false)}
        onWalletSelected={handleWalletSelected}
      />
      <IdeasHeader
        currentView={currentView}
        onViewChange={handleViewChange}
        userProfile={userProfile}
        remainingVotes={remainingVotes}
        isProfileDropdownOpen={isProfileDropdownOpen}
        setIsProfileDropdownOpen={setIsProfileDropdownOpen}
        onOpenSubmitModal={handleOpenSubmitModal}
        onConnectX={handleConnectX}
        onDisconnectX={handleDisconnectX}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        isConnectingX={isConnectingX}
        isConnectingWallet={isConnectingWallet}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Detail View (inline, same template as Ideas) */}
        {selectedProject ? (
          <AgentProjectDetailView
            project={selectedProject}
            comments={comments}
            onBack={handleCloseDetail}
            onVote={handleVote}
            onCommentSubmit={handleCommentSubmit}
            onCommentVote={handleCommentVote}
            userProfile={userProfile}
            onConnectWallet={handleConnectWallet}
            isConnectingWallet={isConnectingWallet}
          />
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Agent Projects</h1>
              <p className="text-neutral-400">
                Discover and invest in projects from Colosseum's Agent Hackathon
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <select
                value={filters.sortBy || "votes"}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="px-4 py-2 bg-neutral-800/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="votes">Most Voted (Spark)</option>
                <option value="colosseum_votes">Most Voted (Colosseum)</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="raised">Most Funded</option>
              </select>

              <select
                value={filters.status || "all"}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="px-4 py-2 bg-neutral-800/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="all">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>

              <button
                onClick={() => fetchProjects()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Projects List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                <p>No projects found. Try adjusting your filters.</p>
                <p className="text-sm mt-2">
                  Projects are synced from Colosseum automatically every 6 hours, or use Refresh.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <AgentProjectCard
                    key={project.id}
                    project={project}
                    onUpvote={(id) => handleVote(id, 'upvote')}
                    onDownvote={(id) => handleVote(id, 'downvote')}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}

            {projects.length > 0 && (
              <div className="mt-6 text-center text-sm text-neutral-500">
                Showing {projects.length} projects
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
