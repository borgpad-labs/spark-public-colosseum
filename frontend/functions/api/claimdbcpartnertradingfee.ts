import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { isApiKeyValid } from '../services/apiKeyService';
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
}

interface ClaimPartnerTradingFeeRequest {
  pool: string // The pool address
  maxBaseAmount?: string // The maximum base amount to claim (optional, defaults to 0)
  maxQuoteAmount?: string // The maximum quote amount to claim (optional, defaults to 0)
  receiver?: string // The wallet that will receive the tokens (optional, defaults to feeClaimer)
  tempWSolAcc?: string // The temporary wallet that will receive the tokens (optional)
  network?: 'devnet' | 'mainnet' // Network to use (optional, defaults to mainnet)
}

/**
 * Claim partner trading fee from a DBC pool
 * 
 * This endpoint allows the feeClaimer (partner) of a pool to claim their trading fees.
 * The feeClaimer must be the same as the feeClaimer in the pool's config.
 * 
 * @example
 * // Claim all available fees
 * POST /api/claimDBCPartnerTradingFee
 * {
 *   "pool": "pool_address_here",
 *   "maxBaseAmount": "1000000000",
 *   "maxQuoteAmount": "1000000000"
 * }
 * 
 * // Claim only quote tokens
 * POST /api/claimDBCPartnerTradingFee
 * {
 *   "pool": "pool_address_here",
 *   "maxBaseAmount": "0",
 *   "maxQuoteAmount": "1000000000"
 * }
 * 
 * // Claim to a specific receiver
 * POST /api/claimDBCPartnerTradingFee
 * {
 *   "pool": "pool_address_here",
 *   "maxBaseAmount": "1000000000",
 *   "maxQuoteAmount": "1000000000",
 *   "receiver": "receiver_address_here"
 * }
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401);
    // }

    // Parse request body
    const body = await ctx.request.text();
    if (!body.trim()) {
      return jsonResponse({ 
        error: 'Request body is required',
        success: false 
      }, 400);
    }

    const requestData: ClaimPartnerTradingFeeRequest = JSON.parse(body);
    
    // Validate required parameters
    if (!requestData.pool) {
      return jsonResponse({ 
        error: 'Pool address is required',
        success: false 
      }, 400);
    }

    // Network selection
    const network = requestData.network || 'mainnet';
    const rpcUrl = getRpcUrlForCluster(ctx.env.RPC_URL, network);
    
    console.log(`Using ${network} network with RPC: ${rpcUrl}`);

    // Get private key and create wallet
    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const feeClaimerWallet = wallet.publicKey;

    // Parse addresses
    const poolAddress = new PublicKey(requestData.pool);
    const receiverAddress = requestData.receiver ? new PublicKey(requestData.receiver) : feeClaimerWallet;
    const tempWSolAcc = requestData.tempWSolAcc ? new PublicKey(requestData.tempWSolAcc) : null;

    // Parse amounts (default to 0 if not provided)
    const maxBaseAmount = new BN(requestData.maxBaseAmount || '0');
    const maxQuoteAmount = new BN(requestData.maxQuoteAmount || '0');

    // Validate amounts
    if (maxBaseAmount.isZero() && maxQuoteAmount.isZero()) {
      return jsonResponse({ 
        error: 'At least one of maxBaseAmount or maxQuoteAmount must be greater than 0',
        success: false 
      }, 400);
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Create claim transaction
    const claimTx = await client.partner.claimPartnerTradingFee({
      pool: poolAddress,
      feeClaimer: feeClaimerWallet,
      payer: feeClaimerWallet,
      maxBaseAmount: maxBaseAmount,
      maxQuoteAmount: maxQuoteAmount,
      receiver: receiverAddress,
    });

    console.log("Partner trading fee claim transaction created");
    
    // Set transaction blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    claimTx.feePayer = feeClaimerWallet;
    claimTx.recentBlockhash = blockhash;
    
    // Sign the transaction
    claimTx.sign(wallet);

    // Send transaction
    const txSignature = await connection.sendRawTransaction(claimTx.serialize(), { 
      skipPreflight: false, 
      preflightCommitment: 'confirmed' 
    });

    console.log("Partner trading fee claim tx signature:", txSignature);

    return jsonResponse({
      success: true,
      txSignature: txSignature,
      feeClaimer: feeClaimerWallet.toBase58(),
      pool: poolAddress.toBase58(),
      receiver: receiverAddress.toBase58(),
      maxBaseAmount: maxBaseAmount.toString(),
      maxQuoteAmount: maxQuoteAmount.toString(),
      network: network,
      rpcUrl: rpcUrl,
    }, 200);

  } catch (e) {
    console.error('Partner trading fee claim error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
} 