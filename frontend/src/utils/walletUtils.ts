interface PrivyUser {
  linkedAccounts: Array<{
    type: string;
    address?: string;
  }>;
}

interface Wallet {
  address: string;
  walletClientType: string;
}

export const getCorrectWalletAddress = (privyUser: PrivyUser | null, wallets: Wallet[]): string | null => {
  // console.log("=== getCorrectWalletAddress Debug ===");
  // console.log("privyUser:", privyUser);
  // console.log("wallets:", wallets);
  
  if (!privyUser) {
    console.log("No privyUser, returning null");
    return null;
  }
  
  // For social logins, Privy creates embedded wallets
  // Check if user has an embedded wallet first
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  // console.log("embeddedWallet:", embeddedWallet);
  
  if (embeddedWallet) {
    // console.log("Found embedded wallet, returning:", embeddedWallet.address);
    return embeddedWallet.address;
  }
  
  // If no embedded wallet, check for linked external wallets
  // But prioritize wallets that are actually linked to this user
  const linkedWallet = wallets.find(wallet => 
    wallet.walletClientType !== 'privy' && 
    privyUser.linkedAccounts.some((account) => 
      account.type === 'wallet' && account.address === wallet.address
    )
  );
  
  // console.log("linkedWallet:", linkedWallet);
  
  if (linkedWallet) {
    // console.log("Found linked wallet, returning:", linkedWallet.address);
    return linkedWallet.address;
  }
  
  // DON'T fall back to external wallets that aren't linked to the user
  // This prevents using random browser wallets (like Phantom) for social logins
  // console.log("No embedded or properly linked wallet found, returning null");
  return null;
}; 