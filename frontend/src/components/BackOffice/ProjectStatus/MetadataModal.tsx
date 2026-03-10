import React from "react"
import { Button } from "../../Button/Button"
import { ProjectModel } from "shared/models"
import { useProjectStatusUtils } from "./useProjectStatusUtils"

interface MetadataModalProps {
  showMetadataModal: boolean
  selectedProjectData: ProjectModel | null
  modalType: 'collection' | 'nft' | 'image' | null
  fileInputRef: React.RefObject<HTMLInputElement>
  isWalletConnected: boolean
  setShowMetadataModal: (show: boolean) => void
  setModalType: (type: 'collection' | 'nft' | 'image' | null) => void
  uploadLocalImage: (file: File) => Promise<void>
  uploadCollectionMetadataJson: () => Promise<void>
  uploadNftMetadataJson: () => Promise<void>
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
  showMetadataModal,
  selectedProjectData,
  modalType,
  fileInputRef,
  isWalletConnected,
  setShowMetadataModal,
  setModalType,
  uploadLocalImage,
  uploadCollectionMetadataJson,
  uploadNftMetadataJson,
}) => {
  const { getFileBaseUrl } = useProjectStatusUtils()
  
  if (!showMetadataModal || !selectedProjectData || !modalType) return null

  const nftConfig = selectedProjectData.config.nftConfig
  const baseUrl = getFileBaseUrl(selectedProjectData.id, selectedProjectData.config.cluster)
  
  const collectionMetadataUrl = baseUrl + "collection-metadata.json"
  const nftMetadataUrl = baseUrl + "metadata.json"
  const imageUrl = baseUrl + "image.png"

  const closeModal = () => {
    setShowMetadataModal(false)
    setModalType(null)
  }

  // Properly type the uploadAction variable
  let content: React.ReactNode = null
  let uploadAction: (() => Promise<void>) | null = null
  let title = ''

  if (modalType === 'collection') {
    title = 'Collection Metadata JSON'
    uploadAction = uploadCollectionMetadataJson
    content = (
      <div>
        <div className="text-sm mb-4 bg-gray-800 p-3 rounded-md">
          <p className="mb-2 text-yellow-300">File will be uploaded to:</p>
          <code className="text-green-300 break-all">{collectionMetadataUrl}</code>
        </div>
        <div className="text-sm bg-gray-900 border border-gray-700 p-4 rounded-md font-mono overflow-x-auto whitespace-pre text-green-400">
          {`{
  "name": "${nftConfig?.name || 'Name not set'}",
  "symbol": "${nftConfig?.symbol || 'Symbol not set'}",
  "description": "${nftConfig?.description || 'Description not set'}",
  "image": "${nftConfig?.imageUrl || 'Image URL not set'}",
  "isCollection": true
}`}
        </div>
      </div>
    )
  } else if (modalType === 'nft') {
    title = 'NFT Metadata JSON'
    uploadAction = uploadNftMetadataJson
    content = (
      <div>
        <div className="text-sm mb-4 bg-gray-800 p-3 rounded-md">
          <p className="mb-2 text-yellow-300">File will be uploaded to:</p>
          <code className="text-green-300 break-all">{nftMetadataUrl}</code>
        </div>
        <div className="text-sm bg-gray-900 border border-gray-700 p-4 rounded-md font-mono overflow-x-auto whitespace-pre text-green-400">
          {`{
  "name": "${nftConfig?.name || 'Name not set'}",
  "symbol": "${nftConfig?.symbol || 'Symbol not set'}",
  "description": "${nftConfig?.description || 'Description not set'}",
  "image": "${nftConfig?.imageUrl || 'Image URL not set'}"
}`}
        </div>
      </div>
    )
  } else if (modalType === 'image') {
    title = 'NFT Image Upload'
    // We'll replace uploadAction with a file input handled in the modal
    uploadAction = null // We'll trigger the upload when file is selected
    content = (
      <div>
        <div className="text-sm mb-4 bg-gray-800 p-3 rounded-md">
          <p className="mb-2 text-yellow-300">Image will be uploaded to:</p>
          <code className="text-green-300 break-all">{imageUrl}</code>
        </div>
        <div className="text-sm bg-gray-900 border border-gray-700 p-4 rounded-md mb-4 text-white">
          <p className="mb-2">Select an image file from your computer to upload.</p>
          <p className="text-yellow-400 mb-4">Image will be uploaded as {'image.png'} regardless of original filename.</p>

          {!nftConfig && (
            <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700 rounded-md">
              <p className="text-blue-300 font-medium mb-1">NFT config will be auto-created with this template:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-blue-200">
                {`{
  "name": "${selectedProjectData.config.launchedTokenData.ticker || 'TOKEN'} Liquidity Provider",
  "symbol": "bp${selectedProjectData.config.launchedTokenData.ticker || 'TOKEN'}",
  "description": "You enabled ${selectedProjectData.info.title || 'Project'} to launch via BorgPad. This NFT is your proof, hold it to claim your rewards.",
  "imageUrl": "${imageUrl}",
  "collection": ""
}`}
              </pre>
            </div>
          )}

          {nftConfig?.imageUrl && (
            <div className="mt-4">
              <p className="text-sm mb-2">Current image URL:</p>
              <div className="break-all font-mono text-green-400">
                {nftConfig.imageUrl}
              </div>
            </div>
          )}
        </div>

        {nftConfig?.imageUrl && (
          <div className="flex justify-center mb-4 p-4 bg-gray-900 border border-gray-700 rounded-md">
            <img
              src={nftConfig.imageUrl}
              alt="Current NFT Preview"
              className="max-h-48 object-contain rounded shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              uploadLocalImage(file).then(() => {
                closeModal()
              })
            }
          }}
        />

        <div className="flex justify-center mt-4">
          <Button
            btnText={nftConfig ? "Select Image File" : "Select Image & Create NFT Config"}
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isWalletConnected}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black border border-bd-secondary p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            className="text-fg-secondary hover:text-white"
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        {content}

        <div className="flex justify-end mt-6 space-x-3">
          <Button
            btnText="Cancel"
            color="secondary"
            size="sm"
            onClick={closeModal}
          />
          {uploadAction && (
            <Button
              btnText={modalType === 'collection'
                ? 'Upload Collection Metadata'
                : modalType === 'nft'
                  ? 'Upload NFT Metadata'
                  : 'Upload Image'}
              size="sm"
              onClick={() => {
                uploadAction()
                closeModal()
              }}
              disabled={!isWalletConnected || !nftConfig}
            />
          )}
        </div>
      </div>
    </div>
  )
} 