import { ScrollRestoration, useNavigate } from "react-router-dom"
import { Button } from "@/components/Button/Button"
import { Icon } from "@/components/Icon/Icon"
import { useState, useEffect } from 'react';
import { ROUTES } from "@/utils/routes"
import { useQuery } from "@tanstack/react-query"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"
import { ConnectButton } from "@/components/Header/ConnectButton"
import { backendSparkApi, TwitterUser, LeaderboardEntry, GetTotalFeesResponse } from "@/data/api/backendSparkApi"
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth'
import { getCorrectWalletAddress } from "@/utils/walletUtils"
import { CreatorRewardModal } from "@/components/Modal/CreatorRewardModal"
import { SimpleModal } from "@/components/Modal/SimpleModal"
import { useWalletContext } from "@/hooks/useWalletContext"

const ClaimFees = () => {
  const navigate = useNavigate();
  const { isDesktop } = useDeviceDetection();
  const [connectedTwitterAccount, setConnectedTwitterAccount] = useState<string | null>(null);
  const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Privy wallet connection
  const { user: privyUser, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  
  // Standard wallet connection
  const { address: walletAddress, isWalletConnected, connectWithPhantom, connectWithBackpack, connectWithSolflare } = useWalletContext();
  
  // Modal state
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [totalFeesData, setTotalFeesData] = useState<GetTotalFeesResponse | null>(null);

  // Fetch creators data only when Twitter is connected
  const { refetch: creatorsRefetch } = useQuery({
    queryFn: () => backendSparkApi.getCreators(),
    queryKey: ["getCreators"],
    enabled: Boolean(connectedTwitterAccount), // Only fetch when Twitter is connected
  });

  // Fetch total fees data
  const { isLoading: totalFeesLoading, refetch: totalFeesRefetch } = useQuery({
    queryFn: () => backendSparkApi.getTotalFees({ twitterAccount: connectedTwitterAccount! }),
    queryKey: ["getTotalFees", connectedTwitterAccount],
    enabled: Boolean(connectedTwitterAccount), // Only fetch when Twitter is connected
  });

  // Effect to fetch total fees when connected
  useEffect(() => {
    if (connectedTwitterAccount) {
      backendSparkApi.getTotalFees({ twitterAccount: connectedTwitterAccount })
        .then(data => setTotalFeesData(data))
        .catch(error => console.error('Failed to fetch total fees:', error));
    }
  }, [connectedTwitterAccount]);

  // Function to refresh total fees data
  const handleRefreshFees = async () => {
    if (connectedTwitterAccount) {
      setIsRefreshing(true);
      try {
        const updatedData = await backendSparkApi.getTotalFees({ twitterAccount: connectedTwitterAccount });
        setTotalFeesData(updatedData);
        console.log('✅ Refreshed fees data:', updatedData);
      } catch (error) {
        console.error('❌ Failed to refresh fees data:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryFn: () => backendSparkApi.getLeaderboard(),
    queryKey: ["getLeaderboard"],
    enabled: Boolean(connectedTwitterAccount), // Only fetch when Twitter is connected
  });

  // Generate PKCE code challenge and verifier
  const generateCodeChallenge = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return codeVerifier;
  };

  const generateCodeChallengeFromVerifier = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const handleTwitterConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Generate PKCE parameters
      const codeVerifier = generateCodeChallenge();
      const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store PKCE parameters in sessionStorage
      sessionStorage.setItem('twitter_code_verifier', codeVerifier);
      sessionStorage.setItem('twitter_state', state);
      
      // Get OAuth URL from backend
      const { authUrl } = await backendSparkApi.getTwitterOAuthUrl({
        redirect_uri: `${window.location.origin}/claimfees`,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      
      // Redirect to Twitter OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Failed to start Twitter OAuth:', error);
      setIsConnecting(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('Twitter OAuth error:', error);
      return;
    }
    
    if (code && state) {
      const storedState = sessionStorage.getItem('twitter_state');
      const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
      
      if (state === storedState && codeVerifier) {
        // Exchange code for token
        backendSparkApi.exchangeTwitterOAuthToken({
          code,
          redirect_uri: `${window.location.origin}/claimfees`,
          code_verifier: codeVerifier
        })
          .then((response) => {
            setTwitterUser(response.user);
            setConnectedTwitterAccount(`@${response.user.username}`);
            setIsConnecting(false);
            
            // Clean up sessionStorage
            sessionStorage.removeItem('twitter_code_verifier');
            sessionStorage.removeItem('twitter_state');
            
            // Clean up URL
            window.history.replaceState({}, document.title, '/claimfees');
          })
          .catch((error) => {
            console.error('Failed to exchange Twitter OAuth token:', error);
            setIsConnecting(false);
          });
      }
    }
  }, []);

  // Get wallet address from either Privy or standard wallet connection
  const getWalletAddress = () => {
    // First check standard wallet connection
    if (isWalletConnected && walletAddress) {
      return walletAddress;
    }
    
    // Fall back to Privy wallet
    return getCorrectWalletAddress(privyUser, wallets);
  };

  const handleClaimAllFees = () => {
    const currentWalletAddress = getWalletAddress();
    
    if (!currentWalletAddress) {
      alert('Please connect your wallet first to claim creator rewards.');
      return;
    }
    
    // Check if either wallet type is connected
    const isAnyWalletConnected = isWalletConnected || authenticated;
    
    if (!isAnyWalletConnected) {
      alert('Please connect your wallet first to claim creator rewards.');
      return;
    }
    
    if (!connectedTwitterAccount) {
      alert('Please connect your Twitter account first.');
      return;
    }
    
    setRewardModalOpen(true);
  };

  const handleCloseModal = () => {
    setRewardModalOpen(false);
    // Refetch data to update fees after claiming
    creatorsRefetch();
    totalFeesRefetch();
  };

  const handleDisconnectTwitter = () => {
    setConnectedTwitterAccount(null);
    setTwitterUser(null);
    // Clear any stored tokens or session data
    sessionStorage.removeItem('twitter_code_verifier');
    sessionStorage.removeItem('twitter_state');
    // Clean up URL if there are any OAuth parameters
    window.history.replaceState({}, document.title, '/claimfees');
  };

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center bg-accent pt-[48px] font-normal text-fg-primary lg:pt-[72px]">
      <div className="absolute left-4 top-4 z-50">
        <Button
          onClick={() => {
            navigate(ROUTES.PROFILE, { state: { from: ROUTES.CLAIM_FEES } })
          }}
          size="lg"
          className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
        >
          <Icon icon="SvgGear" className="text-xl text-fg-primary" />
        </Button>
      </div>
      <div className="absolute right-4 top-4 z-50">
        <ConnectButton 
          size="lg"
          color="primary"
          btnClassName="flex-1 bg-brand-primary hover:bg-brand-primary/80"
        />
      </div>
      <section className={`z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px] ${isDesktop ? 'max-w-[1400px]' : ''}`}>
        <div className="flex w-full flex-col items-center">
          <h2 className={`font-medium tracking-[-0.4px] mb-8 ${isDesktop ? 'text-[56px] leading-[60px]' : 'text-[40px] leading-[48px] md:text-[68px] md:leading-[74px]'}`}>
            <span className="text-brand-primary">Claim Fees</span>
          </h2>

          {/* Connected User Profile */}
          {connectedTwitterAccount && twitterUser && (
            <div className="w-full max-w-2xl mb-8">
              <div className="bg-secondary rounded-xl p-6">
                <h3 className={`font-medium mb-4 ${isDesktop ? 'text-2xl' : 'text-xl'}`}>Connected</h3>
                
                <div className="flex items-center gap-4">
                  <img 
                    src={twitterUser.profile_image_url ? 
                      twitterUser.profile_image_url.replace('_normal', '_400x400') : 
                      '/default-avatar.png'
                    } 
                    alt={twitterUser.name}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{twitterUser.name}</h4>
                    <div className="flex items-center justify-between">
                      <p className="text-fg-secondary">{connectedTwitterAccount}</p>
                      <Button
                        onClick={handleDisconnectTwitter}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
                

              </div>
            </div>
          )}

          {/* User's Total Fees Summary */}
          {connectedTwitterAccount && (
            <div className="w-full max-w-4xl mb-8">
              <h3 className={`font-medium mb-6 ${isDesktop ? 'text-3xl' : 'text-2xl'}`}>Your Creator Rewards</h3>
              
              {totalFeesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : totalFeesData ? (
                <div className="space-y-6">
                  {/* Fees Summary */}
                  <div className="bg-secondary rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Fees Summary</h3>
                      <Button
                        onClick={handleRefreshFees}
                        disabled={isRefreshing}
                        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 text-sm"
                      >
                        {isRefreshing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Refreshing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Icon icon="SvgLoader" className="w-4 h-4" />
                            Refresh
                          </div>
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-fg-secondary text-sm mb-2">Total Fees Generated</p>
                        <p className="text-2xl font-bold text-white">{totalFeesData.totalFeesEarned.toFixed(4)} SOL</p>
                      </div>
                      <div className="text-center">
                        <p className="text-fg-secondary text-sm mb-2">Already Claimed</p>
                        <p className="text-2xl font-bold text-yellow-400">{totalFeesData.totalFeesClaimed.toFixed(4)} SOL</p>
                      </div>
                      <div className="text-center">
                        <p className="text-fg-secondary text-sm mb-2">Available to Claim</p>
                        <p className="text-2xl font-bold text-green-400">{totalFeesData.availableToClaim.toFixed(4)} SOL</p>
                      </div>
                    </div>
                    
                    {/* Claim Button */}
                    <div className="flex justify-center mt-6">
                      <Button
                        onClick={!(isWalletConnected || authenticated) ? () => setWalletModalOpen(true) : handleClaimAllFees}
                        size="lg"
                        className="bg-green-500 hover:bg-green-600 px-8 py-3"
                        disabled={(isWalletConnected || authenticated) && totalFeesData.availableToClaim <= 0}
                      >
                        {!(isWalletConnected || authenticated) 
                          ? 'Connect wallet'
                          : totalFeesData.availableToClaim > 0 
                            ? `Claim Reward (${totalFeesData.availableToClaim.toFixed(4)} SOL)` 
                            : 'No Reward to Claim'
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Token Breakdown */}
                  {totalFeesData.tokenBreakdown && totalFeesData.tokenBreakdown.length > 0 && (
                    <div className="bg-tertiary rounded-xl p-6">
                      <h4 className="font-semibold text-lg mb-4">Token Breakdown</h4>
                      <div className="space-y-3">
                        {totalFeesData.tokenBreakdown.map((token, index) => (
                          <div key={index} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center">
                                <Icon icon="SvgBorgCoin" className="text-sm text-brand-primary" />
                              </div>
                              <span className="font-medium">{token.tokenName}</span>
                            </div>
                            <span className="text-fg-secondary">{token.feesEarned.toFixed(4)} SOL</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-fg-secondary">
                  <Icon icon="SvgBorgCoin" className="text-4xl mx-auto mb-4 opacity-50" />
                  <p>No tokens created yet</p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          {connectedTwitterAccount && (
            <div className="w-full max-w-4xl">
              <h3 className={`font-medium mb-6 ${isDesktop ? 'text-3xl' : 'text-2xl'}`}>Top Fee Generators</h3>
              
              {leaderboardLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {(leaderboardData?.leaderboard || []).map((user: LeaderboardEntry, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-6 bg-secondary rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          user.rank === 1 ? 'bg-yellow-500' : 
                            user.rank === 2 ? 'bg-gray-400' : 
                            'bg-orange-600'
                        }`}>
                          {user.rank}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{user.username}</h4>
                          <p className="text-fg-secondary">{user.feesGeneratedSOL ? user.feesGeneratedSOL.toFixed(4) : (user.feesGenerated / 230).toFixed(4)} SOL in fees</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm text-fg-secondary">Rank #{user.rank}</span>
                      </div>
                    </div>
                  ))}
                  
                  {leaderboardData?.leaderboard.length === 0 && (
                    <div className="text-center py-12 text-fg-secondary">
                      <Icon icon="SvgTrophy" className="text-4xl mx-auto mb-4 opacity-50" />
                      <p>No leaderboard data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show message when Twitter is not connected */}
          {!connectedTwitterAccount && (
            <div className="w-full max-w-2xl text-center py-12">
              <Icon icon="SvgTwitter" className="text-6xl mx-auto mb-6 text-orange-500 opacity-80" />
              <h3 className={`font-medium mb-4 ${isDesktop ? 'text-2xl' : 'text-xl'}`}>Connect Your Twitter First</h3>
              <p className="text-fg-secondary mb-8">
                Please connect your Twitter account to view and claim fees from token creators.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleTwitterConnect}
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Twitter'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* Creator Reward Modal */}
      {totalFeesData && connectedTwitterAccount && (
        <CreatorRewardModal
          isOpen={rewardModalOpen}
          onClose={handleCloseModal}
          totalFeesData={totalFeesData}
          twitterAccount={connectedTwitterAccount}
          walletAddress={getWalletAddress() || ''}
        />
      )}

      {/* Wallet Connection Modal */}
      {walletModalOpen && (
        <SimpleModal
          className="md:w-1/2"
          showCloseBtn={true}
          title="Connect a Solana Wallet"
          onClose={() => setWalletModalOpen(false)}
        >
          <div className="flex flex-col items-center justify-center max-sm:h-full">
            <div className="flex w-full grow flex-col justify-start px-4 pt-4 lg:px-10 lg:pt-10">
              <div className="flex w-full flex-col items-center justify-center lg:flex-row gap-4 md:gap-3">
                <WalletProvider icon="SvgPhantom" label="Phantom" onClick={() => { connectWithPhantom(); setWalletModalOpen(false); }} />
                <WalletProvider icon="SvgBackpack" label="Backpack" onClick={() => { connectWithBackpack(); setWalletModalOpen(false); }} />
                <WalletProvider icon="SvgSolflare" label="Solflare" onClick={() => { connectWithSolflare(); setWalletModalOpen(false); }} />
              </div>
            </div>
          </div>
        </SimpleModal>
      )}
      
      <ScrollRestoration />
    </main>
  )
}

// Wallet Provider Component for modal
type WalletProviderProps = {
  icon: 'SvgPhantom' | 'SvgBackpack' | 'SvgSolflare'
  label: string
  onClick: () => void
}

function WalletProvider({ icon, label, onClick }: WalletProviderProps) {
  return (
    <div 
      onClick={onClick} 
      className="flex flex-col items-center justify-center gap-4 p-[40px] w-full border border-bd-primary rounded-2xl hover:bg-tertiary cursor-pointer"
    >
      <Icon className="text-[60px]" icon={icon} />
      <p className="text-body-l-medium text-white">{label}</p>
    </div>
  )
}

export default ClaimFees 