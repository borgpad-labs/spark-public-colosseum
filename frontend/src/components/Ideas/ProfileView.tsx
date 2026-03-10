import { Twitter, Wallet, LogOut, Loader2, User, Check, X } from "lucide-react";
import { UserProfile } from "./types";

interface ProfileViewProps {
  userProfile: UserProfile;
  onConnectX: () => void;
  onDisconnectX: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  isConnectingX: boolean;
  isConnectingWallet: boolean;
}

export function ProfileView({
  userProfile,
  onConnectX,
  onDisconnectX,
  onConnectWallet,
  onDisconnectWallet,
  isConnectingX,
  isConnectingWallet,
}: ProfileViewProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900/50 border border-white/5 mb-4">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Your Profile</h2>
        <p className="text-sm text-neutral-500">Manage your connected accounts</p>
      </div>

      <div className="space-y-4">
        {/* X/Twitter Connection */}
        <div className="p-5 rounded-xl bg-neutral-900/30 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                userProfile.xConnected ? "bg-blue-500/10 border border-blue-500/20" : "bg-neutral-800 border border-white/5"
              }`}>
                <Twitter className={`w-6 h-6 ${userProfile.xConnected ? "text-blue-400" : "text-neutral-500"}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-0.5">X (Twitter)</h3>
                {userProfile.xConnected ? (
                  <div className="flex items-center gap-2">
                    <img src={userProfile.xAvatar} alt={userProfile.xUsername} className="w-5 h-5 rounded-full" />
                    <span className="text-xs text-blue-400">@{userProfile.xUsername}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">Connect to vote, comment, and submit ideas</p>
                )}
              </div>
            </div>
            {userProfile.xConnected ? (
              <button
                onClick={onDisconnectX}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={onConnectX}
                disabled={isConnectingX}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                {isConnectingX ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Twitter className="w-3.5 h-3.5" />
                    Connect
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="p-5 rounded-xl bg-neutral-900/30 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                userProfile.walletConnected ? "bg-purple-500/10 border border-purple-500/20" : "bg-neutral-800 border border-white/5"
              }`}>
                <Wallet className={`w-6 h-6 ${userProfile.walletConnected ? "text-purple-400" : "text-neutral-500"}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-0.5">Solana Wallet</h3>
                {userProfile.walletConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400 font-mono">
                      {userProfile.walletAddress?.slice(0, 4)}...{userProfile.walletAddress?.slice(-4)}
                    </span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">Connect to invest in ideas with USDC</p>
                )}
              </div>
            </div>
            {userProfile.walletConnected ? (
              <button
                onClick={onDisconnectWallet}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={isConnectingWallet}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
              >
                {isConnectingWallet ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    Connect
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Link Accounts Notice */}
        {userProfile.xConnected && userProfile.walletConnected && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-1">Accounts Linked</h4>
                <p className="text-xs text-neutral-400">
                  Your X account and wallet are now linked. You can vote, comment, submit ideas, and invest in projects.
                </p>
              </div>
            </div>
          </div>
        )}

        {!userProfile.xConnected && !userProfile.walletConnected && (
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-orange-400 mb-1">No Accounts Connected</h4>
                <p className="text-xs text-neutral-400">
                  Connect your X account to participate in voting and discussions. Connect your wallet to invest in ideas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileView;
