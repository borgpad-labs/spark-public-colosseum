// src/pages/api/createDao.ts

import { SplGovernance } from "governance-idl-sdk";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { jsonResponse, reportError } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';
import { drizzle } from "drizzle-orm/d1";
import BN from "bn.js";
import bs58 from "bs58";


type ENV = {
  RPC_URL: string;
  DB: D1Database;
  VITE_ENVIRONMENT_TYPE?: string;
  PRIVATE_KEY: string
}

interface CreateDaoRequest {
  name: string;
  communityTokenMint: string; // PublicKey as string
  minCommunityWeightToCreateGovernance?: number;
  communityTokenType?: "liquid" | "membership" | "dormant";
  councilTokenType?: "liquid" | "membership" | "dormant";
  councilTokenMint?: string; // Optional PublicKey as string
  communityMintMaxVoterWeightSourceType?: "absolute" | "supplyFraction";
  communityMintMaxVoterWeightSourceValue?: number;
  communityApprovalThreshold?: number; // Percentage for community approval (e.g., 60 for 60%)
  councilApprovalThreshold?: number; // Percentage for council approval (e.g., 50 for 50%)
  minCouncilWeightToCreateProposal?: number;
  minTransactionHoldUpTime?: number;
  votingBaseTime?: number;
  votingCoolOffTime?: number;
  depositExemptProposalCount?: number;
  communityVoteTipping?: "disabled" | "early" | "strict";
  councilVoteTipping?: "disabled" | "early" | "strict";
  communityVetoVoteThreshold?: "disabled" | "enabled";
  councilVetoVoteThreshold?: "disabled" | "enabled";
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true });
  try {
    // authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401);
    // }

    const connection = new Connection(ctx.env.RPC_URL);
    const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

    const splGovernance = new SplGovernance(
      connection,
      governanceProgramId
    );

    const requestBody: CreateDaoRequest = await ctx.request.json();

    const {
      name,
      communityTokenMint,
      minCommunityWeightToCreateGovernance = 9000000000000000, // 9M Tokens to create a proposal with 9 decimals
      communityTokenType = "liquid",
      councilTokenType = "liquid",
      councilTokenMint,
      communityMintMaxVoterWeightSourceType = "supplyFraction",
      communityMintMaxVoterWeightSourceValue = 10000000000,
      communityApprovalThreshold = 5, // 5% vote to pass
      councilApprovalThreshold = 1, // 1% vote to pass (minimum allowed)
      minCouncilWeightToCreateProposal = 1000, // 1 SOVR1N to create a proposal with 9 decimals
      minTransactionHoldUpTime = 0,
      votingBaseTime = 216000,
      votingCoolOffTime = 43200,
      depositExemptProposalCount = 10,
      communityVoteTipping = "disabled",
      councilVoteTipping = "strict",
      communityVetoVoteThreshold = "disabled",
      councilVetoVoteThreshold = "disabled",
    } = requestBody;

    // Convert string addresses to PublicKey
    const communityTokenMintPubKey = new PublicKey(communityTokenMint);
    // Always use the specified council token mint
    const councilTokenMintPubKey = new PublicKey("sVr1ni6ryQ4Q2b176j54Yp7qnngVTdRR7Ztbn4U6ufA");

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array
    const privateKeyUint8Array = bs58.decode(privateKeyString);

    // Initialize your wallet
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);

    const userWallet = wallet.publicKey.toBase58()
    const payerPubKey = new PublicKey(userWallet);

    // Use proper BigInt arithmetic for large token amounts
    const COMMUNITY_DECIMALS = 9n
    const REQUIRED_TOKENS = 900_000_000n // 900M tokens
    
    const minWeightBigInt = REQUIRED_TOKENS * (10n ** COMMUNITY_DECIMALS) // 900_000_000_000_000_000n
    const minWeightBN = new BN(minWeightBigInt.toString())
    
    console.log(`[DAO Creation] Calculated min weight BigInt: ${minWeightBigInt.toString()}`)
    console.log(`[DAO Creation] Calculated min weight BN: ${minWeightBN.toString()}`)
    
    // Validate token mint exists and get its info
    console.log(`[DAO Creation] Validating token mint: ${communityTokenMint}`)
    try {
      const tokenMintInfo = await connection.getAccountInfo(communityTokenMintPubKey)
      if (!tokenMintInfo) {
        throw new Error(`Token mint account does not exist: ${communityTokenMint}`)
      }
      console.log(`[DAO Creation] Token mint account found, data length: ${tokenMintInfo.data.length}`)
    } catch (mintError) {
      console.error(`[DAO Creation] Error validating token mint:`, mintError)
      throw new Error(`Invalid token mint: ${mintError instanceof Error ? mintError.message : String(mintError)}`)
    }

    // Validate DAO parameters
    console.log(`[DAO Creation] Validating DAO parameters...`)
    if (minWeightBN.lte(new BN(0))) {
      throw new Error(`Invalid minCommunityWeightToCreateGovernance: ${minWeightBN.toString()}`)
    }
    if (communityApprovalThreshold < 1 || communityApprovalThreshold > 100) {
      throw new Error(`Invalid communityApprovalThreshold: ${communityApprovalThreshold}`)
    }
    if (councilApprovalThreshold < 1 || councilApprovalThreshold > 100) {
      throw new Error(`Invalid councilApprovalThreshold: ${councilApprovalThreshold}`)
    }
    console.log(`[DAO Creation] Parameters validated successfully`)

    // Prepare the MintMaxVoteWeightSource
    const communityMintMaxVoterWeightSource = {
      type: communityMintMaxVoterWeightSourceType,
      amount: new BN(communityMintMaxVoterWeightSourceValue)
    };

    // Create the realm instruction using the correct signature with council token:
    // createRealmInstruction(name, communityTokenMint, minCommunityWeightToCreateGovernance, payer, 
    //                       communityMintMaxVoterWeightSource?, councilTokenMint?, 
    //                       communityTokenType?, councilTokenType?, ...)
    console.log(`[DAO Creation] Creating realm instruction...`)
    console.log(`[DAO Creation] Realm name: ${name}`)
    console.log(`[DAO Creation] Community token mint: ${communityTokenMintPubKey.toString()}`)
    console.log(`[DAO Creation] Min community weight BN: ${minWeightBN.toString()}`)
    console.log(`[DAO Creation] Max voter weight source:`, communityMintMaxVoterWeightSource)
    
    let createRealmInstruction
    try {
      createRealmInstruction = await splGovernance.createRealmInstruction(
        name,
        communityTokenMintPubKey,
        minWeightBN, // Use BN instead of number
        payerPubKey,
        communityMintMaxVoterWeightSource,
        councilTokenMintPubKey,
        communityTokenType, // Use parameter instead of hardcoded
        councilTokenType  // Use parameter instead of hardcoded
      )
      console.log(`[DAO Creation] Realm instruction created successfully`)
    } catch (realmError) {
      console.error(`[DAO Creation] Error creating realm instruction:`, realmError)
      throw new Error(`Failed to create realm instruction: ${realmError instanceof Error ? realmError.message : String(realmError)}`)
    }



    const realmPubKey = createRealmInstruction.keys[0].pubkey;
    console.log(`[DAO Creation] Realm public key: ${realmPubKey.toString()}`)

    // Create governance instruction with new parameters
    console.log(`[DAO Creation] Creating governance instruction...`)
    const governanceConfig = {
      communityVoteThreshold: { yesVotePercentage: { 0: communityApprovalThreshold } },
      minCommunityWeightToCreateProposal: minWeightBN, // Use same BN value
      minTransactionHoldUpTime: minTransactionHoldUpTime,
      votingBaseTime: votingBaseTime,
      communityVoteTipping: { disabled: {} },
      councilVoteThreshold: { yesVotePercentage: { 0: councilApprovalThreshold } },
      councilVetoVoteThreshold: { disabled: {} },
      minCouncilWeightToCreateProposal: minCouncilWeightToCreateProposal,
      councilVoteTipping: { strict: {} },
      communityVetoVoteThreshold: { disabled: {} },
      votingCoolOffTime: votingCoolOffTime,
      depositExemptProposalCount: depositExemptProposalCount,
    }
    console.log(`[DAO Creation] Governance config:`, governanceConfig)
    
    let createGovernanceInstruction
    try {
      createGovernanceInstruction = await splGovernance.createGovernanceInstruction(
        governanceConfig,
        realmPubKey,
        payerPubKey,
        undefined,
        payerPubKey
      )
      console.log(`[DAO Creation] Governance instruction created successfully`)
    } catch (governanceError) {
      console.error(`[DAO Creation] Error creating governance instruction:`, governanceError)
      throw new Error(`Failed to create governance instruction: ${governanceError instanceof Error ? governanceError.message : String(governanceError)}`)
    }

    // Extract governance public key from the governance instruction
    const governancePubKey = createGovernanceInstruction.keys[1].pubkey;

    const createNativeTreasuryInstruction = await splGovernance.createNativeTreasuryInstruction(
      governancePubKey, // Use governance public key instead of realm public key
      payerPubKey
    );
    console.log("createNativeTreasuryInstruction", createNativeTreasuryInstruction);

    // Extract treasury address from the treasury instruction
    // Based on the transaction structure, the treasury address is the second account (keys[1])
    // keys[0] is the governance account, keys[1] is the actual treasury account
    const treasuryPubKey = createNativeTreasuryInstruction.keys[1].pubkey;
    console.log("Treasury address:", treasuryPubKey.toBase58());

    // Create the transaction with only the first 3 instructions
    const transaction2 = new Transaction().add(
        createRealmInstruction, 
        createGovernanceInstruction, 
        createNativeTreasuryInstruction
    );

    // Create the transaction and set the blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction2.recentBlockhash = blockhash;
    transaction2.feePayer = payerPubKey; // Set the fee payer
    console.log("transaction2", transaction2);
    console.log("transaction2", transaction2.serialize({ requireAllSignatures: false }).toString('base64'));

    // Sign the transaction
    transaction2.sign(wallet);

    // Send the transaction
    const txSignature2 = await connection.sendRawTransaction(transaction2.serialize(), { 
      skipPreflight: false, 
      preflightCommitment: 'confirmed' 
    });

    // Wait for confirmation with extended timeout for devnet
    try {
      const confirmation = await Promise.race([
        connection.confirmTransaction(txSignature2, 'confirmed'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ])
      console.log(`DAO created for token ${communityTokenMint} with signature: ${txSignature2}`)
    } catch (timeoutError) {
      console.log(`Confirmation timeout for ${communityTokenMint}, checking transaction status...`)
      
      try {
        const transactionStatus = await connection.getSignatureStatus(txSignature2)
        if (transactionStatus.value?.confirmationStatus === 'confirmed' || 
            transactionStatus.value?.confirmationStatus === 'finalized') {
          console.log(`DAO creation confirmed via status check for token ${communityTokenMint}`)
        } else {
          console.log(`Transaction status for ${communityTokenMint}:`, transactionStatus.value)
          if (transactionStatus.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(transactionStatus.value.err)}`)
          }
          console.log(`Transaction for ${communityTokenMint} may still be processing`)
        }
      } catch (statusError) {
        console.error(`Error checking transaction status for ${communityTokenMint}:`, statusError)
      }
    }

    if (txSignature2) {
      // Update the database with the DAO address (realm address) and treasury address
      try {
        await ctx.env.DB
          .prepare("UPDATE tokens SET dao = ?, dao_treasury = ? WHERE mint = ?")
          .bind(realmPubKey.toBase58(), treasuryPubKey.toBase58(), communityTokenMint)
          .run();
        console.log(`Updated token ${communityTokenMint} with DAO address: ${realmPubKey.toBase58()} and treasury address: ${treasuryPubKey.toBase58()}`);
      } catch (dbError) {
        console.error("Error updating database with DAO and treasury addresses:", dbError);
        // Don't fail the entire request if DB update fails, just log it
      }

      console.log(`DAO address for token ${communityTokenMint}: ${realmPubKey.toBase58()}`)
      console.log(`Treasury address for token ${communityTokenMint}: ${treasuryPubKey.toBase58()}`)

      return jsonResponse({
        success: true,
        txSignature2: txSignature2,
        realmAddress: realmPubKey.toBase58(),
        governanceAddress: governancePubKey.toBase58(),
        treasuryAddress: treasuryPubKey.toBase58(),
      }, 200);
    }

    // Return the transaction for the client to sign and send
    // In a real implementation, you might want to serialize the transaction
    return jsonResponse({
      message: "DAO creation transaction prepared successfully!",
      transaction: transaction2.serialize({ requireAllSignatures: false }).toString('base64'),
      realmName: name
    }, 200);

  } catch (e) {
    console.error("Error creating DAO:", e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ message: "Something went wrong creating the DAO..." }, 500);
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
