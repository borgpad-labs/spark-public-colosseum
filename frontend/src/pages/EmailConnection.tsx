import { ScrollRestoration, useNavigate } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { Icon } from "@/components/Icon/Icon"
import { useLoginWithEmail } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { ROUTES } from "@/utils/routes"


const EmailConnection = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const { loginWithCode, state } = useLoginWithEmail();
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      loginWithCode({ code });
    } catch (error) {
      setError((error as Error).message || 'An unknown error occurred');
    }
  };

  useEffect(() => {
    if (state.status === 'done') {
      navigate(ROUTES.USERNAME);
    }
  }, [state.status]);

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center bg-accent pt-[48px] font-normal text-fg-primary lg:pt-[72px]">
      <section className="z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px]">
        <div className="flex w-full flex-col items-center mt-[15vh]">
          <h1 className="text-[40px] font-medium leading-[48px] tracking-[-0.4px] md:text-[68px] md:leading-[74px] mb-4">
            <span className="text-brand-primary">Spark-it</span>
          </h1>

          <h2 className="text-xl md:text-2xl text-center mb-12 opacity-75">
            Make your idea become real
          </h2>

          <div className="w-full max-w-[400px] space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter the code sent to your email</label>
              <Input
                value={code}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 6) {
                    setCode(value.replace(/[^0-9]/g, ''));
                  }
                }}
                type="text"
                placeholder="123456"
                className="w-full"
                maxLength={6}
              />
              <div className="text-sm text-fg-error-primary text-opacity-75">
                <span>{error}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-[400px]">
          <Button
            onClick={handleLogin}
            btnText="Continue"
            size="xl"
            className={twMerge(
              "mt-[2px] w-full px-7 py-4 text-lg font-medium leading-normal md:mt-[24px] disabled:opacity-50",
            )}
            textClassName="text-sm font-medium"
            disabled={code === ''}
          />
        </div>
      </section>
      <ScrollRestoration />
    </main>
  )
}

export default EmailConnection
