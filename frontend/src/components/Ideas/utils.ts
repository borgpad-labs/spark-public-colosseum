// Ideas Feature Utilities

import { UserProfile, UserVotes, UserCommentVotes, DailyVoteTracker } from './types';

// ============================================
// User Profile Functions
// ============================================

export const loadUserProfile = (): UserProfile => {
  const stored = localStorage.getItem("spark_user_profile");
  if (stored) {
    return JSON.parse(stored);
  }
  return { xConnected: false, walletConnected: false };
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem("spark_user_profile", JSON.stringify(profile));
};

// ============================================
// PKCE OAuth Functions
// ============================================

export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// ============================================
// Vote Storage Functions
// ============================================

export const loadUserVotes = (): UserVotes => {
  const stored = localStorage.getItem("spark_user_votes");
  return stored ? JSON.parse(stored) : {};
};

export const saveUserVotes = (votes: UserVotes) => {
  localStorage.setItem("spark_user_votes", JSON.stringify(votes));
};

export const loadUserCommentVotes = (): UserCommentVotes => {
  const stored = localStorage.getItem("spark_user_comment_votes");
  return stored ? JSON.parse(stored) : {};
};

export const saveUserCommentVotes = (votes: UserCommentVotes) => {
  localStorage.setItem("spark_user_comment_votes", JSON.stringify(votes));
};

// ============================================
// Daily Vote Limit Functions
// ============================================

export const DAILY_VOTE_LIMIT = 5;

export const loadDailyVotes = (): DailyVoteTracker => {
  const stored = localStorage.getItem("spark_daily_votes");
  if (!stored) return { date: new Date().toDateString(), count: 0 };
  
  const data = JSON.parse(stored) as DailyVoteTracker;
  const today = new Date().toDateString();
  
  if (data.date !== today) {
    return { date: today, count: 0 };
  }
  return data;
};

export const saveDailyVotes = (tracker: DailyVoteTracker) => {
  localStorage.setItem("spark_daily_votes", JSON.stringify(tracker));
};

export const canVoteToday = (): boolean => {
  const tracker = loadDailyVotes();
  return tracker.count < DAILY_VOTE_LIMIT;
};

export const getRemainingVotes = (): number => {
  const tracker = loadDailyVotes();
  return Math.max(0, DAILY_VOTE_LIMIT - tracker.count);
};

export const incrementDailyVoteCount = () => {
  const tracker = loadDailyVotes();
  tracker.count += 1;
  saveDailyVotes(tracker);
};

// ============================================
// Time Formatting
// ============================================

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// ============================================
// User ID Generation
// ============================================

export const getUserId = (): string => {
  let id = localStorage.getItem("spark_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("spark_user_id", id);
  }
  return id;
};
