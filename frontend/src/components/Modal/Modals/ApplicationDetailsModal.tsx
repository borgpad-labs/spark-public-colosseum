import React from 'react';
import { ApplicationResponse } from '../../../data/api/backendSparkApi';
import Text from '../../Text';
import { Button } from '../../Button/Button';
import { Icon } from '../../Icon/Icon';

interface ApplicationDetailsModalProps {
  application: ApplicationResponse;
  isOpen: boolean;
  onClose: () => void;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({ 
  application, 
  isOpen, 
  onClose 
}) => {
  if (!isOpen) return null;

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price > 1000000) {
      // Likely in lamports, convert to SOL
      return `${(price / 1000000000).toFixed(6)} SOL`;
    } else {
      // Already in SOL or a reasonable number
      return `${price} SOL`;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-auto bg-black border border-fg-primary/10 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-fg-primary/10 sticky top-0 bg-black z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Icon icon="SvgDocument" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            <Text text="Developer Application Details" as="h2" className="text-lg sm:text-xl font-semibold text-fg-primary" />
          </div>
          <Button
            onClick={onClose}
            className="p-2 hover:bg-fg-primary/10 rounded-lg transition-colors"
          >
            <Icon icon="SvgClose" className="w-4 h-4 sm:w-5 sm:h-5 text-fg-primary" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Developer Info */}
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-bg-primary/5 rounded-lg border border-fg-primary/10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon icon="SvgWeb" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Text text={`@${application.githubUsername}`} as="h3" className="text-base sm:text-lg font-semibold text-fg-primary truncate" />
                <a
                  href={`https://github.com/${application.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-fg-primary/10 rounded transition-colors flex-shrink-0"
                >
                  <Icon icon="SvgExternalLink" className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                </a>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                  application.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                  application.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                  'bg-yellow-600/20 text-yellow-400'
                }`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
                {application.githubScore !== undefined && (
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium w-fit"
                    style={{
                      backgroundColor: (() => {
                        const score = application.githubScore || 0;
                        if (score >= 90) return 'rgba(34, 197, 94, 0.2)'; // green-600/20
                        if (score >= 80) return 'rgba(37, 99, 235, 0.2)'; // blue-600/20
                        if (score >= 70) return 'rgba(202, 138, 4, 0.2)'; // yellow-600/20
                        if (score >= 60) return 'rgba(234, 88, 12, 0.2)'; // orange-600/20
                        return 'rgba(220, 38, 38, 0.2)'; // red-600/20
                      })(),
                      color: (() => {
                        const score = application.githubScore || 0;
                        if (score >= 90) return '#4ade80'; // green-400
                        if (score >= 80) return '#60a5fa'; // blue-400
                        if (score >= 70) return '#facc15'; // yellow-400
                        if (score >= 60) return '#fb923c'; // orange-400
                        return '#f87171'; // red-400
                      })()
                    }}
                  >
                    Score: {application.githubScore}/100
                  </span>
                )}
                <span className="text-fg-secondary">
                  Applied on {formatDate(application.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Deliverable Details */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Text text="Deliverable" as="h3" className="text-xs sm:text-sm font-medium text-fg-secondary mb-1 sm:mb-2" />
              <Text text={application.deliverableName} as="p" className="text-base sm:text-lg font-semibold text-fg-primary" />
            </div>

            <div>
              <Text text="Feature Description" as="h3" className="text-xs sm:text-sm font-medium text-fg-secondary mb-1 sm:mb-2" />
              <div className="p-3 sm:p-4 bg-bg-primary/5 rounded-lg border border-fg-primary/10">
                <Text text={application.featureDescription} as="p" className="text-sm sm:text-base text-fg-primary leading-relaxed" />
              </div>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-bg-primary/5 rounded-lg border border-fg-primary/10">
                <Text text="Requested Price" as="h3" className="text-xs sm:text-sm font-medium text-fg-secondary mb-1" />
                <Text text={formatPrice(application.requestedPrice)} as="p" className="text-lg sm:text-xl font-bold text-green-400" />
              </div>

              <div className="p-3 sm:p-4 bg-bg-primary/5 rounded-lg border border-fg-primary/10">
                <Text text="Estimated Deadline" as="h3" className="text-xs sm:text-sm font-medium text-fg-secondary mb-1" />
                <Text text={application.estimatedDeadline} as="p" className="text-base sm:text-lg font-semibold text-yellow-400" />
              </div>
            </div>

            {/* GitHub Score - Prominent Display */}
            {application.githubScore !== undefined && (
              <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg border border-blue-600/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-fg-secondary mb-1">GitHub Trust Score</h3>
                    <p className="text-xs sm:text-sm text-fg-secondary">Developer credibility and track record</p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-2xl sm:text-3xl font-bold"
                      style={{
                        color: (() => {
                          const score = application.githubScore || 0;
                          if (score >= 90) return '#4ade80'; // green-400
                          if (score >= 80) return '#60a5fa'; // blue-400
                          if (score >= 70) return '#facc15'; // yellow-400
                          if (score >= 60) return '#fb923c'; // orange-400
                          return '#f87171'; // red-400
                        })()
                      }}
                    >
                      {application.githubScore}/100
                    </div>
                    <div 
                      className="text-xs sm:text-sm font-medium mt-1"
                      style={{
                        color: (() => {
                          const score = application.githubScore || 0;
                          if (score >= 90) return '#4ade80'; // green-400
                          if (score >= 80) return '#60a5fa'; // blue-400
                          if (score >= 70) return '#facc15'; // yellow-400
                          if (score >= 60) return '#fb923c'; // orange-400
                          return '#f87171'; // red-400
                        })()
                      }}
                    >
                      {(() => {
                        const score = application.githubScore || 0;
                        if (score >= 90) return 'Exceptional';
                        if (score >= 80) return 'Excellent';
                        if (score >= 70) return 'Good';
                        if (score >= 60) return 'Fair';
                        return 'Poor';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Address */}
            <div className="p-3 sm:p-4 bg-bg-primary/5 rounded-lg border border-fg-primary/10">
              <Text text="Solana Wallet Address" as="h3" className="text-xs sm:text-sm font-medium text-fg-secondary mb-1 sm:mb-2" />
              <div className="flex items-center gap-2">
                <code className="text-xs sm:text-sm font-mono text-fg-primary bg-bg-primary/20 px-2 py-1 rounded break-all">
                  {application.solanaWalletAddress}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(application.solanaWalletAddress);
                    // You could add a toast notification here
                  }}
                  className="p-1 hover:bg-fg-primary/10 rounded transition-colors flex-shrink-0"
                >
                  <Icon icon="SvgCopy" className="w-3 h-3 sm:w-4 sm:h-4 text-fg-secondary" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-fg-primary/10 sticky bottom-0 bg-black">
          <Button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailsModal; 