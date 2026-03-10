import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Search, Loader2, TrendingUp, DollarSign, Timer, Lock } from "lucide-react";
import { backendSparkApi, IdeaModel, IdeaCommentModel } from "@/data/api/backendSparkApi";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletSelector } from '@/components/Ideas/WalletSelector';

// Import refactored components
import {
  // Types
  Idea,
  Comment,
  UserProfile,
  UserVotes,
  UserCommentVotes,
  ViewType,
  SortOption,
  NewIdeaForm,
  // Utils
  loadUserProfile,
  saveUserProfile,
  loadUserVotes,
  saveUserVotes,
  loadUserCommentVotes,
  saveUserCommentVotes,
  canVoteToday,
  getRemainingVotes,
  incrementDailyVoteCount,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getUserId,
  DAILY_VOTE_LIMIT,
  // Components
  IdeaCard,
  IdeaDetailView,
  TeamsView,
  ExplanationView,
  RoadmapView,
  SubmitIdeaModal,
  ShareModal,
  IdeasHeader,
  // Constants
  ideaCategories,
  categoryColors,
} from "@/components/Ideas";

// Re-export types for backward compatibility
export type { UserProfile, Idea, Comment };

// Helper to convert backend model to frontend model
const mapBackendIdea = (idea: IdeaModel, userVotes: UserVotes = {}): Idea => ({
  id: idea.id,
  title: idea.title,
  slug: idea.slug,
  description: idea.description,
  category: idea.category,
  upvotes: idea.upvotes || 0,
  downvotes: idea.downvotes || 0,
  userVote: userVotes[idea.id] || null,
  authorUsername: idea.author_username,
  authorAvatar: idea.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${idea.author_username}`,
  authorTwitterId: idea.author_twitter_id,
  source: idea.source as "user" | "twitter",
  tweetUrl: idea.tweet_url,
  tweetContent: idea.tweet_content,
  estimatedPrice: idea.estimated_price || 0,
  raisedAmount: idea.id === 'e03ef91e-958d-41d6-bff9-1e1cc644f29e' ? 4079.32 : (idea.raised_amount || 0),
  capReachedAt: idea.cap_reached_at || undefined,
  commentsCount: idea.comments_count || 0,
  createdAt: idea.created_at,
  status: idea.status as "pending" | "in_progress" | "completed" | "planned",
  generatedImageUrl: idea.generated_image_url,
  marketAnalysis: idea.market_analysis,
  tokenAddress: idea.token_address,
  timelinePhase: idea.timeline_phase,
});

const mapBackendComment = (comment: IdeaCommentModel, userCommentVotes: UserCommentVotes = {}): Comment => ({
  id: comment.id,
  ideaId: comment.idea_id,
  parentCommentId: comment.parent_comment_id,
  authorUsername: comment.author_username,
  authorAvatar: comment.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_username}`,
  authorTwitterId: comment.author_twitter_id,
  content: comment.content,
  isTeam: comment.is_team,
  createdAt: comment.created_at,
  upvotes: comment.upvotes || 0,
  downvotes: comment.downvotes || 0,
  userVote: userCommentVotes[comment.id] || null,
  authorInvestment: comment.author_investment || 0,
});

// Main Ideas Page Component
export default function Ideas() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Determine initial view from URL path
  const getInitialView = (): ViewType => {
    const path = location.pathname;
    if (path === "/teams") return "teams";
    if (path === "/explanation") return "explanation";
    if (path === "/roadmap") return "roadmap";
    if (slug) return "idea-detail";
    return "ideas";
  };
  
  // View state
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  
  // Sync view with URL path changes
  useEffect(() => {
    const path = location.pathname;
    if (path === "/teams") {
      setCurrentView("teams");
    } else if (path === "/explanation") {
      setCurrentView("explanation");
    } else if (path === "/roadmap") {
      setCurrentView("roadmap");
    } else if (path === "/ideas" && !slug) {
      setCurrentView("ideas");
    }
    // idea-detail view is handled by the slug useEffect
  }, [location.pathname, slug]);
  
  // Ideas state
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  
  // Countdown timer for cap-reached ideas
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const hasCountdown = ideas.some(i => {
      if (!i.capReachedAt) return false;
      const deadline = new Date(new Date(i.capReachedAt).getTime() + 48 * 60 * 60 * 1000);
      return new Date() < deadline;
    });
    if (!hasCountdown) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [ideas]);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentSortBy, setCommentSortBy] = useState<"votes" | "newest" | "oldest">("votes");
  
  // Vote tracking
  const [userVotes, setUserVotes] = useState<UserVotes>(loadUserVotes);
  const [userCommentVotes, setUserCommentVotes] = useState<UserCommentVotes>(loadUserCommentVotes);
  const [remainingVotes, setRemainingVotes] = useState(getRemainingVotes());
  
  // Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  
  // Wallet adapter hooks
  const { publicKey, connected } = useWallet();
  
  // Wallet selector modal state
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);
  
  // Sync wallet adapter connection with user profile
  useEffect(() => {
    if (connected && publicKey) {
      const newAddress = publicKey.toString();
      setUserProfile(prev => {
        if (prev.walletAddress === newAddress) return prev;
        const newProfile: UserProfile = {
          ...prev,
          walletAddress: newAddress,
          walletConnected: true,
        };
        saveUserProfile(newProfile);
        return newProfile;
      });
    } else if (!connected) {
      setUserProfile(prev => {
        if (!prev.walletConnected) return prev;
        const newProfile: UserProfile = {
          ...prev,
          walletAddress: undefined,
          walletConnected: false,
        };
        saveUserProfile(newProfile);
        return newProfile;
      });
    }
  }, [connected, publicKey]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Handle Twitter OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      handleTwitterCallback(code, state);
    }
  }, [searchParams]);

  const handleTwitterCallback = async (code: string, state: string) => {
    setIsConnectingX(true);
    try {
      // Use localStorage instead of sessionStorage for mobile compatibility
      const storedState = localStorage.getItem('twitter_oauth_state');
      const storedTimestamp = localStorage.getItem('twitter_oauth_timestamp');

      // Check if OAuth data has expired (5 minutes max)
      if (storedTimestamp) {
        const elapsed = Date.now() - parseInt(storedTimestamp, 10);
        if (elapsed > 5 * 60 * 1000) {
          throw new Error('OAuth session expired. Please try again.');
        }
      }

      if (state !== storedState) {
        console.error('State mismatch:', { received: state, stored: storedState });
        throw new Error('State mismatch - please try connecting again');
      }

      const codeVerifier = localStorage.getItem('twitter_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found - please try connecting again');
      }

      const redirectUri = `${window.location.origin}/ideas`;

      const response = await fetch('/api/twitter-oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to exchange token');
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

      // Link wallet to Twitter user if wallet is connected
      if (newProfile.walletAddress) {
        try {
          await fetch('/api/link-wallet-to-twitter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              twitterId: data.user.id,
              walletAddress: newProfile.walletAddress,
            }),
          }).catch(err => console.error('Failed to link wallet:', err));
        } catch (error) {
          console.error('Failed to link wallet to Twitter:', error);
        }
      }

      // Clean up localStorage
      localStorage.removeItem('twitter_code_verifier');
      localStorage.removeItem('twitter_oauth_state');
      localStorage.removeItem('twitter_oauth_timestamp');
      navigate('/ideas', { replace: true });
    } catch (error) {
      console.error('Twitter OAuth callback failed:', error);
      // Clean up localStorage on error
      localStorage.removeItem('twitter_code_verifier');
      localStorage.removeItem('twitter_oauth_state');
      localStorage.removeItem('twitter_oauth_timestamp');
      alert(`Failed to connect to X: ${error instanceof Error ? error.message : 'Unknown error'}`);
      navigate('/ideas', { replace: true });
    } finally {
      setIsConnectingX(false);
    }
  };

  // Fetch ideas from backend
  const fetchIdeas = useCallback(async () => {
    setIsLoadingIdeas(true);
    try {
      const response = await backendSparkApi.getIdeas({ sortBy });
      const mappedIdeas = response.ideas.map((idea) => mapBackendIdea(idea, userVotes));
      setIdeas(mappedIdeas);
    } catch (error) {
      console.error("Failed to fetch ideas:", error);
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [sortBy, userVotes]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Sort comments
  const sortComments = useCallback((commentsToSort: Comment[], sortType: "votes" | "newest" | "oldest"): Comment[] => {
    const sorted = [...commentsToSort];
    switch (sortType) {
      case "votes":
        sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }
    sorted.forEach(comment => {
      if (comment.replies?.length) {
        comment.replies = sortComments(comment.replies, sortType);
      }
    });
    return sorted;
  }, []);

  // Build comment tree
  const buildCommentTree = useCallback((flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    const rootComments: Comment[] = [];
    flatComments.forEach(comment => {
      const mappedComment = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(mappedComment);
        } else {
          rootComments.push(mappedComment);
        }
      } else {
        rootComments.push(mappedComment);
      }
    });
    
    return rootComments;
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async (ideaId: string) => {
    setIsLoadingComments(true);
    try {
      const response = await backendSparkApi.getIdeaComments(ideaId);
      const mappedComments = response.comments.map(c => mapBackendComment(c, userCommentVotes));
      const tree = buildCommentTree(mappedComments);
      setComments(sortComments(tree, commentSortBy));
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [userCommentVotes, buildCommentTree, sortComments, commentSortBy]);

  // Track which ideas are currently generating images to prevent duplicate requests
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // Load idea by slug
  const loadIdeaBySlug = useCallback(async (ideaSlug: string) => {
    setIsLoadingIdeas(true);
    try {
      const response = await backendSparkApi.getIdeaBySlug(ideaSlug);
      if (response.idea) {
        const mappedIdea = mapBackendIdea(response.idea, userVotes);
        setSelectedIdea(mappedIdea);
        setCurrentView("idea-detail");
        
        // Generate image and analysis if missing
        if (mappedIdea.id && !mappedIdea.generatedImageUrl && !generatingImages.has(mappedIdea.id)) {
          console.log("🖼️ [FRONTEND] No image found, requesting generation for idea:", mappedIdea.id, mappedIdea.title);
          // Mark as generating to prevent duplicate requests
          setGeneratingImages(prev => new Set(prev).add(mappedIdea.id));
          
          // Extract problem and solution from description
          const problemMatch = mappedIdea.description?.match(/\*\*Problem:\*\*\s*\n?([^*]+?)(?=\*\*|$)/i);
          const solutionMatch = mappedIdea.description?.match(/\*\*Solution:\*\*\s*\n?([^*]+?)(?=\*\*|$)/i);
          
          fetch('/api/generate-idea-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ideaId: mappedIdea.id,
              title: mappedIdea.title,
              description: mappedIdea.description,
              category: mappedIdea.category,
              problem: problemMatch?.[1]?.trim(),
              solution: solutionMatch?.[1]?.trim(),
            }),
          })
          .then(async (res) => {
            const data = await res.json();
            console.log("📥 [FRONTEND] Image generation response:", {
              status: res.status,
              success: data.success,
              imageUrl: data.imageUrl,
              cached: data.cached,
              inProgress: data.inProgress,
            });
            // Only reload if image is actually generated (not a placeholder from in-progress)
            if (data.success && data.imageUrl && !data.inProgress && data.cached) {
              // Remove from generating set
              setGeneratingImages(prev => {
                const next = new Set(prev);
                next.delete(mappedIdea.id);
                return next;
              });
              // Reload the idea to get the updated image URL
              console.log("🔄 [FRONTEND] Reloading idea to get updated image URL");
              loadIdeaBySlug(ideaSlug);
            } else if (data.inProgress) {
              console.log("⏳ [FRONTEND] Image generation in progress, will check again later");
              // Remove from generating set after a delay to allow retry later
              setTimeout(() => {
                setGeneratingImages(prev => {
                  const next = new Set(prev);
                  next.delete(mappedIdea.id);
                  return next;
                });
              }, 60000); // Remove after 60 seconds
            } else {
              // Remove from generating set on error or other cases
              setGeneratingImages(prev => {
                const next = new Set(prev);
                next.delete(mappedIdea.id);
                return next;
              });
            }
          })
          .catch(err => {
            console.error('❌ [FRONTEND] Failed to generate image:', err);
            // Remove from generating set on error
            setGeneratingImages(prev => {
              const next = new Set(prev);
              next.delete(mappedIdea.id);
              return next;
            });
          });
        } else if (generatingImages.has(mappedIdea.id)) {
          console.log("⏳ [FRONTEND] Image generation already in progress for this idea, skipping");
        } else {
          console.log("✅ [FRONTEND] Image already exists:", mappedIdea.generatedImageUrl);
        }
        
        if (mappedIdea.id && !mappedIdea.marketAnalysis) {
          fetch('/api/analyze-market-opportunity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ideaId: mappedIdea.id,
              title: mappedIdea.title,
              description: mappedIdea.description,
              category: mappedIdea.category,
            }),
          }).catch(err => console.error('Failed to analyze market:', err));
        }
        
        if (response.comments) {
          const mappedComments = response.comments.map(c => mapBackendComment(c, userCommentVotes));
          const tree = buildCommentTree(mappedComments);
          setComments(sortComments(tree, commentSortBy));
        }
      }
    } catch (error) {
      console.error("Failed to load idea:", error);
      navigate('/ideas');
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [userVotes, userCommentVotes, navigate, buildCommentTree, sortComments, commentSortBy, generatingImages]);

  // Handle URL slug changes
  useEffect(() => {
    if (slug) {
      loadIdeaBySlug(slug);
    } else if (currentView === "idea-detail") {
      setCurrentView("ideas");
      setSelectedIdea(null);
    }
  }, [slug, loadIdeaBySlug]);

  // Re-sort comments when sort option changes
  useEffect(() => {
    if (comments.length > 0) {
      setComments(prev => sortComments([...prev], commentSortBy));
    }
  }, [commentSortBy]);

  // Switch view
  const switchView = (view: ViewType) => {
    setCurrentView(view);
    setSelectedIdea(null);
    switch (view) {
      case "ideas":
        navigate('/ideas');
        break;
      case "teams":
        navigate('/teams');
        break;
      case "explanation":
        navigate('/explanation');
        break;
      case "roadmap":
        navigate('/roadmap');
        break;
    }
  };

  // Handle idea click
  const handleIdeaClick = (idea: Idea) => {
    setSelectedIdea(idea);
    setCurrentView("idea-detail");
    navigate(`/ideas/${idea.slug}`);
    fetchComments(idea.id);
  };

  // Handle vote
  const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
    if (!userProfile.xConnected) {
      alert("Please connect your X account to vote");
      return;
    }

    const currentVote = userVotes[ideaId];
    const isNewVote = !currentVote;
    
    if (isNewVote && !canVoteToday()) {
      alert(`You've reached your daily limit of ${DAILY_VOTE_LIMIT} votes. Come back tomorrow!`);
      return;
    }

    try {
      const userId = getUserId();
      await backendSparkApi.voteIdea({
        id: ideaId,
        action: voteType === 'up' ? 'upvote' : 'downvote',
        userId,
        voteType,
        voterTwitterId: userProfile.xId,
        voterUsername: userProfile.xUsername
      });

      // Update local vote state
      const newVotes = { ...userVotes };
      if (currentVote === voteType) {
        delete newVotes[ideaId];
      } else {
        newVotes[ideaId] = voteType;
        if (isNewVote) {
          incrementDailyVoteCount();
          setRemainingVotes(getRemainingVotes());
        }
      }
      setUserVotes(newVotes);
      saveUserVotes(newVotes);

      // Update ideas list immediately with new vote state
      setIdeas(prevIdeas => prevIdeas.map(idea => {
        if (idea.id === ideaId) {
          const updatedIdea = { ...idea };
          const currentUpvotes = updatedIdea.upvotes;
          const currentDownvotes = updatedIdea.downvotes;
          
          // Update userVote immediately
          if (currentVote === voteType) {
            // Remove vote
            updatedIdea.userVote = null;
            if (voteType === 'up') {
              updatedIdea.upvotes = Math.max(0, currentUpvotes - 1);
            } else {
              updatedIdea.downvotes = Math.max(0, currentDownvotes - 1);
            }
          } else if (currentVote) {
            // Switch vote
            updatedIdea.userVote = voteType;
            if (currentVote === 'up' && voteType === 'down') {
              updatedIdea.upvotes = Math.max(0, currentUpvotes - 1);
              updatedIdea.downvotes = currentDownvotes + 1;
            } else if (currentVote === 'down' && voteType === 'up') {
              updatedIdea.downvotes = Math.max(0, currentDownvotes - 1);
              updatedIdea.upvotes = currentUpvotes + 1;
            }
          } else {
            // New vote
            updatedIdea.userVote = voteType;
            if (voteType === 'up') {
              updatedIdea.upvotes = currentUpvotes + 1;
            } else {
              updatedIdea.downvotes = currentDownvotes + 1;
            }
          }
          
          return updatedIdea;
        }
        return idea;
      }));

      // Update selected idea immediately if it's the one being voted on
      if (selectedIdea?.id === ideaId) {
        const updatedIdea = { ...selectedIdea };
        const currentUpvotes = updatedIdea.upvotes;
        const currentDownvotes = updatedIdea.downvotes;
        
        if (currentVote === voteType) {
          // Remove vote
          updatedIdea.userVote = null;
          if (voteType === 'up') {
            updatedIdea.upvotes = Math.max(0, currentUpvotes - 1);
          } else {
            updatedIdea.downvotes = Math.max(0, currentDownvotes - 1);
          }
        } else if (currentVote) {
          // Switch vote
          updatedIdea.userVote = voteType;
          if (currentVote === 'up' && voteType === 'down') {
            updatedIdea.upvotes = Math.max(0, currentUpvotes - 1);
            updatedIdea.downvotes = currentDownvotes + 1;
          } else if (currentVote === 'down' && voteType === 'up') {
            updatedIdea.downvotes = Math.max(0, currentDownvotes - 1);
            updatedIdea.upvotes = currentUpvotes + 1;
          }
        } else {
          // New vote
          updatedIdea.userVote = voteType;
          if (voteType === 'up') {
            updatedIdea.upvotes = currentUpvotes + 1;
          } else {
            updatedIdea.downvotes = currentDownvotes + 1;
          }
        }
        
        setSelectedIdea(updatedIdea);
      }

      // Note: Don't call fetchIdeas() here as it would use stale userVotes from closure
      // The optimistic update is already applied, and the useEffect will refresh if needed
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  // Handle comment vote
  const handleCommentVote = async (commentId: string, voteType: 'up' | 'down') => {
    if (!userProfile.xConnected) {
      alert("Please connect your X account to vote");
      return;
    }

    try {
      const userId = getUserId();
      
      // Update local state immediately for instant feedback
      const newVotes = { ...userCommentVotes };
      const previousVote = newVotes[commentId];
      
      // Toggle vote logic
      if (previousVote === voteType) {
        // Remove vote if clicking the same button
        delete newVotes[commentId];
      } else {
        // Set new vote
        newVotes[commentId] = voteType;
      }
      
      setUserCommentVotes(newVotes);
      saveUserCommentVotes(newVotes);

      // Update comments locally immediately
      const updateCommentVotes = (commentList: Comment[]): Comment[] => {
        return commentList.map(comment => {
          if (comment.id === commentId) {
            const currentUpvotes = comment.upvotes;
            const currentDownvotes = comment.downvotes;
            let newUpvotes = currentUpvotes;
            let newDownvotes = currentDownvotes;
            let newUserVote: 'up' | 'down' | null = voteType;

            // Handle vote toggle
            if (previousVote === 'up' && voteType === 'up') {
              // Remove upvote
              newUpvotes = Math.max(0, currentUpvotes - 1);
              newUserVote = null;
            } else if (previousVote === 'down' && voteType === 'down') {
              // Remove downvote
              newDownvotes = Math.max(0, currentDownvotes - 1);
              newUserVote = null;
            } else if (previousVote === 'up' && voteType === 'down') {
              // Switch from upvote to downvote
              newUpvotes = Math.max(0, currentUpvotes - 1);
              newDownvotes = currentDownvotes + 1;
            } else if (previousVote === 'down' && voteType === 'up') {
              // Switch from downvote to upvote
              newDownvotes = Math.max(0, currentDownvotes - 1);
              newUpvotes = currentUpvotes + 1;
            } else if (!previousVote && voteType === 'up') {
              // New upvote
              newUpvotes = currentUpvotes + 1;
            } else if (!previousVote && voteType === 'down') {
              // New downvote
              newDownvotes = currentDownvotes + 1;
            }

            return {
              ...comment,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              userVote: newUserVote,
            };
          }
          
          // Recursively update replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentVotes(comment.replies),
            };
          }
          
          return comment;
        });
      };

      setComments(prevComments => {
        const updated = updateCommentVotes(prevComments);
        return sortComments(updated, commentSortBy);
      });

      // Send vote to backend
      await fetch('/api/idea-comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: commentId,
          action: voteType === 'up' ? 'upvote' : 'downvote',
          userId,
          voteType,
          voterTwitterId: userProfile.xId,
          voterUsername: userProfile.xUsername
        })
      });

      // Note: Don't call fetchComments() here as it would use stale userCommentVotes from closure
      // The optimistic update is already applied above
    } catch (error) {
      console.error("Failed to vote on comment:", error);
      // Revert on error by refreshing from server
      if (selectedIdea) {
        fetchComments(selectedIdea.id);
      }
    }
  };

  // Handle submit comment
  const handleSubmitComment = async (content: string, parentCommentId?: string) => {
    if (!selectedIdea || !userProfile.xConnected) return;

    try {
      await backendSparkApi.submitIdeaComment({
        ideaId: selectedIdea.id,
        content,
        authorUsername: userProfile.xUsername || "anonymous",
        authorAvatar: userProfile.xAvatar,
        authorTwitterId: userProfile.xId,
        parentCommentId,
      });
      fetchComments(selectedIdea.id);
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  // Handle submit idea
  const handleSubmitIdea = async (newIdea: NewIdeaForm) => {
    if (!userProfile.xConnected) return;

    // Build description from form fields
    let description = "";
    if (newIdea.problem) {
      description += `**Problem:**\n${newIdea.problem}\n\n`;
    }
    if (newIdea.solution) {
      description += `**Solution:**\n${newIdea.solution}\n\n`;
    }
    if (newIdea.why) {
      description += `**Why (the deeper problem/thesis):**\n${newIdea.why}\n\n`;
    }
    if (newIdea.marketSize) {
      description += `**Market Size:**\n${newIdea.marketSize}\n\n`;
    }
    if (newIdea.competitors) {
      description += `**Competitors:**\n${newIdea.competitors}\n\n`;
    }

    // Use average of min and max for estimatedPrice (or max as primary)
    const estimatedPrice = newIdea.estimatedPriceMax;

    try {
      const result = await backendSparkApi.submitIdea({
        title: newIdea.idea,
        description: description.trim() || newIdea.idea,
        category: newIdea.category,
        authorUsername: userProfile.xUsername || "anonymous",
        authorAvatar: userProfile.xAvatar,
        authorTwitterId: userProfile.xId,
        estimatedPrice: estimatedPrice,
      });
      
      // Generate image and analysis in background (don't wait)
      if (result.id) {
        console.log("🖼️ [FRONTEND] New idea created, requesting image generation:", result.id, newIdea.idea);
        // Generate image
        fetch('/api/generate-idea-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId: result.id,
            title: newIdea.idea,
            description: description.trim() || newIdea.idea,
            category: newIdea.category,
            problem: newIdea.problem,
            solution: newIdea.solution,
          }),
        })
        .then(async (res) => {
          const data = await res.json();
          console.log("📥 [FRONTEND] New idea image generation response:", {
            status: res.status,
            success: data.success,
            imageUrl: data.imageUrl,
            cached: data.cached,
          });
        })
        .catch(err => {
          console.error('❌ [FRONTEND] Failed to generate image for new idea:', err);
        });

        // Generate market analysis
        fetch('/api/analyze-market-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId: result.id,
            title: newIdea.idea,
            description: description.trim() || newIdea.idea,
            category: newIdea.category,
            problem: newIdea.problem,
            solution: newIdea.solution,
            marketSize: newIdea.marketSize,
            competitors: newIdea.competitors,
          }),
        }).catch(err => console.error('Failed to analyze market:', err));
      }
      
      fetchIdeas();
      
      // Return the slug and title for the share popup
      return { slug: result.slug, title: newIdea.idea };
    } catch (error) {
      console.error("Failed to submit idea:", error);
      throw error;
    }
  };

  // Connect X
  const connectX = async () => {
    setIsConnectingX(true);
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();

      // Use localStorage instead of sessionStorage for mobile compatibility
      // Mobile browsers often clear sessionStorage on redirect to external sites
      localStorage.setItem('twitter_code_verifier', codeVerifier);
      localStorage.setItem('twitter_oauth_state', state);
      localStorage.setItem('twitter_oauth_timestamp', Date.now().toString());

      const redirectUri = `${window.location.origin}/ideas`;

      // Use backend API to generate OAuth URL (ensures proper configuration)
      const response = await fetch('/api/twitter-oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate OAuth URL');
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to initiate X connection:", error);
      alert(`Failed to connect to X: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the redirect URI ${window.location.origin}/ideas is registered in your Twitter Developer Portal.`);
      setIsConnectingX(false);
    }
  };

  // Disconnect X
  const disconnectX = () => {
    const newProfile: UserProfile = {
      ...userProfile,
      xId: undefined,
      xUsername: undefined,
      xName: undefined,
      xAvatar: undefined,
      xConnected: false,
    };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
  };

  // Connect Wallet using Solana Wallet Adapter Modal
  const connectWallet = () => {
    setIsWalletSelectorOpen(true);
  };
  
  // Handle wallet selected from modal
  const handleWalletSelected = async (address: string) => {
    const newProfile: UserProfile = {
      ...userProfile,
      walletAddress: address,
      walletConnected: true,
    };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    setIsWalletSelectorOpen(false);

    // Link wallet to Twitter user if connected
    if (userProfile.xConnected && userProfile.xId) {
      try {
        await fetch('/api/link-wallet-to-twitter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twitterId: userProfile.xId,
            walletAddress: address,
          }),
        }).catch(err => console.error('Failed to link wallet:', err));
      } catch (error) {
        console.error('Failed to link wallet to Twitter:', error);
      }
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    const newProfile: UserProfile = {
      ...userProfile,
      walletAddress: undefined,
      walletConnected: false,
    };
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
  };

  // Filter ideas by search and category
  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(idea.category);
    return matchesSearch && matchesCategory;
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the profile dropdown
      if (isProfileDropdownOpen && !target.closest('[data-profile-dropdown]')) {
        setIsProfileDropdownOpen(false);
      }
    };
    
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileDropdownOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSubmitModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Wallet Selector Modal */}
      <WalletSelector
        isOpen={isWalletSelectorOpen}
        onClose={() => setIsWalletSelectorOpen(false)}
        onWalletSelected={handleWalletSelected}
      />
      {/* Header */}
      <IdeasHeader
        currentView={currentView}
        onViewChange={switchView}
        userProfile={userProfile}
        remainingVotes={remainingVotes}
        isProfileDropdownOpen={isProfileDropdownOpen}
        setIsProfileDropdownOpen={setIsProfileDropdownOpen}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onConnectX={connectX}
        onDisconnectX={disconnectX}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        isConnectingX={isConnectingX}
        isConnectingWallet={isConnectingWallet}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-8">
        {/* Ideas List View */}
        {currentView === "ideas" && (
          <div className="animate-fade-in flex gap-8">
            {/* Left Sidebar */}
            <aside className="hidden md:block w-48 shrink-0">
              {/* Sort By */}
              <div className="mb-6">
                <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Sort By</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSortBy("votes")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === "votes"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
                    </svg>
                    Trending
                  </button>
                  <button
                    onClick={() => setSortBy("newest")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === "newest"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Newest
                  </button>
                  <button
                    onClick={() => setSortBy("oldest")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === "oldest"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Oldest
                  </button>
                  <button
                    onClick={() => setSortBy("raised")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === "raised"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Most Raised
                  </button>
                </div>
              </div>

              {/* Filter By */}
              <div className="mb-6">
                <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Filter By</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategories(new Set())}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedCategories.size === 0
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    All Categories
                  </button>
                  {ideaCategories.map((category) => {
                    const colors = categoryColors[category] || categoryColors["DeFi"];
                    const isSelected = selectedCategories.has(category);
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategories(prev => {
                            const next = new Set(prev);
                            if (isSelected) {
                              next.delete(category);
                            } else {
                              next.add(category);
                            }
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? `${colors.bg} ${colors.text} border ${colors.border}`
                            : "text-neutral-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Top Funding - Ideas closest to goal */}
              {(() => {
                const topFunding = ideas
                  .filter(i => i.estimatedPrice && i.estimatedPrice > 0 && i.raisedAmount && i.raisedAmount > 0)
                  .map(i => ({
                    ...i,
                    progress: ((i.raisedAmount || 0) / (i.estimatedPrice || 1)) * 100,
                  }))
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 3);

                if (topFunding.length === 0) return null;

                return (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Closest to Funding Goal</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {topFunding.map((idea) => {
                        const colors = categoryColors[idea.category] || categoryColors["AI x Crypto"];
                        return (
                          <div
                            key={idea.id}
                            onClick={() => handleIdeaClick(idea)}
                            className="relative rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group overflow-hidden"
                          >
                            {/* Image */}
                            <div className="h-44 bg-neutral-800/50">
                              {idea.generatedImageUrl ? (
                                <img
                                  src={idea.generatedImageUrl}
                                  alt={idea.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <TrendingUp className="w-8 h-8 text-emerald-500/20" />
                                </div>
                              )}
                            </div>
                            {/* Content */}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-emerald-100 transition-colors">
                                  {idea.title}
                                </h4>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
                                  {idea.category}
                                </span>
                              </div>
                              <div className="h-2 bg-neutral-800/50 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, idea.progress)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-emerald-400 font-semibold">{idea.progress.toFixed(0)}%</span>
                                <span className="text-neutral-500 flex items-center gap-0.5">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  {(idea.raisedAmount || 0).toLocaleString()} / {(idea.estimatedPrice || 0).toLocaleString()}
                                </span>
                              </div>
                              {/* Countdown */}
                              {(() => {
                                if (!idea.capReachedAt) return null;
                                const capDeadline = new Date(new Date(idea.capReachedAt).getTime() + 48 * 60 * 60 * 1000);
                                const timeLeft = Math.max(0, capDeadline.getTime() - now.getTime());
                                if (timeLeft === 0) {
                                  return (
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                                      <Lock className="w-3 h-3" />
                                      <span className="font-medium">Investment Round Closed</span>
                                    </div>
                                  );
                                }
                                const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                                const h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                                const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
                                const pad = (n: number) => n.toString().padStart(2, "0");
                                return (
                                  <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                                    <Timer className="w-3 h-3 text-yellow-400" />
                                    <span className="text-yellow-400 font-medium">Closes in</span>
                                    <span className="text-yellow-300 font-mono font-bold">{pad(d)}:{pad(h)}:{pad(m)}:{pad(s)}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search ideas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-neutral-900/50 border border-white/5 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* Mobile Sort Dropdown */}
              <div className="md:hidden mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-9 px-3 bg-neutral-900/50 border border-white/5 rounded-lg text-xs text-white"
                  >
                    <option value="votes">Trending</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="raised">Most Raised</option>
                  </select>
                </div>
              </div>

              {/* Ideas Grid */}
              {isLoadingIdeas ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  <span className="ml-3 text-sm text-neutral-400">Loading ideas...</span>
                </div>
              ) : filteredIdeas.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-neutral-400">No ideas found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onUpvote={(id) => handleVote(id, 'up')}
                      onDownvote={(id) => handleVote(id, 'down')}
                      onClick={() => handleIdeaClick(idea)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idea Detail View */}
        {currentView === "idea-detail" && (
          <>
            {isLoadingIdeas ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                <span className="ml-3 text-sm text-neutral-400">Loading idea...</span>
              </div>
            ) : selectedIdea ? (
              <IdeaDetailView
                idea={selectedIdea}
                comments={comments}
                isLoadingComments={isLoadingComments}
                onBack={() => switchView("ideas")}
                onUpvote={(id) => handleVote(id, 'up')}
                onDownvote={(id) => handleVote(id, 'down')}
                onCommentVote={handleCommentVote}
                onSubmitComment={handleSubmitComment}
                onShare={() => setIsShareModalOpen(true)}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                userProfile={userProfile}
                commentSortBy={commentSortBy}
                setCommentSortBy={setCommentSortBy}
                onConnectWallet={connectWallet}
                isConnectingWallet={isConnectingWallet}
              />
            ) : null}
          </>
        )}

        {/* Teams View */}
        {currentView === "teams" && <TeamsView />}

        {/* Explanation View */}
        {currentView === "explanation" && <ExplanationView />}

        {/* Roadmap View */}
        {currentView === "roadmap" && <RoadmapView />}
      </main>

      {/* Modals */}
      <SubmitIdeaModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitIdea}
        userProfile={userProfile}
        onConnectX={connectX}
        isConnectingX={isConnectingX}
      />

      {selectedIdea && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          idea={selectedIdea}
        />
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
