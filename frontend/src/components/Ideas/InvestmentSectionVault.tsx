/**
 * InvestmentSection avec integration Smart Contract
 *
 * Ce composant utilise le smart contract Spark Idea Vault pour gerer
 * les investissements on-chain. Les fonds vont dans un vault PDA unique
 * par idee, et les utilisateurs peuvent retirer leurs fonds a tout moment.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  X,
  Loader2,
  Users,
  ExternalLink,
  ArrowDownToLine,
  Shield,
  Info,
  Lock,
  Timer,
} from "lucide-react";
import { Idea, UserProfile } from "./types";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getVaultPda,
  getUserDepositPda,
  getVaultAta,
  vaultExists,
  getVaultData,
  getUserDepositData,
  createInitializeVaultTransaction,
  createDepositTransaction,
  createWithdrawTransaction,
  getUsdcBalance,
  getVaultBalance,
  utils,
  USDC_MINT,
  USDC_DECIMALS,
  RPC_URLS,
  type Network,
} from "shared/solana/sparkVaultService";

// Configuration - Use environment variable for network (defaults to devnet for safety)
const NETWORK: Network = (import.meta.env.VITE_SOLANA_NETWORK as Network) || "devnet";
const RPC_URL = RPC_URLS[NETWORK];

interface InvestmentSectionVaultProps {
  idea: Idea;
  userProfile: UserProfile;
  onConnectWallet: () => void;
  isConnectingWallet: boolean;
}

interface InvestmentRecord {
  id: string;
  investor_wallet: string;
  amount_usdc: number;
  status: string;
  transaction_signature?: string;
}

export function InvestmentSectionVault({
  idea,
  userProfile,
  onConnectWallet,
  isConnectingWallet,
}: InvestmentSectionVaultProps) {
  // Wallet adapter for Standard Wallet support (Jupiter, etc.)
  const { signTransaction: adapterSignTransaction, publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();

  // State
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [userInvestments, setUserInvestments] = useState<InvestmentRecord[]>([]);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  // Smart contract state
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [vaultInitialized, setVaultInitialized] = useState(false);
  const [userOnChainDeposit, setUserOnChainDeposit] = useState<number>(0);
  const [vaultTotalDeposited, setVaultTotalDeposited] = useState<number>(0);
  const [isLoadingVault, setIsLoadingVault] = useState(true);

  const goal = idea.estimatedPrice || 0;
  const raised = idea.id === 'e03ef91e-958d-41d6-bff9-1e1cc644f29e' ? 4079.32 : (vaultTotalDeposited || idea.raisedAmount || 0);
  const progress = goal > 0 ? (raised / goal) * 100 : 0;
  const remaining = Math.max(0, goal - raised);

  // Cap reached logic
  const capReached = raised >= goal && goal > 0;
  const [localCapReachedAt, setLocalCapReachedAt] = useState<Date | null>(null);
  const capReachedAt = idea.capReachedAt ? new Date(idea.capReachedAt) : localCapReachedAt;
  const capDeadline = capReachedAt ? new Date(capReachedAt.getTime() + 48 * 60 * 60 * 1000) : null;
  const [now, setNow] = useState(() => new Date());
  const investmentClosed = capDeadline ? now > capDeadline : false;

  // When cap is reached but no DB timestamp yet, set a local fallback
  useEffect(() => {
    if (capReached && !idea.capReachedAt && !localCapReachedAt) {
      setLocalCapReachedAt(new Date());
    }
  }, [capReached, idea.capReachedAt, localCapReachedAt]);

  // Fireworks celebration after successful investment
  const launchFireworks = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Big burst in the center
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b", "#ffffff"],
    });
  }, []);

  // Countdown timer for 48h after cap reached
  useEffect(() => {
    if (!capReached || !capDeadline || investmentClosed) return;
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, [capReached, capDeadline, investmentClosed]);

  // Connection Solana
  const getConnection = useCallback(() => {
    return new Connection(RPC_URL, "confirmed");
  }, []);

  // Charger les donnees du vault
  const loadVaultData = useCallback(async () => {
    setIsLoadingVault(true);
    try {
      const connection = getConnection();
      const [vaultPda] = await getVaultPda(idea.id);
      setVaultAddress(vaultPda.toBase58());

      // Verifier si le vault existe
      const exists = await vaultExists(connection, idea.id);
      setVaultInitialized(exists);

      if (exists) {
        // Charger les donnees du vault
        const vaultData = await getVaultData(connection, idea.id);
        if (vaultData) {
          setVaultTotalDeposited(utils.baseUnitsToUsdc(vaultData.totalDeposited));
        }

        // Charger le depot de l'utilisateur si connecte
        if (userProfile.walletAddress) {
          const userDeposit = await getUserDepositData(
            connection,
            idea.id,
            new PublicKey(userProfile.walletAddress)
          );
          if (userDeposit) {
            setUserOnChainDeposit(utils.baseUnitsToUsdc(userDeposit.amount));
          } else {
            setUserOnChainDeposit(0);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load vault data:", error);
    } finally {
      setIsLoadingVault(false);
    }
  }, [idea.id, userProfile.walletAddress, getConnection]);

  // Charger les investissements depuis l'API (pour l'historique)
  const loadInvestments = useCallback(async () => {
    try {
      const response = await fetch(`/api/idea-investments?ideaId=${idea.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvestments(data.investments || []);
        if (userProfile.walletAddress) {
          const userInvs =
            data.investments?.filter(
              (inv: InvestmentRecord) =>
                inv.investor_wallet === userProfile.walletAddress
            ) || [];
          setUserInvestments(userInvs);
        } else {
          setUserInvestments([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch investments:", error);
    }
  }, [idea.id, userProfile.walletAddress]);

  // Charger le solde USDC
  const loadUsdcBalance = useCallback(async () => {
    if (!userProfile.walletAddress || !userProfile.walletConnected) {
      setUsdcBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const connection = getConnection();
      const result = await getUsdcBalance(
        connection,
        new PublicKey(userProfile.walletAddress),
        NETWORK
      );
      setUsdcBalance(result.balance);
      if (result.error) {
        console.warn("Balance fetch warning:", result.error);
      }
    } catch (error) {
      console.error("Failed to fetch USDC balance:", error);
      setUsdcBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [userProfile.walletAddress, userProfile.walletConnected, getConnection]);

  // Effects
  useEffect(() => {
    if (idea.id) {
      loadVaultData();
      loadInvestments();
    }
  }, [idea.id, loadVaultData, loadInvestments]);

  useEffect(() => {
    loadUsdcBalance();
  }, [loadUsdcBalance, showDepositModal]);

  // Type for wallet provider (unified interface)
  interface WalletProvider {
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    publicKey?: { toString(): string };
    isConnected?: boolean;
  }

  // Detect and get the connected wallet provider
  const getConnectedWalletProvider = (): WalletProvider => {
    const targetAddress = userProfile.walletAddress;
    if (!targetAddress) {
      throw new Error("No wallet address found. Please connect your wallet.");
    }

    // Primary: Use wallet adapter (supports all Standard Wallets including Jupiter)
    if (adapterConnected && adapterSignTransaction && adapterPublicKey?.toString() === targetAddress) {
      return {
        signTransaction: adapterSignTransaction as (transaction: Transaction) => Promise<Transaction>,
        publicKey: adapterPublicKey,
        isConnected: true,
      };
    }

    // Fallback: Check window globals for legacy wallet providers
    // @ts-expect-error - Phantom wallet global
    const phantom = window?.phantom?.solana;
    if (phantom?.isConnected && phantom?.publicKey?.toString() === targetAddress) {
      return phantom;
    }

    // @ts-expect-error - Backpack wallet global
    const backpack = window?.backpack;
    if (backpack?.isConnected && backpack?.publicKey?.toString() === targetAddress) {
      return backpack;
    }

    // @ts-expect-error - Solflare wallet global
    const solflare = window?.solflare;
    if (solflare?.isConnected && solflare?.publicKey?.toString() === targetAddress) {
      return solflare;
    }

    throw new Error(
      "No compatible wallet found. Please reconnect your wallet."
    );
  };

  // Initialiser le vault - returns true on success, false on failure
  const handleInitializeVault = async (): Promise<boolean> => {
    if (!userProfile.walletAddress) return false;

    setIsInitializing(true);
    try {
      const provider = getConnectedWalletProvider();
      const connection = getConnection();
      const payerPublicKey = new PublicKey(userProfile.walletAddress);

      // Creer la transaction
      const transaction = await createInitializeVaultTransaction(
        connection,
        payerPublicKey,
        idea.id,
        NETWORK
      );

      // Signer et envoyer avec preflight checks
      const signedTx = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation and check result
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log("Vault initialized:", signature);
      setTxSignature(signature);
      setVaultInitialized(true);

      // Recharger les donnees
      await loadVaultData();
      return true;
    } catch (error: unknown) {
      console.error("Failed to initialize vault:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize vault";
      alert(errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  };

  // Deposer des tokens
  const handleDeposit = async () => {
    if (!userProfile.walletAddress || !depositAmount) return;

    // Validate amount using safe validation
    if (!utils.isValidUsdcAmount(depositAmount)) {
      alert("Invalid amount. Please enter a valid USDC amount.");
      return;
    }

    const parsedAmount = parseFloat(depositAmount);

    // Check minimum deposit (0.001 USDC = 1000 base units, matches contract)
    if (parsedAmount < 0.001) {
      alert("Minimum deposit is 0.001 USDC");
      return;
    }

    // Check user has sufficient balance
    if (usdcBalance !== null && parsedAmount > usdcBalance) {
      alert(`Insufficient balance. You have ${usdcBalance.toFixed(2)} USDC`);
      return;
    }

    // Si le vault n'existe pas, l'initialiser d'abord
    if (!vaultInitialized) {
      const initSuccess = await handleInitializeVault();
      if (!initSuccess) return; // Si l'initialisation a echoue (checked via return value, not state)
    }

    setIsDepositing(true);
    setTxSignature(null);

    try {
      const provider = getConnectedWalletProvider();
      const connection = getConnection();
      const userPublicKey = new PublicKey(userProfile.walletAddress);
      const amountInBaseUnits = utils.usdcToBaseUnits(depositAmount);

      // Creer la transaction de depot
      const transaction = await createDepositTransaction(
        connection,
        userPublicKey,
        idea.id,
        amountInBaseUnits,
        NETWORK
      );

      // Signer et envoyer avec preflight checks
      const signedTx = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation and check result
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log("Deposit successful:", signature);
      setTxSignature(signature);

      // Enregistrer l'investissement dans la base de donnees
      await fetch("/api/idea-investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: idea.id,
          investorWallet: userProfile.walletAddress,
          amountUsdc: parsedAmount,
          transactionSignature: signature,
          isOnChain: true,
          vaultAddress: vaultAddress,
        }),
      });

      // Recharger les donnees
      await loadVaultData();
      await loadInvestments();
      await loadUsdcBalance();

      setShowDepositModal(false);
      setDepositAmount("");

      // Celebration!
      setSuccessAmount(parsedAmount);
      setShowSuccessPopup(true);
      launchFireworks();
    } catch (error: unknown) {
      console.error("Deposit failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to deposit. Please try again.";
      alert(errorMessage);
    } finally {
      setIsDepositing(false);
    }
  };

  // Retirer des tokens
  const handleWithdraw = async () => {
    if (!userProfile.walletAddress || !withdrawAmount) return;

    // Validate amount using safe validation
    if (!utils.isValidUsdcAmount(withdrawAmount)) {
      alert("Invalid amount. Please enter a valid USDC amount.");
      return;
    }

    const parsedAmount = parseFloat(withdrawAmount);

    if (parsedAmount > userOnChainDeposit) {
      alert(`You cannot withdraw more than your deposited amount (${userOnChainDeposit.toFixed(2)} USDC)`);
      return;
    }

    setIsWithdrawing(true);
    setTxSignature(null);

    try {
      const provider = getConnectedWalletProvider();
      const connection = getConnection();
      const userPublicKey = new PublicKey(userProfile.walletAddress);
      const amountInBaseUnits = utils.usdcToBaseUnits(withdrawAmount);

      // Creer la transaction de retrait
      const transaction = await createWithdrawTransaction(
        connection,
        userPublicKey,
        idea.id,
        amountInBaseUnits,
        NETWORK
      );

      // Signer et envoyer avec preflight checks
      const signedTx = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation and check result
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log("Withdrawal successful:", signature);
      setTxSignature(signature);

      // Mark user's investments as refunded in the database
      // For full withdrawal, mark all investments; for partial, mark proportionally
      const isFullWithdrawal = parsedAmount >= userOnChainDeposit - 0.001; // Small tolerance for rounding

      if (isFullWithdrawal && userInvestments.length > 0) {
        // Mark all user's active investments as refunded
        for (const inv of userInvestments) {
          if (inv.status === 'active') {
            try {
              await fetch("/api/idea-investments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: inv.id,
                  action: 'refund',
                  transactionSignature: signature,
                }),
              });
            } catch (err) {
              console.error("Failed to update investment status:", err);
            }
          }
        }
      }

      // Recharger les donnees
      await loadVaultData();
      await loadInvestments();
      await loadUsdcBalance();

      setShowWithdrawModal(false);
      setWithdrawAmount("");
    } catch (error: unknown) {
      console.error("Withdrawal failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to withdraw. Please try again.";
      alert(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Ne pas afficher si pas de prix estime
  if (!idea.estimatedPrice || idea.estimatedPrice <= 0) {
    return null;
  }

  // Explorer URL basee sur le network
  const explorerUrl = "https://solscan.io";
  const explorerSuffix = NETWORK === "devnet" ? "?cluster=devnet" : "";

  return (
    <>
      <style>{`
      @keyframes bounce-in {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
    `}</style>
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border border-emerald-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Investment Round</h4>
              <p className="text-[10px] text-neutral-500">On-chain vault (USDC)</p>
            </div>
          </div>
          {/* Network badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[9px] font-medium text-yellow-400 uppercase">
              {NETWORK}
            </span>
          </div>
        </div>

        {/* Vault Info */}
        {vaultAddress && (
          <div className="mb-4 p-2 rounded-lg bg-neutral-900/30 border border-neutral-800">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-neutral-400">Vault Address:</span>
              <a
                href={`${explorerUrl}/address/${vaultAddress}${explorerSuffix}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono"
              >
                {vaultAddress.slice(0, 8)}...{vaultAddress.slice(-8)}
                <ExternalLink className="w-2.5 h-2.5 inline ml-1" />
              </a>
            </div>
            {!vaultInitialized && !isLoadingVault && (
              <p className="text-[9px] text-yellow-400 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Vault not initialized yet. First deposit will create it.
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Progress</span>
            <span className="text-xs font-semibold text-emerald-400">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-neutral-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* 72h Countdown after cap reached */}
        {capReached && capDeadline && !investmentClosed && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              {/* <Timer className="w-4 h-4 text-yellow-400" /> */}
              <span className="text-xs font-medium text-yellow-400 text-center">
                Minimum funding goal reached! Still open for investment.
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-lg font-bold text-yellow-300 font-mono">
              {(() => {
                const timeLeft = Math.max(0, capDeadline.getTime() - now.getTime());
                const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
                const pad = (n: number) => n.toString().padStart(2, "0");
                return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
              })()}
            </div>
            {/* <p className="text-[10px] text-center text-yellow-400/60 mt-1">DD:HH:MM:SS</p> */}
          </div>
        )}

        {/* Investment closed banner */}
        {investmentClosed && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-red-400">
                Investment round is closed. Funds are locked.
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-neutral-900/30">
            <p className="text-sm font-bold text-emerald-400">
              ${raised.toLocaleString()}
            </p>
            <p className="text-[9px] text-neutral-500 uppercase">Raised</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-neutral-900/30">
            <p className="text-sm font-bold text-white">${goal.toLocaleString()}</p>
            <p className="text-[9px] text-neutral-500 uppercase">Goal</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-neutral-900/30">
            <p className="text-sm font-bold text-orange-400">
              {new Set(investments.filter(inv => inv.status === 'active').map(inv => inv.investor_wallet)).size}
            </p>
            <p className="text-[9px] text-neutral-500 uppercase">Investors</p>
          </div>
        </div>

        {/* Buy on Jupiter */}
        {idea.tokenAddress && (
          <div className="mb-4">
            <a
              href={`https://jup.ag/tokens/${idea.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 hover:text-violet-200 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buy on Jupiter
            </a>
          </div>
        )}

        {/* User On-Chain Deposit */}
        {userProfile.walletConnected && userOnChainDeposit > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-400 uppercase mb-1">
                  Your On-Chain Balance
                </p>
                <p className="text-lg font-bold text-white">
                  ${userOnChainDeposit.toLocaleString()} USDC
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={capReached}
                title={capReached ? "Withdraw disabled - funding cap reached" : undefined}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${capReached
                  ? "bg-neutral-700/20 border-neutral-600/30 text-neutral-500 cursor-not-allowed"
                  : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                  }`}
              >
                {capReached ? <Lock className="w-3 h-3" /> : <ArrowDownToLine className="w-3 h-3" />}
                {capReached ? "Withdraw Locked" : "Withdraw"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!userProfile.walletConnected ? (
          <button
            onClick={onConnectWallet}
            disabled={isConnectingWallet}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-black font-semibold text-sm rounded-lg hover:bg-emerald-400 disabled:opacity-50"
          >
            {isConnectingWallet ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setShowDepositModal(true)}
            disabled={isLoadingVault || investmentClosed}
            className={`w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm rounded-lg disabled:opacity-50 ${investmentClosed
              ? "bg-neutral-600 text-neutral-300 cursor-not-allowed"
              : "bg-emerald-500 text-black hover:bg-emerald-400"
              }`}
          >
            {isLoadingVault ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : investmentClosed ? (
              <>
                <Lock className="w-4 h-4" />
                Investment Round Closed
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                {userOnChainDeposit > 0 ? "Invest More" : "Invest Now"}
              </>
            )}
          </button>
        )}

        {/* Recent Investors */}
        {(() => {
          const activeInvestments = investments.filter(inv => inv.status === 'active');
          // Aggregate investments by wallet address
          const aggregatedByWallet = activeInvestments.reduce((acc, inv) => {
            const wallet = inv.investor_wallet;
            if (!acc[wallet]) {
              acc[wallet] = { wallet, totalAmount: 0 };
            }
            acc[wallet].totalAmount += inv.amount_usdc;
            return acc;
          }, {} as Record<string, { wallet: string; totalAmount: number }>);
          const uniqueInvestors = Object.values(aggregatedByWallet);

          return uniqueInvestors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-neutral-500" />
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  Recent Investors
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueInvestors.slice(0, 5).map((investor, i) => (
                  <div
                    key={i}
                    className="px-2 py-1 rounded-lg bg-neutral-800/50 text-[10px] text-neutral-400"
                    title={investor.wallet}
                  >
                    {investor.wallet.slice(0, 4)}...{investor.wallet.slice(-4)} •
                    ${investor.totalAmount}
                  </div>
                ))}
                {uniqueInvestors.length > 5 && (
                  <div className="px-2 py-1 rounded-lg bg-neutral-800/50 text-[10px] text-neutral-500">
                    +{uniqueInvestors.length - 5} more
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDepositModal(false)}
            />
            <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-neutral-900/95 border border-emerald-500/20 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-white">Invest USDC</h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Network Warning */}
              <div className="mb-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-[10px] text-yellow-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Using {NETWORK.toUpperCase()} network. Make sure your wallet is on{" "}
                  {NETWORK}.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 uppercase mb-1.5 block">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount..."
                      min="0.01"
                      max={usdcBalance !== null ? usdcBalance : undefined}
                      step="0.01"
                      className="w-full h-12 pl-9 pr-20 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                    />
                    {userProfile.walletConnected &&
                      usdcBalance !== null &&
                      usdcBalance > 0 && (
                        <button
                          onClick={() => {
                            setDepositAmount(usdcBalance.toFixed(2));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30 transition-colors"
                        >
                          Max
                        </button>
                      )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-neutral-500">
                      Remaining: ${remaining.toLocaleString()} USDC
                    </p>
                    {usdcBalance !== null && (
                      <p className="text-[10px] text-neutral-500">
                        Balance: $
                        {usdcBalance.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info about on-chain vault */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] text-blue-400">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Your funds are secured in an on-chain vault. You can withdraw at
                    any time.
                  </p>
                </div>

                {txSignature && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 mb-1">
                      Transaction sent!
                    </p>
                    <a
                      href={`${explorerUrl}/tx/${txSignature}${explorerSuffix}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 py-2.5 text-neutral-400 text-sm font-medium hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={
                      isDepositing ||
                      isInitializing ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      investmentClosed
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-black font-semibold text-sm rounded-lg hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {isDepositing || isInitializing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isInitializing ? "Creating Vault..." : "Processing..."}
                      </>
                    ) : (
                      "Confirm Investment"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Celebration Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none">
            <div className="relative p-8 rounded-2xl bg-neutral-900/95 border border-emerald-500/30 shadow-2xl pointer-events-auto animate-[bounce-in_0.5s_ease-out]">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="absolute top-3 right-3 text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-lg font-bold text-white mb-1">Investment Successful!</h3>
                <p className="text-emerald-400 text-2xl font-bold mb-2">
                  ${successAmount.toLocaleString()} USDC
                </p>
                <p className="text-sm text-neutral-400">
                  You just backed <span className="text-white font-medium">{idea.title}</span>
                </p>
                <p className="text-xs text-neutral-500 mt-2">Thank you for believing in this idea!</p>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => setShowSuccessPopup(false)}
                    className="flex-1 py-2.5 text-neutral-400 text-sm font-medium hover:text-white border border-white/10 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I just invested $${successAmount.toLocaleString()} USDC in "${idea.title}" on @sparkdotfun! 🚀\n\nBack this idea too 👇\n${window.location.origin}/ideas/${idea.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors"
                    onClick={() => setShowSuccessPopup(false)}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWithdrawModal(false)}
            />
            <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-neutral-900/95 border border-orange-500/20 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-white">Withdraw USDC</h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 uppercase mb-1.5 block">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount..."
                      min="0.01"
                      max={userOnChainDeposit}
                      step="0.01"
                      className="w-full h-12 pl-9 pr-20 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                    />
                    {userOnChainDeposit > 0 && (
                      <button
                        onClick={() => setWithdrawAmount(userOnChainDeposit.toFixed(2))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 rounded border border-orange-500/30 transition-colors"
                      >
                        Max
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Available: ${userOnChainDeposit.toLocaleString()} USDC
                  </p>
                </div>

                {txSignature && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 mb-1">
                      Withdrawal successful!
                    </p>
                    <a
                      href={`${explorerUrl}/tx/${txSignature}${explorerSuffix}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-2.5 text-neutral-400 text-sm font-medium hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={
                      isWithdrawing ||
                      !withdrawAmount ||
                      parseFloat(withdrawAmount) <= 0 ||
                      parseFloat(withdrawAmount) > userOnChainDeposit
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-black font-semibold text-sm rounded-lg hover:bg-orange-400 disabled:opacity-50"
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm Withdrawal"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default InvestmentSectionVault;
