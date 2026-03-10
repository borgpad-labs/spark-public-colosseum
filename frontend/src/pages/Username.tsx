import { ScrollRestoration, useNavigate } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { useSolanaWallets, usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { ROUTES } from "@/utils/routes"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import Img from "@/components/Image/Img";
import logoType from "@/assets/logos/logo-resize.png"
import { getCorrectWalletAddress } from "@/utils/walletUtils"

const Username = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { wallets } = useSolanaWallets();
  const { user: privyUser } = usePrivy();
  
  // Get the correct wallet address
  const address = getCorrectWalletAddress(privyUser, wallets);

  console.log("=== Username Page Debug ===");
  console.log("Address being used:", address);
  console.log("Privy user:", privyUser);
  console.log("Available wallets:", wallets);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!username) {
      setError('Username is required');
    } else if (!address) {
      setError('No wallet address found');
    } else {
      setError('');
      try {
        console.log("Creating user with address:", address, "and username:", username);
        await backendSparkApi.postCreateUserStatus({
          address: address,
          username: username
        });
        navigate(ROUTES.TERMS)
      } catch (error) {
        console.error("Error creating user status:", error);
        setError('Username already taken');
      }
    }
  };

  const invalidUsername = !username.trim() || username.length < 3;

  useEffect(() => {
    if (attemptedSubmit) {
      if (invalidUsername) {
        setError('Username must be at least 3 characters long');
      } else {
        setError('');
      }
    }
  }, [username, attemptedSubmit]);


  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center bg-accent pt-[48px] font-normal text-fg-primary lg:pt-[72px]">
      <section className="z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px]">
        <div className="flex w-full flex-col items-center mt-[15vh]">
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

          <div className="w-full max-w-[400px] space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter a username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder="satoshi"
                className="w-full"
              />
              {error && <p className="text-sm text-fg-error-primary">{error}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-[400px]">
          <Button
            onClick={handleSubmit}
            btnText="Continue"
            size="xl"
            className={twMerge(
              "mt-[2px] w-full px-7 py-4 text-lg font-medium leading-normal md:mt-[24px]",
              !username || invalidUsername ? "opacity-50 cursor-not-allowed" : ""
            )}
            textClassName="text-sm font-medium"
            disabled={!username || invalidUsername}
          />
        </div>
      </section>
      <ScrollRestoration />
    </main>
  )
}

export default Username
