// File: functions/api/idea-investments.ts
// Investment API for ideas funding

import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";

type ENV = {
  DB: D1Database;
  VITE_ENVIRONMENT_TYPE: string;
  TREASURY_WALLETS?: string;
  ADMIN_ADDRESSES?: string;
  RPC_URL?: string;
  RPC_URL2?: string;
};

// SECURITY: Whitelist of allowed origins for CORS
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://sparkidea.io",
  "https://www.sparkidea.io",
  "https://spark-it.pages.dev",
  "https://stage.spark-it.pages.dev",
  "https://justspark.fun",
];

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";

  // SECURITY: Only allow whitelisted origins
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// SECURITY: Validate Solana transaction signature format (base58, 88 chars typical)
function isValidTransactionSignature(signature: string): boolean {
  if (!signature || typeof signature !== "string") return false;
  // Solana signatures are base58 encoded, typically 87-88 characters
  if (signature.length < 80 || signature.length > 100) return false;
  // Base58 character set (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(signature);
}

// SECURITY: Validate Solana wallet address format
function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  // Solana addresses are base58 encoded, 32-44 characters
  if (address.length < 32 || address.length > 44) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

// SECURITY: Verify on-chain transaction exists and matches expected details
// direction: "deposit" = user spent USDC (pre > post), "withdraw" = user received USDC (post > pre)
async function verifyTransaction(
  rpcUrl: string,
  signature: string,
  expectedWallet: string,
  expectedAmountUsdc: number,
  direction: "deposit" | "withdraw" = "deposit"
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
      }),
    });

    const data = await response.json() as {
      result?: {
        meta?: {
          err: unknown;
          preTokenBalances?: Array<{ owner: string; uiTokenAmount: { uiAmount: number }; mint: string }>;
          postTokenBalances?: Array<{ owner: string; uiTokenAmount: { uiAmount: number }; mint: string }>;
        };
        transaction?: {
          message?: {
            accountKeys?: Array<{ pubkey: string; signer: boolean }>;
          };
        };
      };
      error?: { message: string };
    };

    // If not found, retry once after 2 seconds (devnet/RPC propagation delay)
    if (data.error || !data.result) {
      await new Promise((r) => setTimeout(r, 2000));
      const retryResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
        }),
      });
      const retryData = await retryResponse.json() as typeof data;
      if (retryData.error || !retryData.result) {
        return { valid: false, error: "Transaction not found on-chain (after retry)" };
      }
      // Use retry data for the rest of the verification
      Object.assign(data, retryData);
    }

    // Check transaction didn't fail
    if (data.result.meta?.err) {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    // Verify the signer matches the expected wallet
    const signers = data.result.transaction?.message?.accountKeys
      ?.filter((k) => k.signer)
      .map((k) => k.pubkey) || [];

    if (!signers.includes(expectedWallet)) {
      return { valid: false, error: "Transaction signer does not match investor wallet" };
    }

    // Verify USDC token transfer amount by checking balance changes
    // USDC mint addresses (devnet + mainnet)
    const USDC_MINTS = [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // mainnet
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // devnet
    ];

    const preBalances = data.result.meta?.preTokenBalances || [];
    const postBalances = data.result.meta?.postTokenBalances || [];

    // Find the signer's USDC balance change
    const preUsdcBalance = preBalances.find(
      (b) => b.owner === expectedWallet && USDC_MINTS.includes(b.mint)
    );
    const postUsdcBalance = postBalances.find(
      (b) => b.owner === expectedWallet && USDC_MINTS.includes(b.mint)
    );

    if (preUsdcBalance && postUsdcBalance) {
      const preAmount = preUsdcBalance.uiTokenAmount.uiAmount || 0;
      const postAmount = postUsdcBalance.uiTokenAmount.uiAmount || 0;

      // For deposit: user spent USDC (pre > post), change is positive
      // For withdraw: user received USDC (post > pre), change is positive
      const balanceChange = direction === "deposit"
        ? preAmount - postAmount   // spent
        : postAmount - preAmount;  // received

      // Allow 1% tolerance for rounding
      if (balanceChange < expectedAmountUsdc * 0.99) {
        return {
          valid: false,
          error: `Transaction amount mismatch: expected $${expectedAmountUsdc} ${direction}, found $${balanceChange.toFixed(6)} ${direction === "deposit" ? "spent" : "received"}`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("Transaction verification failed:", error);
    return { valid: false, error: "Failed to verify transaction on-chain" };
  }
}

export const onRequest: PagesFunction<ENV> = async (context) => {
  const request = context.request;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  switch (method) {
    case "GET":
      return handleGetRequest(context);
    case "POST":
      return handlePostRequest(context);
    case "PUT":
      return handlePutRequest(context);
    default:
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          ...corsHeaders(request),
          Allow: "OPTIONS, GET, POST, PUT",
        },
      });
  }
};

// GET - Fetch investments for an idea or by wallet
async function handleGetRequest(ctx: EventContext<ENV, string, unknown>) {
  const db = ctx.env.DB;

  try {
    const { searchParams } = new URL(ctx.request.url);
    const ideaId = searchParams.get("ideaId");
    const wallet = searchParams.get("wallet");

    let investments;
    
    if (ideaId) {
      // Get all investments for an idea
      investments = await db
        .prepare(
          `SELECT * FROM idea_investments 
           WHERE idea_id = ? 
           ORDER BY created_at DESC`
        )
        .bind(ideaId)
        .all();
      
      // Get the treasury wallet for this idea, assign one if it doesn't exist
      let idea = await db
        .prepare("SELECT treasury_wallet FROM ideas WHERE id = ?")
        .bind(ideaId)
        .first<{ treasury_wallet?: string }>();
      
      let treasuryWallet = idea?.treasury_wallet;
      
      // If no treasury wallet assigned, assign one now
      if (!treasuryWallet) {
        // Get treasury wallets from environment variable
        const treasuryWalletsEnv = ctx.env.TREASURY_WALLETS || "";
        const treasuryWallets = treasuryWalletsEnv
          .split(",")
          .map((addr: string) => addr.trim())
          .filter((addr: string) => addr.length > 0);
        
        // Fallback to ADMIN_ADDRESSES if TREASURY_WALLETS not configured
        if (treasuryWallets.length === 0) {
          const adminAddresses = (ctx.env.ADMIN_ADDRESSES || "").split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
          if (adminAddresses.length > 0) {
            treasuryWallet = assignTreasuryWallet(ideaId, adminAddresses);
          }
        } else {
          treasuryWallet = assignTreasuryWallet(ideaId, treasuryWallets);
        }
        
        // Update idea with assigned treasury wallet
        if (treasuryWallet) {
          await db
            .prepare("UPDATE ideas SET treasury_wallet = ? WHERE id = ?")
            .bind(treasuryWallet, ideaId)
            .run();
          
          console.log(`✅ [INVESTMENT GET] Assigned treasury wallet ${treasuryWallet} to existing idea ${ideaId}`);
        }
      }
      
      return jsonResponse({ 
        investments: investments.results,
        treasury_wallet: treasuryWallet || null
      }, 200);
    } else if (wallet) {
      // Get all investments by a specific wallet
      investments = await db
        .prepare(
          `SELECT i.*, ideas.title as idea_title, ideas.slug as idea_slug 
           FROM idea_investments i
           JOIN ideas ON i.idea_id = ideas.id
           WHERE i.investor_wallet = ? 
           ORDER BY i.created_at DESC`
        )
        .bind(wallet)
        .all();
    } else {
      return jsonResponse({ message: "ideaId or wallet parameter is required" }, 400);
    }

    return jsonResponse({ investments: investments.results }, 200);
  } catch (e) {
    await reportError(db, e);
    return jsonResponse({ message: "Something went wrong..." }, 500);
  }
}

// Helper function to assign a treasury wallet to an idea deterministically
function assignTreasuryWallet(ideaId: string, treasuryWallets: string[]): string {
  if (!treasuryWallets || treasuryWallets.length === 0) {
    // Fallback to ADMIN_ADDRESSES if no treasury wallets configured
    return "";
  }
  
  // Create a simple hash from the idea ID
  let hash = 0;
  for (let i = 0; i < ideaId.length; i++) {
    const char = ideaId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % treasuryWallets.length;
  return treasuryWallets[index];
}

// POST - Create a new investment
async function handlePostRequest(ctx: EventContext<ENV, string, unknown>) {
  const db = ctx.env.DB;
  const request = ctx.request;

  try {
    const body = await request.json() as {
      ideaId?: string;
      investorWallet?: string;
      amountUsdc?: number;
      transactionSignature?: string;
    };

    const { ideaId, investorWallet, amountUsdc, transactionSignature } = body;

    // Validate required fields
    if (!ideaId || !investorWallet || !amountUsdc) {
      return new Response(
        JSON.stringify({ message: "ideaId, investorWallet, and amountUsdc are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Validate wallet address format
    if (!isValidWalletAddress(investorWallet)) {
      return new Response(
        JSON.stringify({ message: "Invalid wallet address format" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Validate transaction signature format if provided
    if (transactionSignature && !isValidTransactionSignature(transactionSignature)) {
      return new Response(
        JSON.stringify({ message: "Invalid transaction signature format" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Validate amount is a positive number with reasonable bounds
    if (typeof amountUsdc !== "number" || amountUsdc <= 0) {
      return new Response(
        JSON.stringify({ message: "Amount must be greater than 0" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Check for reasonable amount limits (max 1 billion USDC)
    if (amountUsdc > 1_000_000_000) {
      return new Response(
        JSON.stringify({ message: "Amount exceeds maximum allowed" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Validate decimal precision (max 6 decimals for USDC)
    const decimalParts = amountUsdc.toString().split(".");
    if (decimalParts[1] && decimalParts[1].length > 6) {
      return new Response(
        JSON.stringify({ message: "Amount exceeds maximum decimal precision (6 decimals)" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // Check if idea exists and get current raised amount and treasury_wallet
    const idea = await db
      .prepare("SELECT id, estimated_price, raised_amount, treasury_wallet FROM ideas WHERE id = ?")
      .bind(ideaId)
      .first<{ id: string; estimated_price: number; raised_amount: number; treasury_wallet?: string }>();

    if (!idea) {
      return new Response(JSON.stringify({ message: "Idea not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      });
    }

    // Assign treasury wallet if not already assigned
    let treasuryWallet = idea.treasury_wallet;
    if (!treasuryWallet) {
      // Get treasury wallets from environment variable
      const treasuryWalletsEnv = ctx.env.TREASURY_WALLETS || "";
      const treasuryWallets = treasuryWalletsEnv
        .split(",")
        .map((addr: string) => addr.trim())
        .filter((addr: string) => addr.length > 0);
      
      // Fallback to ADMIN_ADDRESSES if TREASURY_WALLETS not configured
      if (treasuryWallets.length === 0) {
        const adminAddresses = (ctx.env.ADMIN_ADDRESSES || "").split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
        if (adminAddresses.length > 0) {
          treasuryWallet = assignTreasuryWallet(ideaId, adminAddresses);
        } else {
          return new Response(JSON.stringify({ message: "Treasury wallets not configured" }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(request),
            },
          });
        }
      } else {
        treasuryWallet = assignTreasuryWallet(ideaId, treasuryWallets);
      }
      
      // Update idea with assigned treasury wallet
      await db
        .prepare("UPDATE ideas SET treasury_wallet = ? WHERE id = ?")
        .bind(treasuryWallet, ideaId)
        .run();
      
      console.log(`✅ [INVESTMENT] Assigned treasury wallet ${treasuryWallet} to idea ${ideaId}`);
    }

    // Check if investment would exceed the goal
    const currentRaised = idea.raised_amount || 0;
    const goal = idea.estimated_price || 0;
    const remaining = Math.max(0, goal - currentRaised);

    // Note: We no longer block investments exceeding the goal.
    // The on-chain vault accepts deposits beyond the cap, and raised_amount
    // should reflect the real total to stay in sync.

    // SECURITY: Verify on-chain transaction before recording investment
    if (!transactionSignature) {
      return new Response(
        JSON.stringify({ message: "Transaction signature is required. Investments must be verified on-chain." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // Check for duplicate transaction signature
    const existingTx = await db
      .prepare("SELECT id FROM idea_investments WHERE transaction_signature = ?")
      .bind(transactionSignature)
      .first();

    if (existingTx) {
      return new Response(
        JSON.stringify({ message: "This transaction has already been recorded" }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // Verify transaction on-chain via RPC
    const rpcUrl = ctx.env.RPC_URL || ctx.env.RPC_URL2 || "https://api.devnet.solana.com";
    const verification = await verifyTransaction(rpcUrl, transactionSignature, investorWallet, amountUsdc);

    if (!verification.valid) {
      console.error(`❌ [INVESTMENT] Transaction verification failed: ${verification.error}`, {
        signature: transactionSignature,
        wallet: investorWallet,
        amount: amountUsdc,
      });
      return new Response(
        JSON.stringify({ message: `Transaction verification failed: ${verification.error}` }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    console.log(`✅ [INVESTMENT] Transaction verified on-chain: ${transactionSignature}`);

    const id = generateUUID();
    const createdAt = new Date().toISOString();

    // Insert investment
    await db
      .prepare(
        `INSERT INTO idea_investments (id, idea_id, investor_wallet, amount_usdc, status, transaction_signature, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(id, ideaId, investorWallet, amountUsdc, 'active', transactionSignature || null, createdAt)
      .run();

    // Update raised amount on idea
    const newRaisedAmount = currentRaised + amountUsdc;
    await db
      .prepare("UPDATE ideas SET raised_amount = ? WHERE id = ?")
      .bind(newRaisedAmount, ideaId)
      .run();

    // If cap is reached, record the timestamp
    if (newRaisedAmount >= goal && goal > 0) {
      await db
        .prepare("UPDATE ideas SET cap_reached_at = ? WHERE id = ? AND cap_reached_at IS NULL")
        .bind(new Date().toISOString(), ideaId)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        investment: {
          id,
          idea_id: ideaId,
          investor_wallet: investorWallet,
          amount_usdc: amountUsdc,
          status: 'active',
          created_at: createdAt,
        },
        treasury_wallet: treasuryWallet,
        message: "Investment recorded successfully",
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      }
    );
  } catch (e) {
    await reportError(db, e);
    return new Response(JSON.stringify({ message: "Something went wrong..." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(request),
      },
    });
  }
}

// PUT - Update investment status (claim/refund)
async function handlePutRequest(ctx: EventContext<ENV, string, unknown>) {
  const db = ctx.env.DB;
  const request = ctx.request;

  try {
    const body = await request.json() as {
      id?: string;
      action?: 'claim' | 'refund';
      transactionSignature?: string;
    };

    const { id, action, transactionSignature } = body;

    if (!id || !action) {
      return new Response(
        JSON.stringify({ message: "id and action are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // Get current investment
    const investment = await db
      .prepare("SELECT * FROM idea_investments WHERE id = ?")
      .bind(id)
      .first<{ id: string; idea_id: string; investor_wallet: string; amount_usdc: number; status: string }>();

    if (!investment) {
      return new Response(JSON.stringify({ message: "Investment not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      });
    }

    if (investment.status !== 'active') {
      return new Response(
        JSON.stringify({ message: `Investment is already ${investment.status}` }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }

    // SECURITY: Verify withdrawal transaction on-chain
    if (action === 'refund') {
      if (!transactionSignature) {
        return new Response(
          JSON.stringify({ message: "Transaction signature is required for withdrawals. Must be verified on-chain." }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(request),
            },
          }
        );
      }

      if (!isValidTransactionSignature(transactionSignature)) {
        return new Response(
          JSON.stringify({ message: "Invalid transaction signature format" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(request),
            },
          }
        );
      }

      const rpcUrl = ctx.env.RPC_URL || ctx.env.RPC_URL2 || "https://api.devnet.solana.com";
      // For withdrawals, we verify the tx exists and was signed by the right wallet.
      // We don't verify the exact amount because a single on-chain withdraw can cover
      // multiple investment records (e.g. full withdrawal marks all records as refunded).
      const verification = await verifyTransaction(rpcUrl, transactionSignature, investment.investor_wallet, 0, "withdraw");

      if (!verification.valid) {
        console.error(`❌ [WITHDRAW] Transaction verification failed: ${verification.error}`, {
          signature: transactionSignature,
          wallet: investment.investor_wallet,
          investmentId: id,
        });
        return new Response(
          JSON.stringify({ message: `Withdrawal verification failed: ${verification.error}` }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(request),
            },
          }
        );
      }

      console.log(`✅ [WITHDRAW] Transaction verified on-chain: ${transactionSignature}`);
    }

    const newStatus = action === 'claim' ? 'claimed' : 'refunded';

    // Update investment status
    await db
      .prepare("UPDATE idea_investments SET status = ? WHERE id = ?")
      .bind(newStatus, id)
      .run();

    // If refunding, reduce the raised amount
    if (action === 'refund') {
      const idea = await db
        .prepare("SELECT raised_amount FROM ideas WHERE id = ?")
        .bind(investment.idea_id)
        .first<{ raised_amount: number }>();

      if (idea) {
        const newRaisedAmount = Math.max(0, (idea.raised_amount || 0) - investment.amount_usdc);
        await db
          .prepare("UPDATE ideas SET raised_amount = ? WHERE id = ?")
          .bind(newRaisedAmount, investment.idea_id)
          .run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        message: `Investment ${newStatus} successfully`,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      }
    );
  } catch (e) {
    await reportError(db, e);
    return new Response(JSON.stringify({ message: "Something went wrong..." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(request),
      },
    });
  }
}

function generateUUID() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}
