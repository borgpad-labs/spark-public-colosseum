import { ScrollRestoration } from "react-router-dom"
import { useEffect, useState } from "react"

import solanaImg from "@/assets/angelStaking/solana.png"
import Img from "@/components/Image/Img"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { ROUTES } from "@/utils/routes"
import { useNavigate } from "react-router-dom"
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useQuery } from "@tanstack/react-query"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import logoType from "@/assets/logos/type-png-resized.png"
import { getCorrectWalletAddress } from "@/utils/walletUtils"


const GetStarted = () => {
  const navigate = useNavigate()
  const { login, ready, authenticated, logout, user: privyUser } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();
  const [address, setAddress] = useState<string | null>(localStorage.getItem('sparkit-wallet'))
  const [isCheckingUser, setIsCheckingUser] = useState(false)

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['user', address],
    queryFn: () => address ? backendSparkApi.getUser({ address }) : Promise.resolve(null),
    enabled: !!address, // Only run query if address exists
  });

  // Handle Privy authentication completion
  useEffect(() => {
    if (ready && authenticated && !address) {
      console.log("=== Privy Auth Completed ===");
      console.log("Ready:", ready);
      console.log("Authenticated:", authenticated);
      console.log("Current address state:", address);
      console.log("Privy user:", privyUser);
      console.log("Available wallets:", wallets);

      // The main connection flow will handle wallet detection and creation
      // No need for separate logic here
    }
  }, [ready, authenticated, wallets, privyUser, address]);

  // Main connection logic
  useEffect(() => {
    if (!ready) {
      return; // Wait until Privy is ready
    }

    const handleConnectionFlow = async () => {
      console.log("=== Connection Flow Debug ===");
      console.log("Ready:", ready);
      console.log("Authenticated:", authenticated);
      console.log("Privy user:", privyUser);
      console.log("Available wallets:", wallets);

      if (authenticated && privyUser) {
        // User is authenticated - get the CURRENT wallet address
        const currentWalletAddress = getCorrectWalletAddress(privyUser, wallets);

        console.log("Current wallet address:", currentWalletAddress);
        console.log("Address state:", address);

        if (currentWalletAddress) {
          // We have a proper wallet address
          const storedAddress = localStorage.getItem('sparkit-wallet');

          // Always update localStorage and state with current address
          if (storedAddress !== currentWalletAddress) {
            console.log("Updating stored address from", storedAddress, "to", currentWalletAddress);
            localStorage.setItem('sparkit-wallet', currentWalletAddress);
            setAddress(currentWalletAddress);
          }

          // Check if user exists in DB with the CURRENT wallet address
          setIsCheckingUser(true);
          try {
            console.log("Checking user in DB with address:", currentWalletAddress);
            const userData = await backendSparkApi.getUser({ address: currentWalletAddress });
            if (userData && userData.username) {
              // User exists in DB, connect them
              console.log("User found in DB, connecting:", userData);
              navigate(ROUTES.PROJECTS);
            } else {
              // User doesn't exist in DB, go to username page
              console.log("User not found in DB, going to username page");
              navigate(ROUTES.USERNAME);
            }
          } catch (error) {
            // User doesn't exist in DB, go to username page
            console.log("User not found in DB (error), going to username page:", error);
            navigate(ROUTES.USERNAME);
          }
          setIsCheckingUser(false);
        } else {
          // Authenticated but no proper wallet address found
          // This might happen for social logins where the embedded wallet is still being created
          console.log("Authenticated but no wallet address found - checking if we need to create one");

          // Check if user has Google/social login (means they need an embedded wallet)
          const hasGoogleAccount = privyUser.google;
          const hasTwitterAccount = privyUser.twitter;
          const hasAppleAccount = privyUser.apple;
          const isSocialLogin = hasGoogleAccount || hasTwitterAccount || hasAppleAccount;

          if (isSocialLogin) {
            console.log("Social login detected, creating embedded wallet...");
            try {
              const newWallet = await createWallet();
              console.log("Created embedded wallet:", newWallet.address);
              localStorage.setItem('sparkit-wallet', newWallet.address);
              setAddress(newWallet.address);
              navigate(ROUTES.USERNAME);
            } catch (error) {
              console.error("Failed to create wallet:", error);
            }
          } else {
            console.log("No social login detected, waiting for external wallet connection...");
            // Wait for external wallet to be properly connected and linked
          }
        }
      } else if (!authenticated) {
        // Check if there's a stored address from previous session (legacy)
        const storedAddress = localStorage.getItem('sparkit-wallet');

        if (storedAddress) {
          console.log("Legacy scenario: stored address but not authenticated:", storedAddress);
          setIsCheckingUser(true);
          try {
            const userData = await backendSparkApi.getUser({ address: storedAddress });
            if (userData && userData.username) {
              // User exists in DB, connect them
              console.log("User found in DB, connecting:", userData);
              navigate(ROUTES.PROJECTS);
            } else {
              // User doesn't exist in DB, go to username page
              console.log("User not found in DB, going to username page");
              navigate(ROUTES.USERNAME);
            }
          } catch (error) {
            // User doesn't exist in DB, go to username page
            console.log("User not found in DB, going to username page");
            navigate(ROUTES.USERNAME);
          }
          setIsCheckingUser(false);
        } else {
          console.log("Waiting for user to authenticate");
          // Wait for user to click "Get Started" button
        }
      } else {
        console.log("Waiting for user data to load...");
        // Wait for user data to be loaded
      }
    };

    handleConnectionFlow();
  }, [ready, authenticated, wallets, privyUser, navigate]);

  if (!ready || isCheckingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-fg-primary text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center bg-accent pt-[48px] font-normal text-fg-primary lg:pt-[72px]">
      <section className="z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px]">
        <div className="flex w-full flex-col items-center mt-[15vh]">
          <div className="flex gap-2 rounded-xl bg-overlay/75 px-3 py-2 backdrop-blur-sm mb-8">
            <span className="text-sm">Built on</span>
            <Img
              src={solanaImg}
              size="custom"
              customClass="w-[95px] rounded-none"
              imgClassName="object-contain"
              alt="Solana logo"
            />
          </div>

          {/* <h1 className="text-[40px] font-medium leading-[48px] tracking-[-0.4px] md:text-[68px] md:leading-[74px] mb-4">
            <span className="text-brand-primary">Spark-it</span>
          </h1> */}
          <Img
            src={logoType}
            size="custom"
            customClass="w-[300px] rounded-none mb-6"
            imgClassName="object-contain"
            alt="Spark-it logo"
          />

          <h2 className="text-xl md:text-2xl text-center mb-12 opacity-75">
            Make your idea become real
          </h2>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <Button
            onClick={() => {
              const storedAddress = localStorage.getItem('sparkit-wallet');
              if (!storedAddress) {
                // No address in localStorage, start Privy auth flow
                login();
              }
            }}
            btnText="Get Started"
            size="xl"
            className={twMerge(
              "mt-[2px] w-full px-7 py-4 text-lg font-medium leading-normal md:mt-[24px] md:w-auto",
            )}
            textClassName="text-sm font-medium"
          />
          <p className="text-sm text-center opacity-75 max-w-[400px]">
            By continuing, you agree to our Terms of Use and have read and agreed to our Privacy Policy.
          </p>
        </div>
      </section>
      <ScrollRestoration />
    </main>
  )
}

export default GetStarted
