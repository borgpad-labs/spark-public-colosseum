import { Link, useLocation } from "react-router-dom";
import { Lightbulb, Users, User, Wallet, LogOut, Twitter, Loader2, Send } from "lucide-react";
import { UserProfile, ViewType } from "./types";
import { DAILY_VOTE_LIMIT } from "./utils";

interface IdeasHeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  userProfile: UserProfile;
  remainingVotes: number;
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (open: boolean) => void;
  onOpenSubmitModal: () => void;
  onConnectX: () => void;
  onDisconnectX: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  isConnectingX: boolean;
  isConnectingWallet: boolean;
}

export function IdeasHeader({
  currentView,
  onViewChange,
  userProfile,
  remainingVotes,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  onOpenSubmitModal,
  onConnectX,
  onDisconnectX,
  onConnectWallet,
  onDisconnectWallet,
  isConnectingX,
  isConnectingWallet,
}: IdeasHeaderProps) {
  const location = useLocation();
  
  const navItems = [
    { id: "ideas" as ViewType, label: "Ideas", icon: Lightbulb, path: "/ideas" },
    { id: "teams" as ViewType, label: "Teams", icon: Users, path: "/teams" },
    { id: "explanation" as ViewType, label: "Explanation", icon: Lightbulb, path: "/explanation" },
  ];

  // Determine active nav item from current path
  const getActiveView = () => {
    const path = location.pathname;
    if (path === "/teams") return "teams";
    if (path === "/agents" || path.startsWith("/agents/")) return "agents";
    if (path === "/explanation") return "explanation";
    if (path === "/roadmap") return "roadmap";
    if (path === "/ideas" || path.startsWith("/ideas/")) return "ideas";
    return currentView;
  };
  
  const activeView = getActiveView();

  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/ideas" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/sparklogo.png" alt="Spark" className="h-8 w-auto" />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === item.id
                    ? "bg-white/10 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
            <div className="w-px h-4 bg-white/10 mx-1" />
            <a
              href="https://x.com/sparkdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="X (Twitter)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://t.me/sparkdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Telegram"
            >
              <Send className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Remaining Votes */}
            {userProfile.xConnected && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900/50 border border-white/5">
                <span className="text-[10px] font-medium text-neutral-400">
                  {remainingVotes}/{DAILY_VOTE_LIMIT} votes left
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={onOpenSubmitModal}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-black text-xs font-semibold rounded-lg hover:bg-orange-400 transition-colors"
            >
              Submit Idea
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 bg-black/20 rounded text-[9px] font-mono">
                /
              </kbd>
            </button>

            {/* Profile Dropdown */}
            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900/50 border border-white/5 hover:border-white/10 transition-colors"
              >
                {userProfile.xConnected ? (
                  <img src={userProfile.xAvatar} alt={userProfile.xUsername} className="w-6 h-6 rounded-md" />
                ) : (
                  <User className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)} 
                  />
                  <div 
                    className="absolute right-0 mt-2 w-72 py-2 bg-neutral-900/95 border border-white/10 rounded-xl shadow-2xl z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Your Profile</p>

                      {/* X Connection */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            userProfile.xConnected ? "bg-blue-500/10" : "bg-neutral-800"
                          }`}>
                            <Twitter className={`w-4 h-4 ${userProfile.xConnected ? "text-blue-400" : "text-neutral-500"}`} />
                          </div>
                          <div>
                            {userProfile.xConnected ? (
                              <>
                                <p className="text-xs font-medium text-white">{userProfile.xName}</p>
                                <p className="text-[10px] text-blue-400">@{userProfile.xUsername}</p>
                              </>
                            ) : (
                              <p className="text-xs text-neutral-400">X not connected</p>
                            )}
                          </div>
                        </div>
                        {userProfile.xConnected ? (
                          <button
                            onClick={onDisconnectX}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={onConnectX}
                            disabled={isConnectingX}
                            className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {isConnectingX ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                          </button>
                        )}
                      </div>

                      {/* Wallet Connection */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            userProfile.walletConnected ? "bg-purple-500/10" : "bg-neutral-800"
                          }`}>
                            <Wallet className={`w-4 h-4 ${userProfile.walletConnected ? "text-purple-400" : "text-neutral-500"}`} />
                          </div>
                          <div>
                            {userProfile.walletConnected ? (
                              <>
                                <p className="text-xs font-medium text-white">Wallet</p>
                                <p className="text-[10px] text-purple-400 font-mono">
                                  {userProfile.walletAddress?.slice(0, 4)}...{userProfile.walletAddress?.slice(-4)}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-neutral-400">Wallet not connected</p>
                            )}
                          </div>
                        </div>
                        {userProfile.walletConnected ? (
                          <button
                            onClick={onDisconnectWallet}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={onConnectWallet}
                            disabled={isConnectingWallet}
                            className="text-[10px] font-medium text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            {isConnectingWallet ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Menu Items */}
                    {userProfile.xConnected && (
                      <div className="px-2 py-2">
                        <Link
                          to={`/profile/${userProfile.xUsername}`}
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <User className="w-3.5 h-3.5" />
                          View Profile
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default IdeasHeader;
