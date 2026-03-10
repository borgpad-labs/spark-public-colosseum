import { drizzle } from "drizzle-orm/d1"
import { eq } from "drizzle-orm"
import { depositTable } from "../../shared/drizzle-schema"
import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { Connection, PublicKey } from "@solana/web3.js"

type ENV = {
  DB: D1Database
  SOLANA_RPC_URL: string
}

interface TokenTransfer {
    mint: string;
    toUserAccount: string;
    tokenAmount: number;
}

interface HeliusTransaction {
    timestamp: number;
    tokenTransfers?: Array<{
        fromTokenAccount: string;
        toTokenAccount: string;
        fromUserAccount: string;
        toUserAccount: string;
        tokenAmount: number;
        mint: string;
        tokenStandard: string;
    }>;
}

export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  try {
    // parse request
    const { searchParams } = new URL(ctx.request.url)
    const lbpWalletAddress = searchParams.get("lbpWalletAddress")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const cluster = searchParams.get("cluster")

    console.log("Request params:", { lbpWalletAddress, startDate, endDate, cluster })

    // validate request
    if (!lbpWalletAddress || !startDate || !endDate || !cluster) {
      console.log("Missing required params:", { 
        hasLbpWalletAddress: !!lbpWalletAddress,
        hasStartDate: !!startDate,
        hasEndDate: !!endDate,
        hasCluster: !!cluster
      })
      return jsonResponse({
        message: "Must provide lbpWalletAddress, startDate, endDate and cluster args!"
      }, 400)
    }

    // Get the appropriate connection based on cluster
    let rpcUrl: string;
    let heliusApiKey: string | null = null;

    if (ctx.env.SOLANA_RPC_URL) {
        // Extract the Helius API key if present
        const heliusApiKeyMatch = ctx.env.SOLANA_RPC_URL.match(/api-key=([^&]+)/);
        heliusApiKey = heliusApiKeyMatch ? heliusApiKeyMatch[1] : null;
        
        console.log("Helius API key found:", !!heliusApiKey)
        
        if (heliusApiKey) {
            // Format proper Helius URL based on cluster
            rpcUrl = cluster === "mainnet" 
                ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
                : `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
        } else {
            // Use provided URL as is
            rpcUrl = ctx.env.SOLANA_RPC_URL;
        }
    } else {
        // Fallback to default RPC endpoints
        rpcUrl = cluster === "mainnet" 
            ? "https://api.mainnet-beta.solana.com" 
            : "https://api.devnet.solana.com";
    }

    // console.log("Using RPC URL:", rpcUrl)

    const connection = new Connection(rpcUrl, "confirmed");

    const startDateDate = new Date(startDate)
    const endDateDate = new Date(endDate)

    console.log("Date range:", { 
      startDate: startDateDate.toISOString(),
      endDate: endDateDate.toISOString()
    })

    // USDC token address (mainnet)
    const USDC_TOKEN_ADDRESS = cluster === "mainnet" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

    // Get transactions using Helius API
    const heliusBaseUrl = cluster === "mainnet" 
        ? "https://api.helius.xyz/v0"
        : "https://api-devnet.helius.xyz/v0";

    console.log("Fetching transactions from Helius...")
    const response = await fetch(`${heliusBaseUrl}/addresses/${lbpWalletAddress}/transactions?api-key=${heliusApiKey}`);
    
    if (!response.ok) {
      console.error("Helius API error:", await response.text())
      throw new Error(`Helius API error: ${response.status}`)
    }
    
    const transactions = await response.json() as HeliusTransaction[];
    console.log("First transaction sample:", JSON.stringify(transactions[5], null, 2))

    // Filter transactions for USDC transfers received within date range
    const usdcTransfers = transactions.filter((tx) => {
        const txDate = new Date(tx.timestamp * 1000);
        const hasTransfer = tx.tokenTransfers?.some((transfer) => 
            transfer.mint === USDC_TOKEN_ADDRESS && 
            transfer.toUserAccount === lbpWalletAddress
        );
        return txDate >= startDateDate && 
               txDate <= endDateDate && 
               hasTransfer;
    });

    console.log("USDC transfers found:", usdcTransfers.length)

    // Calculate total USDC received
    const totalUsdcReceived = usdcTransfers.reduce((total, tx) => {
        const usdcTransfer = tx.tokenTransfers?.find((transfer) => 
            transfer.mint === USDC_TOKEN_ADDRESS && 
            transfer.toUserAccount === lbpWalletAddress
        );
        return total + (usdcTransfer?.tokenAmount || 0);
    }, 0);

    console.log("Total USDC received:", totalUsdcReceived)

    return jsonResponse({ 
        data: {
            totalUsdcReceived,
            transactionCount: usdcTransfers.length,
            transactions: usdcTransfers
        }
    }, {
        headers: {
            "Cache-Control": "public, max-age=15",
        }
    })
  } catch (e) {
    console.error("Error in getraisedamountonlbp:", e)
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
} 