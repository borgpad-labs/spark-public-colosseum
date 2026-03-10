import { DaoProposalModel, DaoModel } from '../../shared/models';

/**
 * Check if a proposal is currently active (not expired)
 */
export function isProposalActive(proposal: DaoProposalModel, dao: DaoModel): boolean {
  const stateKey = typeof proposal.state === 'object' && proposal.state !== null
    ? Object.keys(proposal.state)[0]
    : proposal.state;
  
  // Check if proposal is in an active state
  const isStateActive = ['voting', 'signingOff', 'executing'].includes(stateKey);
  
  if (!isStateActive) return false;
  
  // For voting state, check if voting period has expired
  if (stateKey === 'voting') {
    const now = Date.now();
    const votingAt = proposal.votingAt ? parseInt(proposal.votingAt) * 1000 : null;
    
    if (votingAt) {
      // Get governance config for this proposal
      const governance = dao.governances?.find(gov => 
        gov.address === proposal.governance
      );
      
      if (governance) {
        const votingBaseTime = governance.config.votingBaseTime * 1000; // Convert to ms
        const votingCoolOffTime = governance.config.votingCoolOffTime * 1000; // Convert to ms
        const votingEndTime = votingAt + votingBaseTime + votingCoolOffTime;
        
        // If voting period has expired, proposal is not active
        if (now > votingEndTime) {
          console.log(`Proposal ${proposal.name} voting period expired`, {
            now: new Date(now),
            votingEndTime: new Date(votingEndTime),
            votingAt: new Date(votingAt),
            votingBaseTime: governance.config.votingBaseTime,
            votingCoolOffTime: governance.config.votingCoolOffTime
          });
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Check if voting is currently open for a proposal (in voting state and not expired)
 */
export function isVotingOpen(proposal: DaoProposalModel, dao: DaoModel): boolean {
  const stateKey = typeof proposal.state === 'object' && proposal.state !== null
    ? Object.keys(proposal.state)[0]
    : proposal.state;
  
  // Must be in voting state
  if (stateKey !== 'voting') return false;
  
  // Check if voting period has expired using the same logic as isProposalActive
  return isProposalActive(proposal, dao);
}

/**
 * Get the remaining time for a proposal's voting period in milliseconds
 */
export function getVotingTimeRemaining(proposal: DaoProposalModel, dao: DaoModel): number | null {
  const stateKey = typeof proposal.state === 'object' && proposal.state !== null
    ? Object.keys(proposal.state)[0]
    : proposal.state;
  
  if (stateKey !== 'voting') return null;
  
  const now = Date.now();
  const votingAt = proposal.votingAt ? parseInt(proposal.votingAt) * 1000 : null;
  
  if (!votingAt) return null;
  
  const governance = dao.governances?.find(gov => 
    gov.address === proposal.governance
  );
  
  if (!governance) return null;
  
  const votingBaseTime = governance.config.votingBaseTime * 1000; // Convert to ms
  const votingCoolOffTime = governance.config.votingCoolOffTime * 1000; // Convert to ms
  const votingEndTime = votingAt + votingBaseTime + votingCoolOffTime;
  
  const timeRemaining = votingEndTime - now;
  return Math.max(0, timeRemaining);
}

/**
 * Format remaining time in a human-readable way
 */
export function formatTimeRemaining(timeMs: number): string {
  if (timeMs <= 0) return "Expired";
  
  const days = Math.floor(timeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `${minutes}m remaining`;
  } else {
    return "Less than 1m remaining";
  }
}

/**
 * Check if a proposal is finished (completed, succeeded, defeated, etc.)
 * This includes both formally finalized proposals AND expired voting periods
 */
export function isProposalFinished(proposal: DaoProposalModel, dao?: DaoModel): boolean {
  const stateKey = typeof proposal.state === 'object' && proposal.state !== null
    ? Object.keys(proposal.state)[0]
    : proposal.state;
  
  // Check for terminal states first
  if (['succeeded', 'completed', 'defeated', 'cancelled', 'vetoed', 'expired', 'executingWithErrors'].includes(stateKey)) {
    return true;
  }
  
  // For proposals still in "voting" state, check if voting period has expired
  if (stateKey === 'voting' && dao && proposal.votingAt) {
    const now = Date.now();
    const votingAt = parseInt(proposal.votingAt) * 1000;
    
    const governance = dao.governances?.find(gov =>
      gov.address === proposal.governance
    );
    
    if (governance) {
      const votingBaseTime = governance.config.votingBaseTime * 1000;
      const votingCoolOffTime = governance.config.votingCoolOffTime * 1000;
      const votingEndTime = votingAt + votingBaseTime + votingCoolOffTime;
      
      // If voting period has expired, consider it finished even if not formally finalized
      if (now > votingEndTime) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get proposal result information including vote counts and outcome
 */
export function getProposalResult(proposal: DaoProposalModel) {
  const stateKey = typeof proposal.state === 'object' && proposal.state !== null
    ? Object.keys(proposal.state)[0]
    : proposal.state;

  // Calculate total votes
  const approveVotes = proposal.options.reduce((total, option) => {
    return total + (parseFloat(option.voteWeight) || 0);
  }, 0);
  
  const denyVotes = parseFloat(proposal.denyVoteWeight || "0");
  const abstainVotes = parseFloat(proposal.abstainVoteWeight || "0");
  const vetoVotes = parseFloat(proposal.vetoVoteWeight || "0");
  
  const totalVotes = approveVotes + denyVotes + abstainVotes + vetoVotes;
  
  // Determine outcome
  let outcome: 'passed' | 'failed' | 'cancelled' | 'vetoed' | 'expired' | 'error' | 'pending' = 'failed';
  let outcomeColor = 'bg-orange-500/20 text-orange-400';
  
  if (stateKey === 'succeeded' || stateKey === 'completed') {
    outcome = 'passed';
    outcomeColor = 'bg-green-500/20 text-green-400';
  } else if (stateKey === 'defeated') {
    outcome = 'failed';
    outcomeColor = 'bg-orange-500/20 text-orange-400';
  } else if (stateKey === 'cancelled') {
    outcome = 'cancelled';
    outcomeColor = 'bg-gray-500/20 text-gray-400';
  } else if (stateKey === 'vetoed') {
    outcome = 'vetoed';
    outcomeColor = 'bg-red-500/20 text-red-400';
  } else if (stateKey === 'expired') {
    outcome = 'expired';
    outcomeColor = 'bg-yellow-500/20 text-yellow-400';
  } else if (stateKey === 'executingWithErrors') {
    outcome = 'error';
    outcomeColor = 'bg-red-500/20 text-red-400';
  } else if (stateKey === 'voting') {
    // For voting state, determine if it's expired and what the likely outcome would be
    // If approval votes > denial votes, it would have passed
    if (approveVotes > denyVotes) {
      outcome = 'pending';
      outcomeColor = 'bg-blue-500/20 text-blue-400'; // Blue for "would pass but needs finalization"
    } else {
      outcome = 'pending';
      outcomeColor = 'bg-purple-500/20 text-purple-400'; // Purple for "would fail but needs finalization"
    }
  }

  // Calculate percentages (avoid division by zero)
  const approvePercentage = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;
  const denyPercentage = totalVotes > 0 ? (denyVotes / totalVotes) * 100 : 0;
  
  return {
    stateKey,
    outcome,
    outcomeColor,
    votes: {
      approve: approveVotes,
      deny: denyVotes,
      abstain: abstainVotes,
      veto: vetoVotes,
      total: totalVotes
    },
    percentages: {
      approve: approvePercentage,
      deny: denyPercentage,
      abstain: totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0,
      veto: totalVotes > 0 ? (vetoVotes / totalVotes) * 100 : 0
    },
    completedAt: proposal.votingCompletedAt || proposal.closedAt || proposal.executingAt
  };
}

/**
 * Format vote count in a readable way (e.g., 1.5M, 2.3K)
 */
export function formatVoteCount(voteCount: number): string {
  // Convert from lamports to tokens (assuming 9 decimals)
  const tokens = voteCount / 1000000000;
  
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else if (tokens >= 1) {
    return tokens.toFixed(1);
  } else {
    return tokens.toFixed(3);
  }
}

/**
 * Format date in a readable way
 */
export function formatProposalDate(timestamp: string | undefined): string {
  if (!timestamp) return "Unknown";
  
  const date = new Date(parseInt(timestamp) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
