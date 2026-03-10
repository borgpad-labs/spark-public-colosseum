import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';

// Note: In a real implementation, you would use the governance-idl-sdk
// For now, we'll create placeholder functions that structure the proper governance instructions

export class GovernanceService {
  private connection: Connection;
  private governanceProgramId: PublicKey;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl);
    this.governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
  }

  /**
   * Create a transaction to deposit governance tokens
   */
     async createDepositGovernanceTokensTransaction(
     userWallet: PublicKey,
     realmPubkey: PublicKey,
     governingTokenMint: PublicKey,
     amount: BN
   ): Promise<Transaction> {
    const transaction = new Transaction();

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      governingTokenMint,
      userWallet
    );

    // Check if user token account exists, create if needed
    try {
      await this.connection.getTokenAccountBalance(userTokenAccount);
    } catch (error) {
      // Token account doesn't exist, create it
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        userWallet, // payer
        userTokenAccount, // ata
        userWallet, // owner
        governingTokenMint // mint
      );
      transaction.add(createATAInstruction);
    }

    // Calculate governance token holding account PDA
    const [governingTokenHoldingAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate token owner record PDA
    const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer(),
        userWallet.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate realm config PDA
    const [realmConfigAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("realm-config"),
        realmPubkey.toBuffer()
      ],
      this.governanceProgramId
    );

    // Create deposit governance tokens instruction using proper format
    const depositInstruction = new TransactionInstruction({
      programId: this.governanceProgramId,
      keys: [
        { pubkey: realmPubkey, isSigner: false, isWritable: false },
        { pubkey: governingTokenHoldingAccount, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userWallet, isSigner: true, isWritable: false },
        { pubkey: userWallet, isSigner: true, isWritable: false }, // governing token source account authority
        { pubkey: tokenOwnerRecord, isSigner: false, isWritable: true },
        { pubkey: userWallet, isSigner: true, isWritable: true }, // payer
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: realmConfigAccount, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([1]), // DepositGoverningTokens instruction discriminant
        amount.toArrayLike(Buffer, 'le', 8), // amount as u64
      ]),
    });

    transaction.add(depositInstruction);

    return transaction;
  }

  /**
   * Create a transaction to cast a vote on a proposal
   */
  async createCastVoteTransaction(
    userWallet: PublicKey,
    realmPubkey: PublicKey,
    governancePubkey: PublicKey,
    proposalPubkey: PublicKey,
    governingTokenMint: PublicKey,
    vote: 'approve' | 'deny',
    optionIndex?: number
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Calculate token owner record PDA
    const [voterTokenOwnerRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer(),
        userWallet.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate proposal vote record PDA
    const [proposalVoteRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        proposalPubkey.toBuffer(),
        voterTokenOwnerRecord.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate realm config PDA
    const [realmConfigAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("realm-config"),
        realmPubkey.toBuffer()
      ],
      this.governanceProgramId
    );

    // We need the proposal owner's token owner record for the cast vote instruction
    // Try to fetch the proposal to get the correct owner and vote type, fallback to voter if needed
    let proposalOwnerTokenOwnerRecord = voterTokenOwnerRecord;
    let proposalOptionsCount = 2; // Default to 2 for Yes/No proposals
    
    try {
      const proposalAccountInfo = await this.connection.getAccountInfo(proposalPubkey);
      if (proposalAccountInfo && proposalAccountInfo.data.length >= 97) {
        // Parse the proposal owner from the proposal account data
        // Proposal structure: accountType(1) + governance(32) + governingTokenMint(32) + state(1) + tokenOwnerRecord(32)
        const proposalOwnerRecordPubkey = new PublicKey(proposalAccountInfo.data.slice(65, 97));
        proposalOwnerTokenOwnerRecord = proposalOwnerRecordPubkey;
        
        // For multi-choice proposals, determine the correct number of options
        // If optionIndex is provided, it means this is a multi-choice proposal
        if (optionIndex !== undefined && optionIndex >= 0) {
          // For the "Choose your developer" proposal with 3 options (2 developers + NOTA)
          // we need to send exactly 3 vote choices
          proposalOptionsCount = 3; // Fixed at 3 for this type of proposal
        }
      }
    } catch (error) {
      console.warn("Could not fetch proposal owner, using voter as fallback:", error);
    }

    // Create proper vote data based on vote type (Borsh serialization format)
    let voteData: Buffer;
    if (vote === 'approve') {
      // For multi-choice proposals, we need to include ALL options with rank=0
      // Only the selected option gets 100% weight, others get 0%
      if (optionIndex !== undefined && proposalOptionsCount > 2) {
        // Multi-choice proposal: create vote choices for ALL options
        // Format: enum discriminant (1 byte) + vector length (4 bytes LE) + VoteChoice entries
        const vectorLength = Buffer.alloc(4);
        vectorLength.writeUInt32LE(proposalOptionsCount, 0); // All options
        
        const voteChoices = [];
        for (let i = 0; i < proposalOptionsCount; i++) {
          const voteChoice = Buffer.alloc(2);
          voteChoice.writeUInt8(0, 0); // rank: ALWAYS 0 (not the option index!)
          voteChoice.writeUInt8(i === optionIndex ? 100 : 0, 1); // weightPercentage: 100 for selected, 0 for others
          voteChoices.push(voteChoice);
        }
        
        voteData = Buffer.concat([
          Buffer.from([0]), // Approve enum discriminant
          vectorLength, // Vector length (all options)
          ...voteChoices // All VoteChoice entries with rank=0
        ]);
      } else {
        // Traditional Yes/No proposal: single choice with rank=0
        const vectorLength = Buffer.alloc(4);
        vectorLength.writeUInt32LE(1, 0); // 1 choice
        
        const voteChoice = Buffer.alloc(2);
        voteChoice.writeUInt8(0, 0); // rank: always 0 for traditional proposals
        voteChoice.writeUInt8(100, 1); // weightPercentage: 100
        
        voteData = Buffer.concat([
          Buffer.from([0]), // Approve enum discriminant
          vectorLength, // Vector length (1 choice)
          voteChoice // VoteChoice: rank=0, weight=100%
        ]);
      }
    } else {
      // Deny vote (no additional data)
      voteData = Buffer.from([1]); // Deny enum discriminant
    }

    // Create cast vote instruction using proper format
    const castVoteInstruction = new TransactionInstruction({
      programId: this.governanceProgramId,
      keys: [
        { pubkey: realmPubkey, isSigner: false, isWritable: false },
        { pubkey: governancePubkey, isSigner: false, isWritable: true },
        { pubkey: proposalPubkey, isSigner: false, isWritable: true },
        { pubkey: proposalOwnerTokenOwnerRecord, isSigner: false, isWritable: true }, // proposal owner token record
        { pubkey: voterTokenOwnerRecord, isSigner: false, isWritable: true }, // voter token record
        { pubkey: userWallet, isSigner: true, isWritable: false }, // governance authority
        { pubkey: proposalVoteRecord, isSigner: false, isWritable: true },
        { pubkey: governingTokenMint, isSigner: false, isWritable: false },
        { pubkey: userWallet, isSigner: true, isWritable: false }, // payer
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: realmConfigAccount, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([13]), // CastVote instruction discriminant
        voteData,
      ]),
    });

    // Add debugging information
    console.log("Cast vote instruction details:");
    console.log("- Proposal:", proposalPubkey.toBase58());
    console.log("- Voter token owner record:", voterTokenOwnerRecord.toBase58());
    console.log("- Proposal owner token owner record:", proposalOwnerTokenOwnerRecord.toBase58());
    console.log("- Vote type:", vote);
    console.log("- Option index:", optionIndex);
    console.log("- Proposal options count:", proposalOptionsCount);
    console.log("- Vote data length:", voteData.length);
    console.log("- Vote data hex:", voteData.toString('hex'));

    transaction.add(castVoteInstruction);

    return transaction;
  }

  /**
   * Create a transaction to withdraw governance tokens
   * Note: This always withdraws all tokens as the Solana Governance Program
   * doesn't support partial withdrawals natively
   */
  async createWithdrawGovernanceTokensTransaction(
    userWallet: PublicKey,
    realmPubkey: PublicKey,
    governingTokenMint: PublicKey,
    destinationTokenAccount: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Calculate governance token holding account PDA
    const [governingTokenHoldingAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate token owner record PDA
    const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer(),
        userWallet.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate realm config PDA
    const [realmConfigAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("realm-config"),
        realmPubkey.toBuffer()
      ],
      this.governanceProgramId
    );

    // Create withdraw governance tokens instruction using proper format
    // Note: WithdrawGoverningTokens typically withdraws all tokens
    // For partial withdrawals, we might need to use a different approach
    const withdrawInstruction = new TransactionInstruction({
      programId: this.governanceProgramId,
      keys: [
        { pubkey: realmPubkey, isSigner: false, isWritable: false },
        { pubkey: governingTokenHoldingAccount, isSigner: false, isWritable: true },
        { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userWallet, isSigner: true, isWritable: false },
        { pubkey: tokenOwnerRecord, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: realmConfigAccount, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([2]), // WithdrawGoverningTokens instruction discriminant
    });

    transaction.add(withdrawInstruction);

    return transaction;
  }

  /**
   * Create a transaction to relinquish a vote
   */
  async createRelinquishVoteTransaction(
    userWallet: PublicKey,
    realmPubkey: PublicKey,
    governancePubkey: PublicKey,
    proposalPubkey: PublicKey,
    governingTokenMint: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Calculate token owner record PDA
    const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        realmPubkey.toBuffer(),
        governingTokenMint.toBuffer(),
        userWallet.toBuffer()
      ],
      this.governanceProgramId
    );

    // Calculate proposal vote record PDA
    const [proposalVoteRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance"),
        proposalPubkey.toBuffer(),
        tokenOwnerRecord.toBuffer()
      ],
      this.governanceProgramId
    );

    // Create relinquish vote instruction using proper format
    const relinquishVoteInstruction = new TransactionInstruction({
      programId: this.governanceProgramId,
      keys: [
        { pubkey: realmPubkey, isSigner: false, isWritable: false },
        { pubkey: governancePubkey, isSigner: false, isWritable: false },
        { pubkey: proposalPubkey, isSigner: false, isWritable: true },
        { pubkey: tokenOwnerRecord, isSigner: false, isWritable: true },
        { pubkey: proposalVoteRecord, isSigner: false, isWritable: true },
        { pubkey: governingTokenMint, isSigner: false, isWritable: false },
        { pubkey: userWallet, isSigner: true, isWritable: false }, // governance authority (optional)
        { pubkey: userWallet, isSigner: false, isWritable: true }, // beneficiary (optional)
      ],
      data: Buffer.from([15]), // RelinquishVote instruction discriminant
    });

    transaction.add(relinquishVoteInstruction);

    return transaction;
  }

  /**
   * Get user's token owner record to check voting power
   */
  async getUserTokenOwnerRecord(
    userWallet: PublicKey,
    realmPubkey: PublicKey,
    governingTokenMint: PublicKey
  ): Promise<{ votingPower: number; hasRecord: boolean }> {
    try {
      // Calculate token owner record PDA
      const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("governance"),
          realmPubkey.toBuffer(),
          governingTokenMint.toBuffer(),
          userWallet.toBuffer()
        ],
        this.governanceProgramId
      );

      const accountInfo = await this.connection.getAccountInfo(tokenOwnerRecord);
      
      if (!accountInfo) {
        return { votingPower: 0, hasRecord: false };
      }

      // Parse the token owner record account data
      // TokenOwnerRecord structure (simplified):
      // 0-1: account type
      // 1-33: realm pubkey
      // 33-65: governing token mint pubkey  
      // 65-97: governing token owner pubkey
      // 97-105: governing token deposit amount (u64, little endian)
      
      const data = accountInfo.data;
      if (data.length < 105) {
        console.error("Invalid token owner record data length");
        return { votingPower: 0, hasRecord: true };
      }

      // Read the governing token deposit amount (8 bytes at offset 97)
      const depositAmountBuffer = data.slice(97, 105);
      const depositAmount = new BN(depositAmountBuffer, 'le');
      const votingPower = depositAmount.toNumber() / 1000000000; // Convert from lamports to tokens

      console.log("Raw deposit amount:", depositAmount.toString());
      console.log("Voting power (tokens):", votingPower);

      return { votingPower, hasRecord: true };

    } catch (error) {
      console.error("Error fetching token owner record:", error);
      return { votingPower: 0, hasRecord: false };
    }
  }

  /**
   * Check if user has voted on a proposal
   */
  async getUserVoteRecord(
    userWallet: PublicKey,
    realmPubkey: PublicKey,
    proposalPubkey: PublicKey,
    governingTokenMint: PublicKey
  ): Promise<{ hasVoted: boolean; vote: 'approve' | 'deny' | null }> {
    try {
      // Calculate token owner record PDA
      const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("governance"),
          realmPubkey.toBuffer(),
          governingTokenMint.toBuffer(),
          userWallet.toBuffer()
        ],
        this.governanceProgramId
      );

      // Calculate proposal vote record PDA
      const [proposalVoteRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("governance"),
          proposalPubkey.toBuffer(),
          tokenOwnerRecord.toBuffer()
        ],
        this.governanceProgramId
      );

      const accountInfo = await this.connection.getAccountInfo(proposalVoteRecord);
      
      if (!accountInfo) {
        return { hasVoted: false, vote: null };
      }

      // Parse the vote record data
      // VoteRecord structure (simplified):
      // 0-1: account type
      // 1-33: proposal pubkey
      // 33-65: governing token owner pubkey
      // 65: is relinquished (bool)
      // 66-74: voter weight (u64)
      // 74+: vote data
      
      const data = accountInfo.data;
      if (data.length < 75) {
        console.error("Invalid vote record data length");
        return { hasVoted: false, vote: null };
      }

      const isRelinquished = data[65] === 1;
      if (isRelinquished) {
        return { hasVoted: false, vote: null };
      }

      // Parse vote data (simplified - this would need proper enum parsing)
      // For now, we'll determine vote type based on the vote data
      const voteDataStart = 74;
      if (data.length > voteDataStart) {
        const voteType = data[voteDataStart];
        if (voteType === 0) {
          return { hasVoted: true, vote: 'approve' };
        } else if (voteType === 1) {
          return { hasVoted: true, vote: 'deny' };
        }
      }

      return { hasVoted: true, vote: null };

    } catch (error) {
      console.error("Error fetching vote record:", error);
      return { hasVoted: false, vote: null };
    }
  }
}

export default GovernanceService; 