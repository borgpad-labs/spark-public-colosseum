/**
 * Spark Idea Vault - Smart Contract Service
 *
 * Service pour interagir avec le smart contract Spark Idea Vault sur Solana.
 * Permet de creer des vaults, deposer et retirer des tokens USDC.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as borsh from "borsh";

// Program ID du smart contract deploye sur devnet
export const SPARK_VAULT_PROGRAM_ID = new PublicKey(
  "8ijFSYEJ7dCWSGVbLs7nVntbbmaz1tXYtkBGpn5JSNep"
);

// USDC Mint addresses
export const USDC_MINT = {
  devnet: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  mainnet: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};

export const USDC_DECIMALS = 6;

// RPC URLs
export const RPC_URLS = {
  devnet: "https://api.devnet.solana.com",
  mainnet: import.meta.env.VITE_RPC_URL || "https://api.mainnet-beta.solana.com",
};

export type Network = "devnet" | "mainnet";

// Discriminateurs pour les instructions (premiers 8 bytes du hash SHA256)
const INSTRUCTION_DISCRIMINATORS = {
  initializeVault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
};

/**
 * Derive l'adresse PDA de l'admin config (singleton)
 */
export function getAdminConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("admin_config")],
    SPARK_VAULT_PROGRAM_ID
  );
}

// Account discriminateurs
const ACCOUNT_DISCRIMINATORS = {
  ideaVault: Buffer.from([56, 77, 82, 142, 145, 174, 154, 42]),
  userDeposit: Buffer.from([69, 238, 23, 217, 255, 137, 185, 35]),
};

/**
 * Interface pour les donnees du vault
 */
export interface IdeaVaultData {
  ideaId: string;
  bump: number;
  mint: PublicKey;
  vaultAta: PublicKey;
  totalDeposited: bigint;
}

/**
 * Interface pour les donnees du depot utilisateur
 */
export interface UserDepositData {
  vault: PublicKey;
  user: PublicKey;
  amount: bigint;
}

/**
 * Vault PDA seed: SHA256(ideaId) so the seed is always 32 bytes (Solana limit).
 * Uses Web Crypto; run in async context.
 */
export async function getVaultSeed(ideaId: string): Promise<Buffer> {
  const data = new TextEncoder().encode(ideaId);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash);
}

/**
 * Derive l'adresse PDA du vault pour une idee (seed = SHA256(ideaId), 32 bytes max).
 */
export async function getVaultPda(ideaId: string): Promise<[PublicKey, number]> {
  const seed = await getVaultSeed(ideaId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), seed],
    SPARK_VAULT_PROGRAM_ID
  );
}

/**
 * Derive l'adresse PDA du depot utilisateur
 */
export function getUserDepositPda(
  vaultPda: PublicKey,
  userPublicKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), vaultPda.toBuffer(), userPublicKey.toBuffer()],
    SPARK_VAULT_PROGRAM_ID
  );
}

/**
 * Obtient l'adresse ATA du vault
 */
export async function getVaultAta(
  vaultPda: PublicKey,
  usdcMint: PublicKey
): Promise<PublicKey> {
  return getAssociatedTokenAddress(usdcMint, vaultPda, true);
}

/**
 * Verifie si un vault existe pour une idee
 */
export async function vaultExists(
  connection: Connection,
  ideaId: string
): Promise<boolean> {
  const [vaultPda] = await getVaultPda(ideaId);
  const accountInfo = await connection.getAccountInfo(vaultPda);
  return accountInfo !== null;
}

/**
 * Recupere les donnees du vault
 */
export async function getVaultData(
  connection: Connection,
  ideaId: string
): Promise<IdeaVaultData | null> {
  const [vaultPda] = await getVaultPda(ideaId);
  const accountInfo = await connection.getAccountInfo(vaultPda);

  if (!accountInfo) return null;

  // Decode les donnees du compte
  const data = accountInfo.data;

  // Verifier le discriminateur
  const discriminator = data.slice(0, 8);
  if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.ideaVault)) {
    throw new Error("Invalid account discriminator for IdeaVault");
  }

  // Decoder manuellement (structure: discriminator + string length + string + vault_seed[32] + bump + pubkey + pubkey + u64)
  let offset = 8;

  // Lire la longueur de la string (u32 little endian)
  const stringLen = data.readUInt32LE(offset);
  offset += 4;

  // Lire la string
  const ideaIdBytes = data.slice(offset, offset + stringLen);
  const decodedIdeaId = ideaIdBytes.toString("utf8");
  offset += stringLen;

  // Lire vault_seed (32 bytes) - skip, not needed for return
  offset += 32;

  // Lire le bump (u8)
  const bump = data.readUInt8(offset);
  offset += 1;

  // Lire le mint (32 bytes)
  const mint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Lire le vault_ata (32 bytes)
  const vaultAta = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Lire total_deposited (u64 little endian)
  const totalDeposited = data.readBigUInt64LE(offset);

  return {
    ideaId: decodedIdeaId,
    bump,
    mint,
    vaultAta,
    totalDeposited,
  };
}

/**
 * Recupere les donnees du depot utilisateur
 */
export async function getUserDepositData(
  connection: Connection,
  ideaId: string,
  userPublicKey: PublicKey
): Promise<UserDepositData | null> {
  const [vaultPda] = await getVaultPda(ideaId);
  const [userDepositPda] = getUserDepositPda(vaultPda, userPublicKey);
  const accountInfo = await connection.getAccountInfo(userDepositPda);

  if (!accountInfo) return null;

  const data = accountInfo.data;

  // Verifier le discriminateur
  const discriminator = data.slice(0, 8);
  if (!discriminator.equals(ACCOUNT_DISCRIMINATORS.userDeposit)) {
    throw new Error("Invalid account discriminator for UserDeposit");
  }

  let offset = 8;

  // Lire vault (32 bytes)
  const vault = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Lire user (32 bytes)
  const user = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Lire amount (u64)
  const amount = data.readBigUInt64LE(offset);

  return { vault, user, amount };
}

/**
 * Cree une transaction pour initialiser un vault
 * Instruction: initialize_vault(idea_id: String, vault_seed: [u8; 32]) avec vault_seed = SHA256(idea_id)
 */
export async function createInitializeVaultTransaction(
  connection: Connection,
  payerPublicKey: PublicKey,
  ideaId: string,
  network: Network = "devnet"
): Promise<Transaction> {
  const usdcMint = USDC_MINT[network];
  const [vaultPda] = await getVaultPda(ideaId);
  const vaultAta = await getVaultAta(vaultPda, usdcMint);
  const vaultSeed = await getVaultSeed(ideaId);

  // Encoder l'instruction data: discriminator + idea_id (u32 len + bytes) + vault_seed (32 bytes)
  const ideaIdBytes = Buffer.from(ideaId, "utf8");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32LE(ideaIdBytes.length, 0);
  const instructionData = Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.initializeVault,
    lenBuf,
    ideaIdBytes,
    vaultSeed,
  ]);

  const [adminConfigPda] = getAdminConfigPda();

  const keys = [
    { pubkey: payerPublicKey, isSigner: true, isWritable: true },
    { pubkey: adminConfigPda, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: vaultAta, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: SPARK_VAULT_PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = payerPublicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return transaction;
}

/**
 * Cree une transaction pour deposer des tokens
 */
export async function createDepositTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  ideaId: string,
  amount: bigint,
  network: Network = "devnet"
): Promise<Transaction> {
  const usdcMint = USDC_MINT[network];
  const [vaultPda] = await getVaultPda(ideaId);
  const vaultAta = await getVaultAta(vaultPda, usdcMint);
  const [userDepositPda] = getUserDepositPda(vaultPda, userPublicKey);
  const userTokenAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey);

  // Encoder l'instruction data (discriminator + u64 amount)
  const instructionData = Buffer.alloc(16);
  INSTRUCTION_DISCRIMINATORS.deposit.copy(instructionData, 0);
  instructionData.writeBigUInt64LE(amount, 8);

  const [adminConfigPda] = getAdminConfigPda();

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },
    { pubkey: adminConfigPda, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: vaultAta, isSigner: false, isWritable: true },
    { pubkey: userDepositPda, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: SPARK_VAULT_PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = userPublicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return transaction;
}

/**
 * Cree une transaction pour retirer des tokens
 */
export async function createWithdrawTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  ideaId: string,
  amount: bigint,
  network: Network = "devnet"
): Promise<Transaction> {
  const usdcMint = USDC_MINT[network];
  const [vaultPda] = await getVaultPda(ideaId);
  const vaultAta = await getVaultAta(vaultPda, usdcMint);
  const [userDepositPda] = getUserDepositPda(vaultPda, userPublicKey);
  const userTokenAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey);

  // Encoder l'instruction data (discriminator + u64 amount)
  const instructionData = Buffer.alloc(16);
  INSTRUCTION_DISCRIMINATORS.withdraw.copy(instructionData, 0);
  instructionData.writeBigUInt64LE(amount, 8);

  const [adminConfigPda] = getAdminConfigPda();

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },
    { pubkey: adminConfigPda, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: userDepositPda, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: vaultAta, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: SPARK_VAULT_PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = userPublicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return transaction;
}

/**
 * Recupere le solde USDC d'un wallet
 * SECURITY: Properly handles different error types instead of swallowing all errors
 */
export async function getUsdcBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  network: Network = "devnet"
): Promise<{ balance: number; error?: string }> {
  const usdcMint = USDC_MINT[network];

  try {
    const tokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);
    const accountInfo = await getAccount(connection, tokenAccount);
    // Use BigInt division to avoid floating-point precision issues
    const balance = Number(accountInfo.amount / BigInt(Math.pow(10, USDC_DECIMALS - 2))) / 100;
    return { balance };
  } catch (error: unknown) {
    // Check if it's a "token account doesn't exist" error
    if (error instanceof Error && error.message.includes("could not find account")) {
      return { balance: 0 };
    }
    // For other errors (network, RPC), return error info
    const errorMessage = error instanceof Error ? error.message : "Unknown error fetching balance";
    console.error("Error fetching USDC balance:", errorMessage);
    return { balance: 0, error: errorMessage };
  }
}

/**
 * Recupere le solde total du vault
 */
export async function getVaultBalance(
  connection: Connection,
  ideaId: string,
  network: Network = "devnet"
): Promise<number> {
  const usdcMint = USDC_MINT[network];
  const [vaultPda] = await getVaultPda(ideaId);
  const vaultAta = await getVaultAta(vaultPda, usdcMint);

  try {
    const accountInfo = await getAccount(connection, vaultAta);
    return Number(accountInfo.amount) / Math.pow(10, USDC_DECIMALS);
  } catch {
    return 0;
  }
}

/**
 * Utilitaires de conversion
 * SECURITY: Uses string-based parsing to avoid floating-point precision issues
 */
export const utils = {
  /**
   * Convertit un montant USDC en unites de base (6 decimales)
   * Uses string manipulation to avoid floating-point precision issues
   * Example: 1.23 -> 1230000n
   */
  usdcToBaseUnits(amount: number | string): bigint {
    // Convert to string to avoid floating-point issues
    const amountStr = typeof amount === "number" ? amount.toString() : amount;

    // Split on decimal point
    const parts = amountStr.split(".");
    const wholePart = parts[0] || "0";
    let decimalPart = parts[1] || "";

    // Pad or truncate decimal part to exactly USDC_DECIMALS digits
    if (decimalPart.length > USDC_DECIMALS) {
      decimalPart = decimalPart.slice(0, USDC_DECIMALS);
    } else {
      decimalPart = decimalPart.padEnd(USDC_DECIMALS, "0");
    }

    // Combine and convert to BigInt
    const combined = wholePart + decimalPart;
    // Remove leading zeros but keep at least one digit
    const cleaned = combined.replace(/^0+/, "") || "0";
    return BigInt(cleaned);
  },

  /**
   * Convertit des unites de base en USDC
   * Returns a number for display purposes
   */
  baseUnitsToUsdc(amount: bigint): number {
    // Use BigInt division for the integer part
    const scale = BigInt(Math.pow(10, USDC_DECIMALS));
    const wholePart = amount / scale;
    const remainder = amount % scale;
    // Convert remainder to decimal
    const decimalPart = Number(remainder) / Number(scale);
    return Number(wholePart) + decimalPart;
  },

  /**
   * Formate un montant USDC pour l'affichage
   */
  formatUsdc(amount: number | bigint): string {
    const num =
      typeof amount === "bigint"
        ? utils.baseUnitsToUsdc(amount)
        : amount;
    return `${num.toFixed(2)} USDC`;
  },

  /**
   * Validates a USDC amount string
   * Returns true if valid, false otherwise
   */
  isValidUsdcAmount(amount: string): boolean {
    if (!amount || amount.trim() === "") return false;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return false;
    // Check for reasonable precision (max 6 decimals)
    const parts = amount.split(".");
    if (parts[1] && parts[1].length > USDC_DECIMALS) return false;
    // Check for reasonable max (prevent overflow)
    if (parsed > 1_000_000_000) return false; // 1 billion USDC max
    return true;
  },
};
