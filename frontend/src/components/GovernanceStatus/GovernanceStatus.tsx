import React, { useState, useEffect, useRef } from 'react';
import { DaoModel } from '../../../shared/models';
import Text from '../Text';
import { Button } from '../Button/Button';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import GovernanceService from '../../services/governanceService';
import BN from 'bn.js';
import { getCorrectWalletAddress } from '@/utils/walletUtils';
import { toast } from 'react-toastify';
import { backendSparkApi } from '../../data/api/backendSparkApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPhantomProvider } from '@/services/phantomService';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';

interface GovernanceStatusProps {
  dao: DaoModel;
  className?: string;
  onStatusUpdate?: () => void;
  onDataUpdate?: (data: { userTokenBalance: number; votingPower: number }) => void;
}

const GovernanceStatus: React.FC<GovernanceStatusProps> = ({ dao, className = "", onStatusUpdate, onDataUpdate }) => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const queryClient = useQueryClient();
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
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [amount, setAmount] = useState("1000000000"); // 1 token with 9 decimals

  const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(RPC_URL);
  const governanceService = new GovernanceService(RPC_URL);

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

  // Get the correct wallet address for queries - make it reactive
  const correctWalletAddress = (() => {
    if (isDiscoverMode() && isSolanaConnected()) {
      const provider = getPhantomProvider()
      return provider?.publicKey?.toString() || null
    }
    return getCorrectWalletAddress(user, wallets)
  })();
  
  // Monitor wallet connection changes and force refetch
  useEffect(() => {
    if (isAuthenticated && correctWalletAddress) {
      console.log('Wallet address changed, invalidating queries:', correctWalletAddress);
      queryClient.invalidateQueries({
        queryKey: ["getTokenBalanceNew", correctWalletAddress, dao.communityMint]
      });
      queryClient.invalidateQueries({
        queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint]
      });
    }
  }, [correctWalletAddress, isAuthenticated, queryClient, dao.communityMint, dao.address]);

  // Fetch token balance using React Query - refresh on page visit but not while staying
  const { data: tokenBalanceData } = useQuery({
    queryFn: () =>
      backendSparkApi.getTokenBalanceNew({
        userAddress: correctWalletAddress || "",
        tokenMint: dao.communityMint,
        cluster: "mainnet"
      }),
    queryKey: ["getTokenBalanceNew", correctWalletAddress, dao.communityMint],
    enabled: Boolean(isAuthenticated && correctWalletAddress && dao.communityMint),
    refetchInterval: false,
    staleTime: 0, // Always consider data stale - will refetch on mount
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when component mounts (page visit)
    refetchOnReconnect: false,
  });

  // Fetch governance data using React Query - refresh on page visit but not while staying
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
    staleTime: 0, // Always consider data stale - will refetch on mount
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when component mounts (page visit)
    refetchOnReconnect: false,
  });

  // Get current values from React Query data
  const currentUserTokenBalance = tokenBalanceData?.success ? tokenBalanceData.balance : 0;
  const govVotingPower = governanceData?.success ? governanceData.votingPower : 0;
  
  // Debug logging
  useEffect(() => {
    console.log('GovernanceStatus Debug:', {
      isDiscoverMode: isDiscoverMode(),
      isSolanaConnected: isSolanaConnected(),
      isAuthenticated,
      correctWalletAddress,
      tokenBalanceData,
      governanceData,
      currentUserTokenBalance,
      govVotingPower
    });
  }, [isAuthenticated, correctWalletAddress, tokenBalanceData, governanceData, currentUserTokenBalance, govVotingPower]);
  
  // Helper function for max deposit amount
  const setMaxDeposit = () => {
    if (currentUserTokenBalance !== undefined) {
      setAmount((currentUserTokenBalance * 1000000000).toString());
    }
  };
  
  // Notify parent component when data changes
  useEffect(() => {
    if (onDataUpdate && currentUserTokenBalance !== undefined) {
      onDataUpdate({
        userTokenBalance: currentUserTokenBalance,
        votingPower: govVotingPower
      });
    }
  }, [currentUserTokenBalance, govVotingPower, onDataUpdate]);

  const handleDepositTokens = async () => {
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

    setIsDepositing(true);
    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      const communityMint = new PublicKey(dao.communityMint);
      const realmPubkey = new PublicKey(dao.address);
      const depositAmountBN = new BN(amount);

      // Ensure user has an associated token account for the community mint
      const userTokenAccount = await getAssociatedTokenAddress(
        communityMint,
        userPubkey
      );

      // Check if user has enough tokens using backend API
      try {
        const tokenBalanceResponse = await backendSparkApi.getTokenBalanceNew({
          userAddress: solanaWallet.address,
          tokenMint: dao.communityMint,
          cluster: "mainnet"
        });
        const userBalance = tokenBalanceResponse.balance;
        const requiredAmount = depositAmountBN.toNumber() / 1000000000;
        
        if (userBalance !== undefined && userBalance < requiredAmount) {
          throw new Error(`Insufficient token balance. You have ${userBalance} tokens but need ${requiredAmount}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('could not find account')) {
          throw new Error("You don't have any tokens to deposit. Please get some tokens first.");
        }
        throw error;
      }

      // Create transaction using governance service
      const transaction = await governanceService.createDepositGovernanceTokensTransaction(
        userPubkey,
        realmPubkey,
        communityMint,
        depositAmountBN
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      console.log("Signing deposit transaction with Privy...");
      
      // Sign transaction using Privy (wallet already obtained above)
      const signedTransaction = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Transaction sent, waiting for confirmation...");
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Deposit successful! Signature:", signature);
      toast.success(`Successfully deposited ${(depositAmountBN.toNumber() / 1000000000).toFixed(2)} tokens! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      
      // Invalidate and refetch queries to get updated data
      await queryClient.invalidateQueries({
        queryKey: ["getTokenBalanceNew", correctWalletAddress, dao.communityMint]
      });
      await queryClient.invalidateQueries({
        queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint]
      });
      
      // Force a fresh fetch of governance data to get immediate updates
      await queryClient.refetchQueries({
        queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint]
      });
      
      // Refresh user status
      if (onStatusUpdate) onStatusUpdate();

    } catch (error) {
      console.error("Error depositing tokens:", error);
      toast.error(`Failed to deposit tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdrawTokens = async () => {
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

    setIsWithdrawing(true);
    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      const communityMint = new PublicKey(dao.communityMint);
      const realmPubkey = new PublicKey(dao.address);

      // Get user's token account
      const destinationTokenAccount = await getAssociatedTokenAddress(
        communityMint,
        userPubkey
      );

      // Create transaction using governance service
      // Note: Withdrawals always withdraw all tokens due to Solana Governance Program limitations
      const transaction = await governanceService.createWithdrawGovernanceTokensTransaction(
        userPubkey,
        realmPubkey,
        communityMint,
        destinationTokenAccount
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      console.log("Signing withdraw transaction with Privy...");
      
      // Sign transaction using Privy (wallet already obtained above)
      const signedTransaction = await solanaWallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log("Transaction sent, waiting for confirmation...");
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Withdraw successful! Signature:", signature);
      toast.success(`Successfully withdrew all governance tokens! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      
      // Invalidate and refetch queries to get updated data
      await queryClient.invalidateQueries({
        queryKey: ["getTokenBalanceNew", correctWalletAddress, dao.communityMint]
      });
      await queryClient.invalidateQueries({
        queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint]
      });
      
      // Force a fresh fetch of governance data to get immediate updates
      await queryClient.refetchQueries({
        queryKey: ["getGovernanceData", correctWalletAddress, dao.address, dao.communityMint]
      });
      
      // Refresh user status
      if (onStatusUpdate) onStatusUpdate();

    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      toast.error(`Failed to withdraw tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className={`${className}`}>
      {!isAuthenticated ? (
        <div className="text-center py-4 bg-bg-primary/5 rounded">
          <Text text="Connect wallet to participate in governance" as="p" className="text-fg-primary/60" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Voting Power */}
          <div className="bg-bg-primary/5 rounded p-3 border border-fg-primary/10">
            <div className="flex justify-between items-center">
              <Text text="Voting Power" as="p" className="text-lg font-medium" />
              <Text text={`${govVotingPower.toFixed(2)} tokens`} as="p" className="text-sm font-medium" />
            </div>
          </div>
          
          {/* Token Management */}
          <div className="bg-bg-primary/5 rounded p-3 border border-fg-primary/10">
            <Text text="Lock tokens to vote" as="h3" className="text-sm font-medium mb-3" />
            
            {/* Amount Input */}
            <div className="mb-3">
              <Text text="Deposit Amount" as="p" className="text-xs text-fg-primary/60 mb-1" />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={(parseInt(amount) / 1000000000).toString()}
                  onChange={(e) => setAmount((parseFloat(e.target.value) * 1000000000).toString())}
                  className="flex-1 px-3 py-2 bg-bg-primary border border-fg-primary/20 rounded text-black text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  placeholder="1.0"
                  min="0"
                  step="0.1"
                />
                <span className="text-xs text-fg-primary/60 px-2">tokens</span>
                <Button
                  onClick={setMaxDeposit}
                  className="px-3 py-2 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border-brand-primary/30 text-xs"
                >
                  Max
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDepositTokens}
                disabled={isDepositing || parseFloat(amount) <= 0 || currentUserTokenBalance === 0}
                className="flex-1 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border-brand-primary/30 text-sm py-2"
              >
                {isDepositing ? "Depositing..." : "Deposit"}
              </Button>
              
              <Button
                onClick={handleWithdrawTokens}
                disabled={isWithdrawing || govVotingPower === 0}
                className="flex-1 bg-fg-primary/20 hover:bg-fg-primary/30 text-fg-primary border-fg-primary/30 text-sm py-2"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw All"}
              </Button>
            </div>

            {currentUserTokenBalance === 0 && (
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-center">
                <Text text="You need tokens in your wallet to deposit" as="p" className="text-xs text-fg-primary/60" />
              </div>
            )}
            

            
            {currentUserTokenBalance !== undefined && currentUserTokenBalance > 0 && govVotingPower === 0 && (
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-center">
                <Text text="Deposit tokens to gain voting power" as="p" className="text-xs text-blue-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernanceStatus; 