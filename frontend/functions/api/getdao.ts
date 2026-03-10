// src/pages/api/getDao.ts

import { SplGovernance } from "governance-idl-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { jsonResponse, reportError } from './cfPagesFunctionsUtils';
import { drizzle } from "drizzle-orm/d1";

type ENV = {
  RPC_URL: string;
  DB: D1Database;
  VITE_ENVIRONMENT_TYPE?: string;
}

export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true });
  try {
    const url = new URL(ctx.request.url);
    const daoAddress = url.searchParams.get('address');
    console.log("daoAddress", daoAddress)
    
    if (!daoAddress) {
      return jsonResponse({ message: "DAO address parameter is required" }, 400);
    }

    // Validate the address format
    let realmPubKey: PublicKey;
    try {
      realmPubKey = new PublicKey(daoAddress);
    } catch (error) {
      return jsonResponse({ message: "Invalid DAO address format" }, 400);
    }

    const connection = new Connection(ctx.env.RPC_URL);
    const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

    const splGovernance = new SplGovernance(
      connection,
      governanceProgramId
    );

    // First check if the account exists and has data
    const accountInfo = await connection.getAccountInfo(realmPubKey);
    if (!accountInfo) {
      return jsonResponse({ message: "Account not found at the provided address" }, 404);
    }

    // Check if it's owned by the governance program
    if (!accountInfo.owner.equals(governanceProgramId)) {
      const ownerProgram = accountInfo.owner.toBase58();
      
      // If it's a token account/mint, try to help find DAOs using this token
      if (ownerProgram === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
        try {
          console.log("Address appears to be a token mint/account, searching for DAOs using this token...");
          const realmsUsingToken = await splGovernance.getRealmsByCommunityMint(realmPubKey);
          
          if (realmsUsingToken.length > 0) {
            return jsonResponse({ 
              message: "This appears to be a token address, not a DAO address. Found DAOs using this token:",
              possibleDAOs: realmsUsingToken.map(realm => ({
                address: realm.publicKey.toBase58(),
                name: realm.name,
                communityMint: realm.communityMint.toBase58()
              }))
            }, 400);
          } else {
            return jsonResponse({ 
              message: "This is a token address, not a DAO address. No DAOs found using this token as community mint.",
              hint: "Please provide the actual DAO/Realm account address, not the token address."
            }, 400);
          }
        } catch (error) {
          return jsonResponse({ 
            message: "This is a token address, not a DAO address. Please provide the actual DAO/Realm account address.",
            accountOwner: ownerProgram,
            hint: "You can find DAO addresses on governance explorers like Realms.today"
          }, 400);
        }
      }
      
      return jsonResponse({ 
        message: `Account is not owned by governance program. Owner: ${ownerProgram}`,
        hint: "Please provide a valid DAO/Realm account address."
      }, 400);
    }

    console.log(`Account found with ${accountInfo.data.length} bytes of data`);

    try {
      // Try to get realm as V2 first, fallback to V1 if that fails
      let realm;
      let isV1 = false;
      
      try {
        realm = await splGovernance.getRealmByPubkey(realmPubKey);
        console.log("Successfully fetched V2 realm:", realm.name);
      } catch (v2Error) {
        console.log("Failed to fetch as V2 realm, trying V1:", v2Error.message);
        try {
          realm = await splGovernance.getRealmV1ByPubkey(realmPubKey);
          isV1 = true;
          console.log("Successfully fetched V1 realm:", realm.name);
        } catch (v1Error) {
          console.log("Failed to fetch as V1 realm:", v1Error.message);
          throw new Error(`Could not parse as V2 or V1 realm: V2 error: ${v2Error.message}, V1 error: ${v1Error.message}`);
        }
      }
      
      // Get all governance accounts for this realm
      const governanceAccounts = await splGovernance.getGovernanceAccountsByRealm(realmPubKey);
      console.log(`Found ${governanceAccounts.length} governance accounts`);

      // Calculate governance token holding account PDA for community mint
      const [communityTokenHoldingAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("governance"),
          realmPubKey.toBuffer(),
          realm.communityMint.toBuffer()
        ],
        governanceProgramId
      );

      // Calculate realm config account PDA
      const [realmConfigAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("realm-config"),
          realmPubKey.toBuffer()
        ],
        governanceProgramId
      );
      
      // Get all proposals for this realm by fetching proposals for each governance
      const allProposals = [];
      for (const governance of governanceAccounts) {
        try {
          const proposals = await splGovernance.getProposalsforGovernance(governance.publicKey);
          allProposals.push(...proposals);
          console.log(`Found ${proposals.length} proposals for governance ${governance.publicKey.toBase58()}`);
          console.log(proposals)
        } catch (error) {
          console.warn(`Failed to get proposals for governance ${governance.publicKey.toBase58()}:`, error);
        }
      }

      // Format the response with proper DAO information
      const daoInfo = {
        address: daoAddress,
        name: realm.name,
        description: `Governance realm (${isV1 ? 'V1' : 'V2'}) with ${governanceAccounts.length} governance(s)`,
        communityMint: realm.communityMint.toBase58(),
        communityTokenHoldingAccount: communityTokenHoldingAccount.toBase58(),
        realmConfigAccount: realmConfigAccount.toBase58(),
        councilMint: isV1 
          ? (realm as any).config?.councilMint?.toBase58() || null
          : realm.config.councilMint?.toBase58() || null,
        authority: realm.authority?.toBase58() || null,
        version: isV1 ? 'V1' : 'V2',
        governances: governanceAccounts.map(gov => ({
          address: gov.publicKey.toBase58(),
          realm: gov.realm.toBase58(),
          governedAccount: gov.governedAccount.toBase58(),
          activeProposalCount: Number(gov.activeProposalCount),
          config: {
            minCommunityWeightToCreateProposal: gov.config.minCommunityWeightToCreateProposal.toString(),
            minTransactionHoldUpTime: gov.config.minTransactionHoldUpTime,
            votingBaseTime: gov.config.votingBaseTime,
            votingCoolOffTime: gov.config.votingCoolOffTime,
          }
        })),
        proposals: allProposals.map(proposal => ({
          address: proposal.publicKey.toBase58(),
          governance: proposal.governance.toBase58(),
          name: proposal.name,
          description: proposal.descriptionLink,
          state: proposal.state,
          draftAt: proposal.draftAt?.toString(),
          votingAt: proposal.votingAt?.toString(),
          votingCompletedAt: proposal.votingCompletedAt?.toString(),
          executingAt: proposal.executingAt?.toString(),
          closedAt: proposal.closedAt?.toString(),
          options: proposal.options.map(option => ({
            label: option.label,
            voteWeight: option.voteWeight.toString(),
            voteResult: option.voteResult,
            transactionsCount: option.transactionsCount,
            transactionsExecutedCount: option.transactionsExecutedCount,
          })),
          denyVoteWeight: proposal.denyVoteWeight?.toString() || "0",
          abstainVoteWeight: proposal.abstainVoteWeight?.toString() || "0",
          vetoVoteWeight: proposal.vetoVoteWeight?.toString() || "0",
        })),
        proposalCount: allProposals.length
      };

      return jsonResponse({
        success: true,
        dao: daoInfo
      }, 200);
      
    } catch (error) {
      console.error("Error fetching realm:", error);
      return jsonResponse({ message: "DAO not found or invalid address" }, 404);
    }

  } catch (e) {
    console.error("Error fetching DAO:", e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ message: "Something went wrong fetching the DAO information..." }, 500);
  }
};

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  try {
    if (ctx.env.VITE_ENVIRONMENT_TYPE !== "develop") return;
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return jsonResponse({ message: error }, 500);
  }
};


