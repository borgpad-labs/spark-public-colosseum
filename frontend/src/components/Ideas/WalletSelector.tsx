import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { X } from 'lucide-react';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelected: (address: string) => void;
}

export function WalletSelector({ isOpen, onClose, onWalletSelected }: WalletSelectorProps) {
  const { wallets, wallet, select, connect, disconnect, connecting, connected, publicKey } = useWallet();
  const hasNotifiedRef = useRef(false);
  const [pendingWalletName, setPendingWalletName] = useState<WalletName | null>(null);

  const handleWalletSelect = async (walletName: WalletName) => {
    hasNotifiedRef.current = false;

    // If already connected to a different wallet, disconnect first
    if (connected) {
      await disconnect();
    }

    // Set the pending wallet name and select the wallet
    // The useEffect below will handle connecting once the wallet is ready
    setPendingWalletName(walletName);
    select(walletName);
  };

  // Watch for wallet selection and connect when the wallet adapter is ready
  useEffect(() => {
    const connectWallet = async () => {
      if (pendingWalletName && wallet && wallet.adapter.name === pendingWalletName && !connected && !connecting) {
        try {
          await connect();
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          setPendingWalletName(null);
        }
      }
    };

    connectWallet();
  }, [pendingWalletName, wallet, connected, connecting, connect]);

  // When wallet is connected after user explicitly selected one, notify parent
  useEffect(() => {
    if (connected && publicKey && isOpen && pendingWalletName && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      setPendingWalletName(null);
      onWalletSelected(publicKey.toString());
      onClose();
    }
  }, [connected, publicKey, isOpen, pendingWalletName, onWalletSelected, onClose]);

  // Reset flags when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasNotifiedRef.current = false;
      setPendingWalletName(null);
    }
  }, [isOpen]);

  // Don't render if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Select a Wallet</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {wallets.map((w) => (
            <button
              key={w.adapter.name}
              onClick={() => handleWalletSelect(w.adapter.name)}
              disabled={connecting || !w.adapter.readyState}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-neutral-800/50 border border-white/5 hover:border-white/10 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {w.adapter.icon && (
                <img
                  src={w.adapter.icon}
                  alt={w.adapter.name}
                  className="w-8 h-8"
                />
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">{w.adapter.name}</p>
                {!w.adapter.readyState && (
                  <p className="text-xs text-neutral-500">Not installed</p>
                )}
              </div>
              {connecting && pendingWalletName === w.adapter.name && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        {wallets.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-4">
            No wallets found. Please install a Solana wallet extension.
          </p>
        )}
      </div>
    </div>
  );
}
