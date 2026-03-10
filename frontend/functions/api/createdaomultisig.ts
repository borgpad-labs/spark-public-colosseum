// src/pages/api/createdaomultisig.ts

import { SplGovernance } from "governance-idl-sdk";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createInitializeMintInstruction, TOKEN_PROGRAM_ID, MINT_SIZE, getMinimumBalanceForRentExemption } from "@solana/spl-token";
import { jsonResponse, reportError } from './cfPagesFunctionsUtils';
import { drizzle } from "drizzle-orm/d1";
import BN from "bn.js";
import bs58 from "bs58";

type ENV = {
  RPC_URL: string;
  DB: D1Database;
  VITE_ENVIRONMENT_TYPE?: string;
  PRIVATE_KEY: string;
}

interface CreateDaoMultisigRequest {
  name: string;
  communityTokenMint?: string; // Optional community token mint (will be dormant). If not provided, a dummy mint is created.
  councilMembers: string[]; // List of wallet addresses for council/multisig signers
  councilApprovalThreshold?: number; // Percentage for council approval (e.g., 60 for 60%)
  communityApprovalThreshold?: number; // Percentage for community approval (default disabled via high min weight)
  minCouncilWeightToCreateProposal?: number; // Min council weight to create a proposal (default 1 = any member)
  minTransactionHoldUpTime?: number; // Seconds before approved transactions can be executed
  votingBaseTime?: number; // Seconds for voting period
  votingCoolOffTime?: number; // Seconds for cool-off after voting ends
  depositExemptProposalCount?: number;
  councilVoteTipping?: "disabled" | "early" | "strict";
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true });
  try {
    const connection = new Connection(ctx.env.RPC_URL);
    const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

    const splGovernance = new SplGovernance(
      connection,
      governanceProgramId
    );

    const requestBody: CreateDaoMultisigRequest = await ctx.request.json();

    const {
      name,
      communityTokenMint,
      councilMembers,
      councilApprovalThreshold = 60, // 60% vote to pass
      communityApprovalThreshold = 5,
      minCouncilWeightToCreateProposal = 1, // Any council member can create a proposal
      minTransactionHoldUpTime = 0,
      votingBaseTime = 259200, // 3 days
      votingCoolOffTime = 43200, // 12 hours
      depositExemptProposalCount = 10,
      councilVoteTipping = "early",
    } = requestBody;

    // Validate council members
    if (!councilMembers || councilMembers.length === 0) {
      return jsonResponse({ message: "At least one council member is required" }, 400);
    }

    if (councilMembers.length > 10) {
      return jsonResponse({ message: "Maximum 10 council members supported per transaction" }, 400);
    }

    // Validate all council member addresses
    const councilMemberPubkeys: PublicKey[] = [];
    for (const member of councilMembers) {
      try {
        councilMemberPubkeys.push(new PublicKey(member));
      } catch {
        return jsonResponse({ message: `Invalid council member address: ${member}` }, 400);
      }
    }

    // Check for duplicate addresses
    const uniqueMembers = new Set(councilMembers);
    if (uniqueMembers.size !== councilMembers.length) {
      return jsonResponse({ message: "Duplicate council member addresses found" }, 400);
    }

    // Validate thresholds
    if (councilApprovalThreshold < 1 || councilApprovalThreshold > 100) {
      return jsonResponse({ message: `Invalid councilApprovalThreshold: ${councilApprovalThreshold}. Must be between 1 and 100.` }, 400);
    }

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const payerPubKey = wallet.publicKey;

    console.log(`[Multisig DAO] Creating multisig DAO: "${name}" with ${councilMembers.length} council members`);

    // --- Step 1: Create council token mint (legacy SPL Token) ---
    console.log(`[Multisig DAO] Creating council token mint...`);
    const councilMintKeypair = Keypair.generate();
    const councilMintPubKey = councilMintKeypair.publicKey;

    const lamportsForMint = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    const createCouncilMintAccountIx = SystemProgram.createAccount({
      fromPubkey: payerPubKey,
      newAccountPubkey: councilMintPubKey,
      space: MINT_SIZE,
      lamports: lamportsForMint,
      programId: TOKEN_PROGRAM_ID,
    });

    // Initialize the mint with 0 decimals (1 token = 1 vote) and payer as mint authority
    const initCouncilMintIx = createInitializeMintInstruction(
      councilMintPubKey,
      0, // 0 decimals for council membership tokens
      payerPubKey, // mint authority
      null, // no freeze authority
      TOKEN_PROGRAM_ID,
    );

    console.log(`[Multisig DAO] Council mint: ${councilMintPubKey.toBase58()}`);

    // --- Step 2: Determine community token mint ---
    let communityMintPubKey: PublicKey;
    let communityMintKeypair: Keypair | null = null;
    const additionalMintInstructions: any[] = [];

    if (communityTokenMint) {
      communityMintPubKey = new PublicKey(communityTokenMint);
      console.log(`[Multisig DAO] Using provided community mint: ${communityMintPubKey.toBase58()}`);
    } else {
      // Create a dummy community mint (dormant, so not used for voting)
      communityMintKeypair = Keypair.generate();
      communityMintPubKey = communityMintKeypair.publicKey;

      const createCommunityMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payerPubKey,
        newAccountPubkey: communityMintPubKey,
        space: MINT_SIZE,
        lamports: lamportsForMint,
        programId: TOKEN_PROGRAM_ID,
      });

      const initCommunityMintIx = createInitializeMintInstruction(
        communityMintPubKey,
        0,
        payerPubKey,
        null,
        TOKEN_PROGRAM_ID,
      );

      additionalMintInstructions.push(createCommunityMintAccountIx, initCommunityMintIx);
      console.log(`[Multisig DAO] Created dummy community mint: ${communityMintPubKey.toBase58()}`);
    }

    // --- Step 3: Create Realm instruction ---
    // Community token is dormant (disabled), council token is membership (non-withdrawable)
    console.log(`[Multisig DAO] Creating realm instruction...`);

    const createRealmInstruction = await splGovernance.createRealmInstruction(
      name,
      communityMintPubKey,
      new BN("18446744073709551615"), // max u64 = effectively disabled for community
      payerPubKey,
      { type: "supplyFraction", amount: new BN(10000000000) },
      councilMintPubKey,
      "dormant",    // community token type - DISABLED
      "membership"  // council token type - MEMBERSHIP (non-withdrawable)
    );

    const realmPubKey = createRealmInstruction.keys[0].pubkey;
    console.log(`[Multisig DAO] Realm: ${realmPubKey.toBase58()}`);

    // --- Step 4: Deposit governing tokens for each council member ---
    // Using the mint as source (minting tokens directly into the realm's holding account)
    console.log(`[Multisig DAO] Creating deposit instructions for ${councilMemberPubkeys.length} members...`);

    const depositInstructions = [];
    for (const memberPubKey of councilMemberPubkeys) {
      const depositIx = await splGovernance.depositGoverningTokensInstruction(
        realmPubKey,
        councilMintPubKey,   // governing token mint
        councilMintPubKey,   // source = mint itself (triggers minting)
        memberPubKey,        // council member wallet (governing token owner)
        payerPubKey,         // mint authority (source authority for minting)
        payerPubKey,         // payer
        1                    // 1 token = 1 vote
      );
      depositInstructions.push(depositIx);
      console.log(`[Multisig DAO] Deposit instruction for member: ${memberPubKey.toBase58()}`);
    }

    // --- Step 5: Create governance instruction ---
    console.log(`[Multisig DAO] Creating governance instruction...`);

    const governanceConfig = {
      communityVoteThreshold: { disabled: {} }, // Community voting disabled
      minCommunityWeightToCreateProposal: new BN("18446744073709551615"), // max u64 = disabled
      minTransactionHoldUpTime: minTransactionHoldUpTime,
      votingBaseTime: votingBaseTime,
      communityVoteTipping: { disabled: {} },
      councilVoteThreshold: { yesVotePercentage: { 0: councilApprovalThreshold } },
      councilVetoVoteThreshold: { disabled: {} },
      minCouncilWeightToCreateProposal: minCouncilWeightToCreateProposal,
      councilVoteTipping: councilVoteTipping === "disabled" ? { disabled: {} }
        : councilVoteTipping === "early" ? { early: {} }
        : { strict: {} },
      communityVetoVoteThreshold: { disabled: {} },
      votingCoolOffTime: votingCoolOffTime,
      depositExemptProposalCount: depositExemptProposalCount,
    };

    console.log(`[Multisig DAO] Governance config:`, governanceConfig);

    const createGovernanceInstruction = await splGovernance.createGovernanceInstruction(
      governanceConfig,
      realmPubKey,
      payerPubKey,
      undefined,
      payerPubKey
    );

    const governancePubKey = createGovernanceInstruction.keys[1].pubkey;
    console.log(`[Multisig DAO] Governance: ${governancePubKey.toBase58()}`);

    // --- Step 6: Create native treasury ---
    const createNativeTreasuryInstruction = await splGovernance.createNativeTreasuryInstruction(
      governancePubKey,
      payerPubKey
    );

    const treasuryPubKey = createNativeTreasuryInstruction.keys[1].pubkey;
    console.log(`[Multisig DAO] Treasury: ${treasuryPubKey.toBase58()}`);

    // --- Step 7: Build and send transaction ---
    // Transaction order:
    // 1. Create council mint account + initialize
    // 2. (Optional) Create community mint account + initialize
    // 3. Create realm
    // 4. Deposit tokens for each council member
    // 5. Create governance
    // 6. Create native treasury
    const transaction = new Transaction();

    // Add council mint creation
    transaction.add(createCouncilMintAccountIx);
    transaction.add(initCouncilMintIx);

    // Add community mint creation if needed
    for (const ix of additionalMintInstructions) {
      transaction.add(ix);
    }

    // Add realm creation
    transaction.add(createRealmInstruction);

    // Add deposit instructions for each member
    for (const depositIx of depositInstructions) {
      transaction.add(depositIx);
    }

    // Add governance + treasury
    transaction.add(createGovernanceInstruction);
    transaction.add(createNativeTreasuryInstruction);

    // Set blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerPubKey;

    console.log(`[Multisig DAO] Transaction built with ${transaction.instructions.length} instructions`);

    // Sign the transaction (wallet + council mint keypair + optional community mint keypair)
    const signers = [wallet, councilMintKeypair];
    if (communityMintKeypair) {
      signers.push(communityMintKeypair);
    }
    transaction.sign(...signers);

    // Send the transaction
    const txSignature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    console.log(`[Multisig DAO] Transaction sent: ${txSignature}`);

    // Wait for confirmation
    try {
      await Promise.race([
        connection.confirmTransaction(txSignature, 'confirmed'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ]);
      console.log(`[Multisig DAO] Transaction confirmed: ${txSignature}`);
    } catch (timeoutError) {
      console.log(`[Multisig DAO] Confirmation timeout, checking status...`);
      const transactionStatus = await connection.getSignatureStatus(txSignature);
      if (transactionStatus.value?.confirmationStatus === 'confirmed' ||
          transactionStatus.value?.confirmationStatus === 'finalized') {
        console.log(`[Multisig DAO] Confirmed via status check`);
      } else if (transactionStatus.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(transactionStatus.value.err)}`);
      } else {
        console.log(`[Multisig DAO] Transaction may still be processing`);
      }
    }

    // Update database if a community token mint was provided (link DAO to token)
    if (communityTokenMint && txSignature) {
      try {
        await ctx.env.DB
          .prepare("UPDATE tokens SET dao = ?, dao_treasury = ? WHERE mint = ?")
          .bind(realmPubKey.toBase58(), treasuryPubKey.toBase58(), communityTokenMint)
          .run();
        console.log(`[Multisig DAO] Updated token ${communityTokenMint} with DAO: ${realmPubKey.toBase58()}`);
      } catch (dbError) {
        console.error("[Multisig DAO] Error updating database:", dbError);
      }
    }

    return jsonResponse({
      success: true,
      txSignature: txSignature,
      realmAddress: realmPubKey.toBase58(),
      governanceAddress: governancePubKey.toBase58(),
      treasuryAddress: treasuryPubKey.toBase58(),
      councilMint: councilMintPubKey.toBase58(),
      councilMembers: councilMemberPubkeys.map(m => m.toBase58()),
      memberCount: councilMemberPubkeys.length,
    }, 200);

  } catch (e) {
    console.error("[Multisig DAO] Error creating multisig DAO:", e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ message: "Something went wrong creating the multisig DAO..." }, 500);
  }
};

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  try {
    if (ctx.env.VITE_ENVIRONMENT_TYPE !== "develop") return;
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return jsonResponse({ message: error }, 500);
  }
};
