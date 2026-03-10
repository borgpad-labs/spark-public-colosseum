import React from "react"
import { Button } from "../../Button/Button"
import { StatusIcon } from "./StatusIcon"
import { ProjectModel } from "shared/models"
import { useProjectStatusUtils } from "./useProjectStatusUtils"

interface ProjectReadinessChecklistProps {
  selectedProjectData: ProjectModel
  statusResults: Record<string, boolean | null>
  checkingStatus: Record<string, boolean>
  uploadedFiles: {
    collectionMetadata: boolean
    metadata: boolean
    image: boolean
  }
  runAllChecks: () => Promise<void>
  isWalletConnected: boolean
  createUsdcTokenAccount: () => Promise<void>
  updateNftConfig: () => void
  openMetadataModal: (type: 'collection' | 'nft' | 'image') => void
  createCollectionAddress: () => Promise<void>
  isCreatingCollection: boolean
  lastNftTxSignature: string | null
}

export const ProjectReadinessChecklist: React.FC<ProjectReadinessChecklistProps> = ({
  selectedProjectData,
  statusResults,
  checkingStatus,
  uploadedFiles,
  runAllChecks,
  isWalletConnected,
  createUsdcTokenAccount,
  updateNftConfig,
  openMetadataModal,
  createCollectionAddress,
  isCreatingCollection,
  lastNftTxSignature,
}) => {
  const { getFileBaseUrl } = useProjectStatusUtils()
  const baseUrl = getFileBaseUrl(selectedProjectData.id, selectedProjectData.config.cluster)

  return (
    <div className="w-full max-w-3xl bg-bg-secondary p-4 mb-4 rounded-lg border border-bd-secondary">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Project Readiness Checklist</h2>
        <Button
          btnText="Run Checks"
          size="sm"
          onClick={runAllChecks}
          disabled={!isWalletConnected}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={statusResults.lbpWalletSet} />
            <span>LBP Wallet Address Set</span>
          </div>
          {statusResults.lbpWalletSet === false && (
            <span className="text-sm text-red-400">Please set LBP wallet address in project config</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={statusResults.usdcTokenAccount} isLoading={checkingStatus.usdcTokenAccount} />
            <span>USDC Token Account Created</span>
          </div>
          {statusResults.usdcTokenAccount === false && statusResults.lbpWalletSet && (
            <Button
              btnText="Create USDC Account"
              size="sm"
              onClick={createUsdcTokenAccount}
              disabled={!isWalletConnected}
            />
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={statusResults.nftConfigSet} />
            <span>NFT Config Set</span>
          </div>
          {!statusResults.nftConfigSet && (
            <Button
              btnText="Create Nft Config"
              size="sm"
              onClick={updateNftConfig}
              disabled={!isWalletConnected}
            />
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={uploadedFiles.collectionMetadata} isLoading={checkingStatus.nftMetadataFiles} />
            <span>Collection Metadata JSON Available</span>
          </div>
          {!uploadedFiles.collectionMetadata ? (
            <div className="flex space-x-2 items-center">
              <div className="text-sm text-red-400">
                <a
                  href={`${baseUrl}collection-metadata.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Missing file
                </a>
              </div>
              <Button
                btnText="Upload Collection Metadata"
                size="sm"
                onClick={() => openMetadataModal('collection')}
                disabled={!isWalletConnected || !selectedProjectData.config.nftConfig}
              />
            </div>
          ) : (
            <div className="flex space-x-2 items-center">
              <Button
                btnText="View Files"
                size="sm"
                color="secondary"
                onClick={() => {
                  window.open(baseUrl + "collection-metadata.json", "_blank");
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={uploadedFiles.image} isLoading={checkingStatus.nftMetadataFiles} />
            <span>NFT Image Available</span>
          </div>
          {!uploadedFiles.image ? (
            <div className="flex space-x-2 items-center">
              <div className="text-sm text-red-400">
                <a
                  href={`${baseUrl}image.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Missing file
                </a>
              </div>
              <Button
                btnText="Upload Image"
                size="sm"
                onClick={() => openMetadataModal('image')}
                disabled={!isWalletConnected}
              />
            </div>
          ) : (
            <div className="flex items-center">
              <Button
                btnText="View Image"
                size="sm"
                color="secondary"
                onClick={() => {
                  window.open(baseUrl + "image.png", "_blank");
                }}
              />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={uploadedFiles.metadata} isLoading={checkingStatus.nftMetadataFiles} />
            <span>NFT Metadata JSON Available</span>
          </div>
          {!uploadedFiles.metadata ? (
            <div className="flex space-x-2 items-center">
              <div className="text-sm text-red-400">
                <a
                  href={`${baseUrl}metadata.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Missing file
                </a>
              </div>
              <Button
                btnText="Upload NFT Metadata"
                size="sm"
                onClick={() => openMetadataModal('nft')}
                disabled={!isWalletConnected || !selectedProjectData.config.nftConfig}
              />
            </div>
          ) : (
            <div className="flex items-center">
              <Button
                btnText="View Metadata"
                size="sm"
                color="secondary"
                onClick={() => {
                  window.open(baseUrl + "metadata.json", "_blank");
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={statusResults.nftCollectionMinted} />
            <span>NFT Collection Minted ?</span>
          </div>
          {statusResults.nftCollectionMinted === false && (
            <Button
              btnText={isCreatingCollection ? "Creating..." : "Create Collection"}
              size="sm"
              onClick={createCollectionAddress}
              disabled={!isWalletConnected || isCreatingCollection}
              isLoading={isCreatingCollection}
            />
          )}
          {statusResults.nftCollectionMinted === true && selectedProjectData?.config.nftConfig?.collection && (
            <div className="flex items-center space-x-3">
              <a
                href={`https://solscan.io/token/${selectedProjectData.config.nftConfig.collection}${selectedProjectData.config.cluster === "devnet" ? "?cluster=devnet" : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                View on Solscan
              </a>
              <Button
                btnText={isCreatingCollection ? "Creating..." : "Create New"}
                size="sm"
                onClick={createCollectionAddress}
                disabled={!isWalletConnected || isCreatingCollection}
                isLoading={isCreatingCollection}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <StatusIcon isValid={statusResults.tiersHaveStartDates} />
            <span>All Tiers Have Start Dates</span>
          </div>
          {statusResults.tiersHaveStartDates === false && (
            <span className="text-sm text-red-400">Please set startDate for all tiers</span>
          )}
        </div>

        {selectedProjectData.config.nftConfig?.collection && (
          <div className="mt-6 pt-4 border-t border-bd-secondary">
            <h3 className="text-lg font-medium mb-3">NFT Collection Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Collection Address:</span>
                <a
                  href={`https://solscan.io/token/${selectedProjectData.config.nftConfig.collection}${selectedProjectData.config.cluster === "devnet" ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all max-w-[350px]"
                >
                  {selectedProjectData.config.nftConfig.collection}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Network:</span>
                <span className="text-sm capitalize">{selectedProjectData.config.cluster || "mainnet"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Name:</span>
                <span className="text-sm font-medium">{selectedProjectData.config.nftConfig.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Symbol:</span>
                <span className="text-sm">{selectedProjectData.config.nftConfig.symbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Solscan:</span>
                <a
                  href={`https://solscan.io/token/${selectedProjectData.config.nftConfig.collection}${selectedProjectData.config.cluster === "devnet" ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View on Solscan
                </a>
              </div>
              {lastNftTxSignature && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last Transaction:</span>
                  <a
                    href={`https://solscan.io/tx/${lastNftTxSignature}${selectedProjectData.config.cluster === "devnet" ? "?cluster=devnet" : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {lastNftTxSignature.slice(0, 8)}...{lastNftTxSignature.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 