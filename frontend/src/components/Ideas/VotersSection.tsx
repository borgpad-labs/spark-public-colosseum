import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, DollarSign, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Voter {
  voter_username: string;
  voter_twitter_id?: string;
  voter_avatar?: string;
  voter_name?: string;
  vote_count?: number;
}

interface Investor {
  investor_wallet: string;
  total_invested: number;
  investment_count: number;
  last_investment_at: string;
}

interface VotersSectionProps {
  ideaId: string;
}

export function VotersSection({ ideaId }: VotersSectionProps) {
  const [upvoters, setUpvoters] = useState<Voter[]>([]);
  const [downvoters, setDownvoters] = useState<Voter[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVoters = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/idea-voters?ideaId=${ideaId}`);
        if (response.ok) {
          const data = await response.json();
          setUpvoters(data.upvoters || []);
          setDownvoters(data.downvoters || []);
          setInvestors(data.investors || []);
        }
      } catch (error) {
        console.error("Failed to fetch voters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (ideaId) {
      fetchVoters();
    }
  }, [ideaId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upvoters */}
      {upvoters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Upvoters</h4>
            <span className="text-[10px] text-neutral-600">({upvoters.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upvoters.slice(0, 10).map((voter, idx) => (
              <Link
                key={idx}
                to={`/profile/${voter.voter_username}`}
                className="group relative"
              >
                <img
                  src={voter.voter_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${voter.voter_username}`}
                  alt={voter.voter_username}
                  className="w-6 h-6 rounded-full border border-green-500/30 hover:border-green-500/60 transition-colors"
                  title={`@${voter.voter_username}`}
                />
              </Link>
            ))}
            {upvoters.length > 10 && (
              <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[8px] text-green-400 font-medium">
                +{upvoters.length - 10}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Downvoters */}
      {downvoters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ThumbsDown className="w-3.5 h-3.5 text-orange-400" />
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Downvoters</h4>
            <span className="text-[10px] text-neutral-600">({downvoters.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {downvoters.slice(0, 10).map((voter, idx) => (
              <Link
                key={idx}
                to={`/profile/${voter.voter_username}`}
                className="group relative"
              >
                <img
                  src={voter.voter_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${voter.voter_username}`}
                  alt={voter.voter_username}
                  className="w-6 h-6 rounded-full border border-orange-500/30 hover:border-orange-500/60 transition-colors"
                  title={`@${voter.voter_username}`}
                />
              </Link>
            ))}
            {downvoters.length > 10 && (
              <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[8px] text-orange-400 font-medium">
                +{downvoters.length - 10}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investors */}
      {investors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Investors</h4>
            <span className="text-[10px] text-neutral-600">({investors.length})</span>
          </div>
          <div className="space-y-2">
            {investors.slice(0, 5).map((investor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {investor.investor_wallet.slice(0, 4)}...{investor.investor_wallet.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400">
                  ${investor.total_invested.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            {investors.length > 5 && (
              <p className="text-[10px] text-neutral-500 text-center">
                +{investors.length - 5} more investors
              </p>
            )}
          </div>
        </div>
      )}

      {upvoters.length === 0 && downvoters.length === 0 && investors.length === 0 && (
        <p className="text-[10px] text-neutral-500 text-center py-2">No voters or investors yet</p>
      )}
    </div>
  );
}
