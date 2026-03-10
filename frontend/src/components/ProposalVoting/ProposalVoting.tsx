import React, { useState, useEffect } from 'react';
import { DaoProposalModel, DaoModel } from '../../../shared/models';
import { ApplicationResponse } from '../../data/api/backendSparkApi';
import Text from '../Text';
import { Button } from '../Button/Button';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import GovernanceService from '../../services/governanceService';
import { getCorrectWalletAddress } from '@/utils/walletUtils';
import { backendSparkApi } from '../../data/api/backendSparkApi';
import { toast } from 'react-toastify';
import { Icon } from '../Icon/Icon';
import { getPhantomProvider } from '@/services/phantomService';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { useQuery } from '@tanstack/react-query';
import { isVotingOpen } from '@/utils/proposalUtils';

interface ProposalVotingProps {
  proposal: DaoProposalModel;
  dao: DaoModel;
  className?: string;
}

const ProposalVoting: React.FC<ProposalVotingProps> = ({ proposal, dao, className = "" }) => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const location = useLocation();
  
  // Check if we're in Discover mode (came from Discover page)
  const isDiscoverMode = () => {
    const state = location.state as { from?: string } | null
    return state?.from === ROUTES.DISCOVER
  }
  
  // Check if Solana wallet is connected in Discover mode
  const isSolanaConnected = () => {
    if (isDiscoverMode()) {
      const provider = getPhantomProvider()
      return provider && provider.isConnected && provider.publicKey
    }
    return false
  }
  
  // Check if user is authenticated via Privy OR connected via Solana wallet in Discover mode
  const isAuthenticated = authenticated || isSolanaConnected()
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [userVoteOption, setUserVoteOption] = useState<number | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);

  const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(RPC_URL);
  const governanceService = new GovernanceService(RPC_URL);
  
  // Get the correct wallet address for queries - handle Discover mode
  const correctWalletAddress = (() => {
    if (isDiscoverMode() && isSolanaConnected()) {
      const provider = getPhantomProvider()
      return provider?.publicKey?.toString() || null
    }
    return getCorrectWalletAddress(user, wallets)
  })();
  
  // Fetch governance data to check voting power
  const { data: governanceData } = useQuery({
    queryFn: () =>
      backendSparkApi.getGovernanceData({
        userAddress: correctWalletAddress || "",
        realmAddress: dao.address,
        tokenMint: dao.communityMint,
        cluster: "mainnet"
      }),
    queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint],
    enabled: Boolean(isAuthenticated && correctWalletAddress && dao.address && dao.communityMint),
    refetchInterval: false,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });
  
  const govVotingPower = governanceData?.success ? governanceData.votingPower : 0;
  
  // Debug logging
  useEffect(() => {
    console.log('ProposalVoting Debug:', {
      isDiscoverMode: isDiscoverMode(),
      isSolanaConnected: isSolanaConnected(),
      isAuthenticated,
      correctWalletAddress,
      govVotingPower,
      hasVoted,
      userVote,
      userVoteOption
    });
  }, [isAuthenticated, correctWalletAddress, govVotingPower, hasVoted, userVote, userVoteOption]);

  // Get Solana wallet from Privy using the correct wallet selection logic
  const getSolanaWallet = () => {
    if (isDiscoverMode() && isSolanaConnected()) {
      // In Discover mode, return the Phantom provider
      const provider = getPhantomProvider()
      if (provider && provider.isConnected && provider.publicKey) {
        console.log("Using Solana wallet in Discover mode:", provider.publicKey.toString());
        return {
          address: provider.publicKey.toString(),
          signTransaction: provider.signTransaction.bind(provider)
        };
      }
    }
    
    // Fall back to Privy wallet
    const correctWalletAddress = getCorrectWalletAddress(user, wallets);
    if (correctWalletAddress) {
      const correctWallet = wallets.find(w => w.address === correctWalletAddress);
      if (correctWallet) {
        console.log("Using Privy wallet:", correctWallet.address, correctWallet.walletClientType);
        return correctWallet;
      }
    }
    return null;
  };

  // Check if proposal is in voting state
  // Check if voting is open and not expired
  const votingIsOpen = isVotingOpen(proposal, dao);

  // Check if this is a multi-choice proposal (only for specific cases)
  const isMultiChoice = proposal.options && 
    proposal.options.length > 2 && 
    (proposal.name && proposal.name.toLowerCase().includes('choose'));

  // Format option label for display
  const formatOptionLabel = (label: string) => {
    if (label === '$$_NOTA_$$') {
      return 'None of the Above';
    }
    return label;
  };

  // Format proposal state
  const getProposalStateDisplay = () => {
    if (!proposal.state) return 'Unknown';
    if (typeof proposal.state === 'object') {
      const stateKey = Object.keys(proposal.state)[0];
      return stateKey.charAt(0).toUpperCase() + stateKey.slice(1);
    }
    return proposal.state;
  };

  // Format vote numbers to be human readable (divide by 10^9 for most Solana tokens)
  const formatVoteCount = (voteWeight: string | number): string => {
    const weight = typeof voteWeight === 'string' ? parseInt(voteWeight) : voteWeight;
    if (weight === 0) return "0";
    
    // Assume 9 decimal places for most Solana tokens
    const formatted = weight / 1000000000;
    
    if (formatted >= 1000000) {
      return `${(formatted / 1000000).toFixed(1)}M`;
    } else if (formatted >= 1000) {
      return `${(formatted / 1000).toFixed(1)}K`;
    } else {
      return formatted.toFixed(1);
    }
  };

  // Find matching application for a proposal option
  const findMatchingApplication = (optionLabel: string): ApplicationResponse | null => {
    if (!applications || applications.length === 0) return null;
    
    // Try to match by deliverable name first
    let match = applications.find(app => 
      app.deliverableName.toLowerCase().includes(optionLabel.toLowerCase()) ||
      optionLabel.toLowerCase().includes(app.deliverableName.toLowerCase())
    );
    
    if (match) return match;
    
    // Try to match by GitHub username
    match = applications.find(app => 
      optionLabel.toLowerCase().includes(app.githubUsername.toLowerCase()) ||
      app.githubUsername.toLowerCase().includes(optionLabel.toLowerCase())
    );
    
    return match || null;
  };

  // Load applications for this DAO/project
  useEffect(() => {
    const loadApplications = async () => {
      if (!dao.address) return;
      
      setIsLoadingApplications(true);
      try {
        // Try to get applications by DAO address as project ID
        const response = await backendSparkApi.getApplicationsByProjectId({ projectId: dao.address });
        setApplications(response.applications || []);
      } catch (error) {
        console.error("Error loading applications:", error);
        setApplications([]);
      } finally {
        setIsLoadingApplications(false);
      }
    };

    loadApplications();
  }, [dao.address]);

  // Check user's vote status
  useEffect(() => {
    const checkUserVote = async () => {
      if (!isAuthenticated) return;

      // Get the correct wallet address - handle Discover mode
      let correctWalletAddress: string | null = null;
      if (isDiscoverMode() && isSolanaConnected()) {
        const provider = getPhantomProvider()
        correctWalletAddress = provider?.publicKey?.toString() || null
      } else {
        correctWalletAddress = getCorrectWalletAddress(user, wallets)
      }
      
      if (!correctWalletAddress) return;

      try {
        const userPubkey = new PublicKey(correctWalletAddress);
        const realmPubkey = new PublicKey(dao.address);
        const proposalPubkey = new PublicKey(proposal.address);
        const communityMint = new PublicKey(dao.communityMint);

        const { hasVoted: voted, vote } = await governanceService.getUserVoteRecord(
          userPubkey,
          realmPubkey,
          proposalPubkey,
          communityMint
        );

        setHasVoted(voted);
        // Convert governance vote to UI vote format
        if (vote === 'approve') {
          setUserVote('yes');
        } else if (vote === 'deny') {
          setUserVote('no');
        } else {
          setUserVote(null);
        }
      } catch (error) {
        console.error("Error checking vote status:", error);
      }
    };

    checkUserVote();
  }, [isAuthenticated, user, wallets, dao.address, proposal.address, dao.communityMint]);

  // Don't render if voting is not open
  if (!votingIsOpen) {
    return null;
  }

  const handleVote = async (voteType: 'approve' | 'deny', optionIndex?: number) => {
    if (!isAuthenticated) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Get the correct wallet
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) {
      toast.error("No Solana wallet found");
      return;
    }

    setIsVoting(true);
    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      const realmPubkey = new PublicKey(dao.address);
      const proposalPubkey = new PublicKey(proposal.address);
      const communityMint = new PublicKey(dao.communityMint);

      // Find the governance account for this proposal
      let governancePubkey: PublicKey;
      if (dao.governances && dao.governances.length > 0) {
        governancePubkey = new PublicKey(dao.governances[0].address);
      } else {
        throw new Error("No governance account found for this DAO");
      }

      // Create vote transaction
      const transaction = await governanceService.createCastVoteTransaction(
        userPubkey,
        realmPubkey,
        governancePubkey,
        proposalPubkey,
        communityMint,
        voteType,
        optionIndex
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      console.log(`Signing ${voteType} vote with Privy...`);
      
      // Sign transaction using Privy (wallet already obtained above)
      const signedTransaction = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Vote transaction sent, waiting for confirmation...");
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log(`Vote ${voteType} successful! Signature:`, signature);
      toast.success(`Successfully voted ${voteType}! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      
      // Update local state
      setHasVoted(true);
      // Convert UI vote to governance vote format for state
      if (voteType === 'approve') {
        setUserVote('yes');
      } else if (voteType === 'deny') {
        setUserVote('no');
      }
      if (optionIndex !== undefined) {
        setUserVoteOption(optionIndex);
      }

    } catch (error) {
      console.error("Error casting vote:", error);
      
      // Handle specific governance errors
      if (error instanceof Error) {
        if (error.message.includes("Vote not allowed in cool off time")) {
          toast.error("Voting is temporarily disabled during the cool-off period. Please wait and try again later.");
        } else if (error.message.includes("custom program error: 0x25e")) {
          toast.error("Voting is temporarily disabled during the cool-off period. Please wait and try again later.");
        } else if (error.message.includes("custom program error: 0x266")) {
          toast.error("Invalid vote format for this proposal type. Please try refreshing the page.");
        } else if (error.message.includes("custom program error: 0x267")) {
          toast.error("Ranked voting is not supported by this governance program.");
        } else if (error.message.includes("Simulation failed")) {
          // Extract the specific error from simulation logs
          const logs = error.message.match(/Logs:\s*\[(.*?)\]/s)?.[1];
          if (logs?.includes("Vote not allowed in cool off time")) {
            toast.error("Voting is temporarily disabled during the cool-off period. Please wait and try again later.");
          } else if (logs?.includes("Invalid number of vote choices")) {
            toast.error("Invalid vote format for this proposal type. Please try refreshing the page.");
          } else if (logs?.includes("Ranked vote is not supported")) {
            toast.error("Ranked voting is not supported by this governance program.");
          } else if (logs?.includes("Voter weight record does not exist")) {
            toast.error("You don't have voting power in this DAO. Make sure you hold the required tokens.");
          } else {
            toast.error(`Transaction failed: ${error.message.split('.')[0]}`);
          }
        } else if (error.message.includes("User rejected")) {
          toast.error("Transaction was cancelled by user.");
        } else {
          toast.error(`Failed to cast vote: ${error.message}`);
        }
      } else {
        toast.error('Failed to cast vote: Unknown error');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleRelinquishVote = async () => {
    if (!isAuthenticated) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Get the correct wallet
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) {
      toast.error("No Solana wallet found");
      return;
    }

    setIsVoting(true);
    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      const realmPubkey = new PublicKey(dao.address);
      const proposalPubkey = new PublicKey(proposal.address);
      const communityMint = new PublicKey(dao.communityMint);

      // Find the governance account for this proposal
      let governancePubkey: PublicKey;
      if (dao.governances && dao.governances.length > 0) {
        governancePubkey = new PublicKey(dao.governances[0].address);
      } else {
        throw new Error("No governance account found for this DAO");
      }

      // Create relinquish vote transaction
      const transaction = await governanceService.createRelinquishVoteTransaction(
        userPubkey,
        realmPubkey,
        governancePubkey,
        proposalPubkey,
        communityMint
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      console.log("Signing relinquish vote with Privy...");
      
      // Sign transaction using Privy (wallet already obtained above)
      const signedTransaction = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Relinquish vote transaction sent, waiting for confirmation...");
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Relinquish vote successful! Signature:", signature);
      toast.success(`Successfully changed vote! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      
      // Update local state
      setHasVoted(false);
      setUserVote(null);
      setUserVoteOption(null);

    } catch (error) {
      console.error("Error relinquishing vote:", error);
      
      // Handle specific governance errors
      if (error instanceof Error) {
        if (error.message.includes("Vote not allowed in cool off time")) {
          toast.error("Vote changes are temporarily disabled during the cool-off period. Please wait and try again later.");
        } else if (error.message.includes("custom program error: 0x25e")) {
          toast.error("Vote changes are temporarily disabled during the cool-off period. Please wait and try again later.");
        } else if (error.message.includes("custom program error: 0x266")) {
          toast.error("Invalid vote format for this proposal type. Please try refreshing the page.");
        } else if (error.message.includes("custom program error: 0x267")) {
          toast.error("Ranked voting is not supported by this governance program.");
        } else if (error.message.includes("Simulation failed")) {
          // Extract the specific error from simulation logs
          const logs = error.message.match(/Logs:\s*\[(.*?)\]/s)?.[1];
          if (logs?.includes("Vote not allowed in cool off time")) {
            toast.error("Vote changes are temporarily disabled during the cool-off period. Please wait and try again later.");
          } else if (logs?.includes("Invalid number of vote choices")) {
            toast.error("Invalid vote format for this proposal type. Please try refreshing the page.");
          } else if (logs?.includes("Ranked vote is not supported")) {
            toast.error("Ranked voting is not supported by this governance program.");
          } else {
            toast.error(`Transaction failed: ${error.message.split('.')[0]}`);
          }
        } else if (error.message.includes("User rejected")) {
          toast.error("Transaction was cancelled by user.");
        } else {
          toast.error(`Failed to relinquish vote: ${error.message}`);
        }
      } else {
        toast.error('Failed to relinquish vote: Unknown error');
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price > 1000000) {
      // Likely in lamports, convert to SOL
      return `${(price / 1000000000).toFixed(6)} SOL`;
    } else {
      // Already in SOL or a reasonable number
      return `${price} SOL`;
    }
  };

  return (
    <div className={`${className}`}>
      {!isAuthenticated ? (
        <div className="text-center py-2 bg-blue-600/20 border border-blue-600/30 rounded">
          <Text text="Connect wallet to vote" as="p" className="text-blue-300 text-xs font-medium" />
        </div>
      ) : hasVoted ? (
        <div className="space-y-2">
          <div className="text-center py-2 bg-gray-800/50 border border-gray-700 rounded">
            <Text text="Your Vote:" as="span" className="text-gray-300 text-xs mr-2" />
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              userVote === 'yes' 
                ? 'bg-green-600/30 text-green-300 border border-green-600/50' 
                : 'bg-orange-600/30 text-orange-300 border border-orange-600/50'
            }`}>
              {isMultiChoice && userVoteOption !== null && proposal.options && proposal.options[userVoteOption] 
                ? `✓ ${formatOptionLabel(proposal.options[userVoteOption].label || `Option ${userVoteOption + 1}`)}`
                : userVote === 'yes' ? '✓ Yes' : '✗ No'
              }
            </span>
          </div>
          
          <Button
            onClick={handleRelinquishVote}
            disabled={isVoting}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xs py-2 border border-gray-600"
          >
            {isVoting ? "Processing..." : "Change Vote"}
          </Button>
        </div>
      ) : govVotingPower === 0 ? (
        <div className="text-center py-2 bg-yellow-600/20 border border-yellow-600/30 rounded">
          <Text text="You need to deposit tokens to vote. Go to the Governance section to deposit tokens." as="p" className="text-yellow-300 text-xs font-medium" />
        </div>
      ) : (
        <div className="space-y-2">
          {isMultiChoice && proposal.options && proposal.options.length > 0 ? (
            // Multi-choice proposal - show buttons for each option with application info
            <>
              <div className="space-y-2">
                {proposal.options.map((option, index) => {
                  const matchingApplication = findMatchingApplication(option.label || `Option ${index + 1}`);
                  
                  // Color based on option index
                  const colors = [
                    'bg-blue-600 hover:bg-blue-500 border-blue-600/50',
                    'bg-green-600 hover:bg-green-500 border-green-600/50', 
                    'bg-purple-600 hover:bg-purple-500 border-purple-600/50',
                    'bg-orange-600 hover:bg-orange-500 border-orange-600/50',
                    'bg-pink-600 hover:bg-pink-500 border-pink-600/50'
                  ];
                  const colorClass = colors[index % colors.length];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <Button
                        onClick={() => handleVote('approve', index)}
                        disabled={isVoting}
                        className={`w-full ${colorClass} text-white font-medium text-xs py-2 shadow-sm`}
                      >
                        {isVoting ? "Voting..." : `Vote: ${formatOptionLabel(option.label || `Option ${index + 1}`)}`}
                      </Button>
                      
                      {/* Show application info if available */}
                      {matchingApplication && (
                        <div className="bg-gray-800/30 border border-gray-700/50 rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon icon="SvgWeb" className="w-4 h-4 text-gray-400" />
                              <a 
                                href={`https://github.com/${matchingApplication.githubUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                              >
                                @{matchingApplication.githubUsername}
                              </a>
                            </div>
                            <span className="text-xs text-gray-400">
                              {matchingApplication.status}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-300">
                            <div className="font-medium mb-1">{matchingApplication.deliverableName}</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Price:</span>
                                <span className="text-green-400">{formatPrice(matchingApplication.requestedPrice)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Deadline:</span>
                                <span className="text-yellow-400">{matchingApplication.estimatedDeadline}</span>
                              </div>
                            </div>
                            <div className="mt-2 text-gray-400 line-clamp-2">
                              {matchingApplication.featureDescription}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center">
                <Text text="Need governance tokens deposited to vote" as="p" className="text-xs text-gray-400" />
              </div>
            </>
          ) : (
            // Traditional Yes/No proposal or fallback
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleVote('approve')}
                  disabled={isVoting}
                  className="bg-green-600 hover:bg-green-500 text-white font-medium text-xs py-2 border border-green-600/50 shadow-sm"
                >
                  {isVoting ? "Voting..." : "Yes"}
                </Button>
                
                <Button
                  onClick={() => handleVote('deny')}
                  disabled={isVoting}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs py-2 border border-orange-600/50 shadow-sm"
                >
                  {isVoting ? "Voting..." : "No"}
                </Button>
              </div>
              
              {/* Show applications info for Yes/No proposals if any exist */}
              {applications.length > 0 && (
                <div className="mt-3 p-3 bg-gray-800/30 border border-gray-700/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="SvgDocument" className="w-4 h-4 text-gray-400" />
                    <Text text={`${applications.length} Developer Application${applications.length !== 1 ? 's' : ''}`} as="span" className="text-xs font-medium text-gray-300" />
                  </div>
                  <div className="space-y-2">
                    {applications.slice(0, 3).map((app) => (
                      <div key={app.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://github.com/${app.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            @{app.githubUsername}
                          </a>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{app.deliverableName}</span>
                        </div>
                        <span className="text-green-400">{formatPrice(app.requestedPrice)}</span>
                      </div>
                    ))}
                    {applications.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{applications.length - 3} more applications
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <Text text="Need governance tokens deposited to vote" as="p" className="text-xs text-gray-400" />
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Cool-off period info note */}
      {isAuthenticated && !hasVoted && (
        <div className="mt-3 text-center">
          <Text text="Note: New proposals may have a cool-off period before voting opens" as="p" className="text-xs text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default ProposalVoting; 