import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../api-client.js";

export function registerTradeTools(server: McpServer) {
  // ── generate_swap ────────────────────────────────────────────
  server.tool(
    "generate_swap",
    "Generate a Jupiter swap transaction. Returns a base64-encoded transaction to be signed and executed. Does NOT execute the swap.",
    {
      inputMint: z.string().describe("Token mint address to swap FROM"),
      outputMint: z.string().describe("Token mint address to swap TO"),
      amount: z
        .string()
        .describe("Amount in smallest unit (e.g. lamports for SOL)"),
      userPublicKey: z.string().describe("User wallet public key"),
      slippageBps: z
        .number()
        .int()
        .default(50)
        .describe("Slippage tolerance in basis points (default: 50 = 0.5%)"),
      maxAccounts: z
        .number()
        .int()
        .default(64)
        .describe("Max accounts in transaction (default: 64)"),
      asLegacyTransaction: z
        .boolean()
        .default(false)
        .describe("Use legacy transaction format"),
      dynamicComputeUnitLimit: z
        .boolean()
        .default(true)
        .describe("Dynamically set compute unit limit"),
      prioritizationFeeLamports: z
        .number()
        .int()
        .default(0)
        .describe("Priority fee in lamports"),
    },
    async (args) => {
      const data = await apiPost("/api/generateswapinstruction", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── execute_swap ─────────────────────────────────────────────
  server.tool(
    "execute_swap",
    "Execute a previously generated swap transaction on-chain. WARNING: This sends a REAL transaction on Solana mainnet!",
    {
      swapTransaction: z
        .string()
        .describe(
          "Base64-encoded transaction from generate_swap",
        ),
      lastValidBlockHeight: z
        .number()
        .int()
        .optional()
        .describe("Block height for transaction validity"),
    },
    async (args) => {
      const data = await apiPost("/api/executeswaptransaction", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
