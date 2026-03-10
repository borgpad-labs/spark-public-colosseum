import React, { useState, useEffect } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry';
import BN from 'bn.js';
import Text from '../Text';
import { Button } from '../Button/Button';
import { getPhantomProvider, connectPhantom } from '@/services/phantomService';
import { getCorrectWalletAddress } from '@/utils/walletUtils';
import { toast } from 'react-toastify';
import { backendSparkApi } from '@/data/api/backendSparkApi';

interface JupiterSwapProps {
  inputMint?: string; // The token they want to sell (optional, defaults to SOL)
  outputMint: string; // The token they want to buy
  className?: string;
  solPriceUSD?: number; // SOL price in USD for value calculations
  optimizeFees?: boolean; // Enable fee optimization
}

// Jupiter API response interfaces
interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: unknown;
  priceImpactPct: string;
  routePlan: unknown[];
  contextSlot: number;
  timeTaken: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

const JupiterSwap: React.FC<JupiterSwapProps> = ({
  inputMint = 'So11111111111111111111111111111111111111112',
  outputMint,
  className = "",
  solPriceUSD,
  optimizeFees = true
}) => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  
  // Check Solana wallet connection
  const [solanaWalletAddress, setSolanaWalletAddress] = useState<string | null>(null);
  const [isSolanaConnected, setIsSolanaConnected] = useState(false);
  
  // Check if user is authenticated via Privy OR connected via Solana wallet
  const isAuthenticated = authenticated || isSolanaConnected;
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [solBalance, setSolBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

  // Note: All RPC operations now use backend APIs to avoid exposing API keys

  // Connect to Solana wallet
  const connectSolanaWallet = async () => {
    console.log("🔌 Attempting to connect Solana wallet...");
    try {
      const address = await connectPhantom();
      console.log("✅ Solana wallet connected with address:", address);
      setSolanaWalletAddress(address);
      setIsSolanaConnected(true);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('❌ Error connecting to Solana wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  // Check if Solana wallet is already connected
  const checkSolanaConnection = () => {
    console.log("🔍 Checking Solana wallet connection...");
    const provider = getPhantomProvider();
    console.log("🔍 Phantom provider found:", !!provider);
    if (provider && provider.isConnected && provider.publicKey) {
      const address = provider.publicKey.toString();
      console.log("✅ Solana wallet already connected with address:", address);
      setSolanaWalletAddress(address);
      setIsSolanaConnected(true);
    } else {
      console.log("❌ Solana wallet not connected");
    }
  };

  const getSolanaWallet = () => {
    // If authenticated via Privy, use Privy wallets
    if (authenticated) {
      console.log("Available Privy wallets:", wallets.map(w => ({
        address: w.address,
        walletClientType: w.walletClientType,
        connectedAt: w.connectedAt
      })));

      // Use the same wallet selection logic as Profile page
      const correctWalletAddress = getCorrectWalletAddress(user, wallets);

      if (correctWalletAddress) {
        const correctWallet = wallets.find(w => w.address === correctWalletAddress);
        if (correctWallet) {
          console.log("Using correct Privy wallet:", correctWallet.address, correctWallet.walletClientType);
          return correctWallet;
        }
      }

      // Fallback: Find any connected wallet (but avoid Solflare unless it's the only option)
      const connectedWallet = wallets.find(wallet =>
        wallet.connectedAt && wallet.walletClientType !== 'solflare'
      );

      if (connectedWallet) {
        console.log("Using connected Privy wallet:", connectedWallet.address, connectedWallet.walletClientType);
        return connectedWallet;
      }

      // Last resort: use any wallet
      const fallbackWallet = wallets[0];
      console.log("Using fallback Privy wallet:", fallbackWallet?.address, fallbackWallet?.walletClientType);
      return fallbackWallet;
    }
    
    // If connected via Solana wallet, return the provider
    if (isSolanaConnected) {
      const provider = getPhantomProvider();
      if (provider && provider.isConnected) {
        console.log("Using Solana wallet:", provider.publicKey.toString());
        return provider;
      }
    }
    
    return null;
  };

  // Fetch token balance
  const fetchTokenBalance = async () => {
    console.log("🔍 fetchTokenBalance called with:", {
      isAuthenticated,
      authenticated,
      isSolanaConnected,
      solanaWalletAddress,
      inputMint
    });

    if (!isAuthenticated) {
      console.log("❌ Cannot fetch token balance - not authenticated");
      return;
    }
    
    let addressToUse: string | null = null;
    
    if (authenticated) {
      // Use Privy wallet address
      addressToUse = user?.wallet?.address || null;
      console.log("🔑 Using Privy wallet address:", addressToUse);
    } else if (isSolanaConnected) {
      // Use Solana wallet address
      addressToUse = solanaWalletAddress;
      console.log("🔑 Using Solana wallet address:", addressToUse);
    }
    
    if (!addressToUse) {
      console.log("❌ Cannot fetch token balance - no wallet address");
      return;
    }

    try {
      console.log("🔄 Fetching token balance for address:", addressToUse, "token:", inputMint);

      // Use backend API instead of direct RPC call
      const response = await backendSparkApi.getTokenBalanceNew({
        userAddress: addressToUse,
        tokenMint: inputMint,
        cluster: "mainnet"
      });

      if (response.success) {
        console.log("✅ Token balance fetched:", response.balance);
        setTokenBalance(response.balance || 0);
      } else {
        console.log("❌ Failed to fetch token balance:", response.error);
        setTokenBalance(0);
      }
    } catch (error) {
      console.error('❌ Error fetching token balance:', error);
      setTokenBalance(0);
    }
  };

  // Fetch SOL balance
  const fetchSolBalance = async () => {
    console.log("🔍 fetchSolBalance called with:", {
      isAuthenticated,
      authenticated,
      isSolanaConnected,
      solanaWalletAddress
    });

    if (!isAuthenticated) {
      console.log("❌ Cannot fetch SOL balance - not authenticated");
      return;
    }
    
    let addressToUse: string | null = null;
    
    if (authenticated) {
      // Use Privy wallet address
      addressToUse = user?.wallet?.address || null;
      console.log("🔑 Using Privy wallet address for SOL:", addressToUse);
    } else if (isSolanaConnected) {
      // Use Solana wallet address
      addressToUse = solanaWalletAddress;
      console.log("🔑 Using Solana wallet address for SOL:", addressToUse);
    }
    
    if (!addressToUse) {
      console.log("❌ Cannot fetch SOL balance - no wallet address");
      return;
    }

    try {
      console.log("🔄 Fetching SOL balance for address:", addressToUse);

      const response = await backendSparkApi.getSolBalance({
        userAddress: addressToUse,
        cluster: "mainnet"
      });

      if (response.success) {
        console.log("✅ SOL balance fetched:", response.balance, "SOL");
        setSolBalance(response.balance);
      } else {
        console.error('❌ Failed to fetch SOL balance');
        setSolBalance(0);
      }
    } catch (error) {
      console.error('❌ Error fetching SOL balance:', error);
      setSolBalance(0);
    }
  };

  // Load token list
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokens = await new TokenListProvider().resolve();
        const tokenList = tokens.filterByChainId(101).getList(); // Mainnet

        const map = new Map();
        tokenList.forEach((token) => {
          map.set(token.address, token);
        });
        setTokenMap(map);
      } catch (error) {
        console.error('Error loading tokens:', error);
      }
    };

    loadTokens();
  }, []);

  // Check Solana connection on mount
  useEffect(() => {
    checkSolanaConnection();
  }, []);

  // Fetch balances when authenticated
  useEffect(() => {
    console.log("🔄 Balance useEffect triggered with:", {
      isAuthenticated,
      inputMint,
      solanaWalletAddress,
      user: user?.wallet?.address
    });

    if (isAuthenticated) {
      console.log("✅ User authenticated, fetching balances...");
      fetchSolBalance();
      // Only fetch token balance if we're not dealing with SOL
      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        console.log("🪙 Fetching token balance for non-SOL input");
        fetchTokenBalance();
      } else {
        console.log("💰 Input is SOL, setting token balance to 0");
        setTokenBalance(0);
      }
    } else {
      console.log("❌ User not authenticated, skipping balance fetch");
    }
  }, [isAuthenticated, user, solanaWalletAddress, inputMint]);

  // Get quote from Jupiter
  const getQuote = async (inputMint: string, outputMint: string, amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      console.log("Missing required data for quote:", { amount });
      return;
    }

    setIsLoading(true);
    try {
      // Convert input amount to smallest unit (lamports for SOL, atomic units for tokens)
      const inputToken = tokenMap.get(inputMint);
      const decimals = inputToken?.decimals || 9;
      const amountInRaw = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

      // Build Jupiter quote URL
      const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
      quoteUrl.searchParams.set('inputMint', inputMint);
      quoteUrl.searchParams.set('outputMint', outputMint);
      quoteUrl.searchParams.set('amount', amountInRaw.toString());
      quoteUrl.searchParams.set('slippageBps', '50'); // 0.5% slippage
      
      // Always use fee optimization for lower costs
      quoteUrl.searchParams.set('prioritizationFeeLamports', '1000'); // Lower priority fee
      quoteUrl.searchParams.set('maxAccounts', '64'); // Limit account usage

      console.log('Getting Jupiter quote:', quoteUrl.toString());

      const response = await fetch(quoteUrl.toString());
      if (!response.ok) {
        throw new Error(`Jupiter quote failed: ${response.status} ${response.statusText}`);
      }

      const quoteData: JupiterQuoteResponse = await response.json();
      console.log("Jupiter quote result:", quoteData);

      setQuote(quoteData);

      // Calculate output amount for display
      const outputToken = tokenMap.get(outputMint);
      const outputDecimals = outputToken?.decimals || 9;
      const outputAmountFormatted = (parseInt(quoteData.outAmount) / Math.pow(10, outputDecimals)).toFixed(6);
      setOutputAmount(outputAmountFormatted);

      // Estimate transaction fee based on route complexity (optimized for low fees)
      const baseFee = 0.000005; // Base Solana transaction fee
      const routeComplexity = quoteData.routePlan.length;
      const estimatedFeeSOL = baseFee + (routeComplexity * 0.000001) + 0.000001; // Always use low fee estimate
      setEstimatedFee(estimatedFeeSOL);

    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      setQuote(null);
      setOutputAmount('');
      setEstimatedFee(null);
      toast.error('Failed to get quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input amount change
  const handleInputAmountChange = (value: string) => {
    setInputAmount(value);
    if (value && parseFloat(value) > 0) {
      getQuote(inputMint, outputMint, value);
    } else {
      setQuote(null);
      setOutputAmount('');
    }
  };

  // Handle Max button click
  const handleMaxClick = () => {
    const isSellingToken = inputMint !== 'So11111111111111111111111111111111111111112';

    console.log("Max button clicked:", {
      isSellingToken,
      tokenBalance,
      solBalance,
      inputMint,
      outputMint
    });

    if (isSellingToken && tokenBalance) {
      // When selling tokens, use the token balance
      console.log("Using token balance:", tokenBalance);
      setInputAmount(tokenBalance.toString());
      if (tokenBalance > 0) {
        getQuote(inputMint, outputMint, tokenBalance.toString());
      }
    } else {
      // When buying tokens (paying with SOL), use SOL balance minus small fee buffer
      const feeBuffer = Math.min(0.01, solBalance * 0.1); // Use 0.01 SOL or 10% of balance, whichever is smaller
      const maxSol = Math.max(0, solBalance - feeBuffer);
      console.log("Using SOL balance:", solBalance, "Fee buffer:", feeBuffer, "Max SOL:", maxSol);
      if (maxSol > 0) {
        setInputAmount(maxSol.toFixed(6)); // Use fixed decimal to avoid scientific notation
        getQuote(inputMint, outputMint, maxSol.toString());
      } else {
        console.log("No SOL balance available after fee buffer");
      }
    }
  };

  // Execute swap using Jupiter
  const executeSwap = async () => {
    if (!quote || !isAuthenticated) {
      toast.error('Please connect your wallet and get a quote first');
      return;
    }

    // Check if user has enough SOL for fees
    if (solBalance < 0.01) {
      toast.error('Insufficient SOL for transaction fees. Please ensure you have at least 0.01 SOL.');
      return;
    }

    setIsSwapping(true);
    try {
      let walletToUse: any = null;
      let addressToUse: string | null = null;

      if (authenticated) {
        // Use Privy wallet
        walletToUse = getSolanaWallet();
        if (!walletToUse) {
          toast.error('No Solana wallet found');
          return;
        }
        addressToUse = getCorrectWalletAddress(user, wallets) || walletToUse.address;
      } else if (isSolanaConnected) {
        // Use Solana wallet
        walletToUse = getSolanaWallet();
        if (!walletToUse) {
          toast.error('No Solana wallet found');
          return;
        }
        addressToUse = solanaWalletAddress;
      }
      
      if (!addressToUse) {
        toast.error('No wallet address found');
        return;
      }

      console.log('Using wallet address:', addressToUse);

      // Step 1: Build the swap transaction with higher fees
      const swapRequestBody = {
        quoteResponse: quote,
        userPublicKey: addressToUse,
        wrapUnwrapSOL: false, // Never wrap/unwrap SOL to reduce fees
        prioritizationFeeLamports: 5000, // Higher priority fee for better success rate
        maxAccounts: 64, // Limit account usage
      };

      console.log('Building swap transaction...');
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapRequestBody),
      });

      if (!swapResponse.ok) {
        throw new Error(`Failed to build swap transaction: ${swapResponse.status} ${swapResponse.statusText}`);
      }

      const swapData: JupiterSwapResponse = await swapResponse.json();
      console.log('Swap transaction built');

      // Step 2: Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      console.log('Transaction deserialized');

      // Step 3: Sign the transaction
      const signedTransaction = await walletToUse.signTransaction(transaction);
      console.log('Transaction signed');

      // Prepare transaction for backend APIs
      const transactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

      // Step 4: Validate transaction before sending using backend API
      try {
        // Simulate the transaction to catch errors early
        const simulationResponse = await backendSparkApi.simulateTransaction({
          transaction: transactionBase64,
          cluster: "mainnet"
        });
        
        if (!simulationResponse.success || !simulationResponse.valid) {
          throw new Error(`Transaction simulation failed: ${simulationResponse.error}`);
        }
        console.log('Transaction simulation successful');
      } catch (simError) {
        console.error('Transaction simulation error:', simError);
        throw new Error(`Transaction validation failed: ${simError instanceof Error ? simError.message : 'Unknown error'}`);
      }

      // Step 5: Send the transaction using backend API
      const sendResponse = await backendSparkApi.sendTransaction({
        signedTransaction: transactionBase64,
        commitment: 'confirmed'
      });

      if (!sendResponse.success || !sendResponse.signature) {
        throw new Error(sendResponse.error || 'Failed to send transaction');
      }

      const signature = sendResponse.signature;
      console.log('Swap transaction sent:', signature);

      // Show pending toast with explorer link
      const explorerUrl = `https://solscan.io/tx/${signature}`;
      toast.info(
        <div>
          Transaction submitted! 
          <br />
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
            View on Solscan: {signature.slice(0, 8)}...{signature.slice(-8)}
          </a>
        </div>,
        { autoClose: 10000 }
      );

      // Backend API already handles confirmation, so we can show success immediately
      console.log('Transaction confirmed successfully by backend');
      toast.success(`Swap successful! You received approximately ${outputAmount} tokens. Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`);

      // Reset form
      setInputAmount('');
      setOutputAmount('');
      setQuote(null);

      // Refresh balances
      fetchSolBalance();
      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        fetchTokenBalance();
      }

    } catch (error) {
      console.error('Error executing Jupiter swap:', error);
      
      // Provide better error messages
      let errorMessage = 'Swap failed';
      if (error instanceof Error) {
        if (error.message.includes('Transaction was not confirmed')) {
          errorMessage = 'Transaction submitted but confirmation timed out. Please check your wallet or Solana Explorer to verify if the swap succeeded.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for this transaction. Please check your balance.';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Swap failed due to price movement. Please try again with a smaller amount or higher slippage.';
        } else {
          errorMessage = `Swap failed: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  const outputToken = tokenMap.get(outputMint);
  const inputToken = tokenMap.get(inputMint);
  const isSellingToken = inputMint !== 'So11111111111111111111111111111111111111112';

  // Calculate USD value of tokens based on SOL equivalent
  const getTokenUSDValue = (tokenAmount: string, isOutput: boolean) => {
    if (!solPriceUSD || !quote) return null;

    try {
      const amount = parseFloat(tokenAmount);
      if (isNaN(amount)) return null;

      if (isOutput) {
        // For output tokens, calculate based on input SOL amount
        const inputSolAmount = parseFloat(inputAmount);
        if (isNaN(inputSolAmount)) return null;

        if (outputMint === 'So11111111111111111111111111111111111111112') {
          // Output is SOL
          return amount * solPriceUSD;
        } else {
          // Output is tokens, calculate based on SOL input value
          return inputSolAmount * solPriceUSD;
        }
      } else {
        // For input tokens
        if (inputMint === 'So11111111111111111111111111111111111111112') {
          // Input is SOL
          return amount * solPriceUSD;
        } else {
          // Input is tokens, calculate based on SOL output value
          const outputSolAmount = parseFloat(outputAmount);
          if (isNaN(outputSolAmount)) return null;
          return outputSolAmount * solPriceUSD;
        }
      }
    } catch (error) {
      return null;
    }
  };

  // Debug log for current state
  console.log("🎯 JupiterSwap render state:", {
    isAuthenticated,
    authenticated,
    isSolanaConnected,
    solanaWalletAddress,
    solBalance,
    tokenBalance,
    inputMint,
    isSellingToken
  });

  return (
    <div className={`bg-bg-secondary rounded-lg p-6 border border-fg-primary/10 ${className}`}>
      <Text text={isSellingToken ? "Sell Tokens" : "Buy Tokens"} as="h2" className="text-xl font-semibold mb-4" />

      {!isAuthenticated ? (
        <div className="text-center py-6">
          <Text text="Connect your wallet to swap tokens" as="p" className="text-fg-primary text-opacity-75 mb-4" />
          <Button
            onClick={connectSolanaWallet}
            size="md"
            color="primary"
            className="bg-brand-primary hover:bg-brand-primary/80 text-white"
          >
            Connect Phantom Wallet
          </Button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Input Amount */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-fg-primary text-opacity-75 font-medium">
                {isSellingToken ? "Sell" : "Pay with"} {inputToken?.symbol || (inputMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKEN')}
              </label>
              <div className="text-xs text-fg-primary text-opacity-60">
                Balance: {isSellingToken ?
                  (tokenBalance?.toFixed(4) || "0") :
                  solBalance.toFixed(4)
                } {inputToken?.symbol || (inputMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKEN')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => handleInputAmountChange(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-primary border border-fg-primary/20 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.0"
                min="0"
                step="0.1"
              />
              <button
                onClick={handleMaxClick}
                className="px-3 py-2 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border border-brand-primary/30 rounded-md text-sm font-medium transition-colors"
              >
                Max
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary/50 border border-fg-primary/10 rounded-md">
                <Text text={inputToken?.symbol || (inputMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKEN')} as="span" className="text-sm font-medium text-fg-primary" />
              </div>
            </div>
            {/* USD Value for input */}
            {inputAmount && (
              <div className="text-xs text-fg-primary text-opacity-60 mt-1">
                {(() => {
                  const usdValue = getTokenUSDValue(inputAmount, false);
                  if (usdValue) {
                    return `≈ $${usdValue.toFixed(2)} USD`;
                  } else if (inputMint !== 'So11111111111111111111111111111111111111112') {
                    return `${parseFloat(inputAmount).toLocaleString()} tokens`;
                  } else {
                    return `${parseFloat(inputAmount).toFixed(6)} SOL`;
                  }
                })()}
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center">
            <div className="text-fg-primary text-opacity-50">↓</div>
          </div>

          {/* Output Display */}
          <div>
            <label className="block text-sm text-fg-primary text-opacity-75 mb-2">
              You&apos;ll receive (estimated)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={outputAmount}
                readOnly
                className="flex-1 px-3 py-2 bg-bg-primary/50 border border-fg-primary/10 rounded-md text-black"
                placeholder="0.0"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary/50 border border-fg-primary/10 rounded-md">
                <Text text={outputToken?.symbol || (outputMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKEN')} as="span" className="text-sm font-medium text-fg-primary" />
              </div>
            </div>
            {/* USD Value for output */}
            {outputAmount && (
              <div className="text-xs text-fg-primary text-opacity-60 mt-1">
                {(() => {
                  const usdValue = getTokenUSDValue(outputAmount, true);
                  if (usdValue) {
                    return `≈ $${usdValue.toFixed(2)} USD`;
                  } else if (outputMint !== 'So11111111111111111111111111111111111111112') {
                    return `${parseFloat(outputAmount).toLocaleString()} tokens`;
                  } else {
                    return `${parseFloat(outputAmount).toFixed(6)} SOL`;
                  }
                })()}
              </div>
            )}
          </div>

          {/* Quote Info */}
          {quote && (
            <div className="bg-bg-primary/5 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <Text text="Price Impact:" as="span" className="text-fg-primary text-opacity-75" />
                <Text text={`${quote.priceImpactPct}%`} as="span" className="text-fg-primary" />
              </div>
              <div className="flex justify-between">
                <Text text="Slippage:" as="span" className="text-fg-primary text-opacity-75" />
                <Text text="0.5%" as="span" className="text-fg-primary" />
              </div>
              <div className="flex justify-between">
                <Text text="Route:" as="span" className="text-fg-primary text-opacity-75" />
                <Text text={`${quote.routePlan.length} hop${quote.routePlan.length > 1 ? 's' : ''}`} as="span" className="text-fg-primary" />
              </div>
              {estimatedFee && (
                <div className="flex justify-between">
                  <Text text="Estimated Fee:" as="span" className="text-fg-primary text-opacity-75" />
                  <Text 
                    text={`${estimatedFee.toFixed(6)} SOL (≈ $${solPriceUSD ? (estimatedFee * solPriceUSD).toFixed(2) : 'N/A'})`} 
                    as="span" 
                    className="text-fg-primary" 
                  />
                </div>
              )}

            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={executeSwap}
            disabled={!quote || isLoading || isSwapping || !inputAmount}
            className="w-full"
          >
            {isSwapping ? "Swapping..." : isLoading ? "Getting Quote..." : "Swap Tokens"}
          </Button>

          {/* Disclaimer */}
          <div className="text-xs text-fg-primary text-opacity-60 text-center">
            <Text text="Powered by Jupiter. Prices are estimates and may change." as="p" />
          </div>
        </div>
      )}
    </div>
  );
};

export default JupiterSwap; 