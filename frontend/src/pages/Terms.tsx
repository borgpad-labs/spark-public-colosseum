import { ScrollRestoration, useNavigate } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { Icon } from "@/components/Icon/Icon"
import { useLoginWithEmail } from '@privy-io/react-auth';
import { useState } from 'react';
import { ROUTES } from "@/utils/routes"
import Img from "@/components/Image/Img"
import logoType from "@/assets/logos/logo-resize.png"


const Terms = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState(false);

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

          <div className="flex flex-col gap-6 w-full max-w-[400px]">
            {[
              "I accept the risk associated with buying",
              "I will not promise others future returns",
              "I will not give others financial advice",
              "I am solely responsible for how I spend my money"
            ].map((text, index) => (
              <div key={index} className="flex items-center gap-3">
                <Icon icon="SvgCircledCheckmark" className="text-brand-primary" />
                <label className="text-sm font-medium">{text}</label>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="h-5 w-5 rounded border border-bd-primary bg-secondary"
              />
              <label className="text-sm font-medium">Agree to the terms and conditions</label>
            </div>
          </div>
        </div>


        <div className="flex flex-col items-center gap-4 w-full max-w-[400px]">
          <Button
            onClick={() => {
              navigate(ROUTES.PROJECTS)
            }}
            btnText="Continue"
            size="xl"
            className={twMerge(
              "mt-[2px] w-full px-7 py-4 text-lg font-medium leading-normal md:mt-[24px]",
              !terms && "opacity-50 cursor-not-allowed"
            )}
            textClassName="text-sm font-medium"
            disabled={!terms}
          />
        </div>
      </section>
      <ScrollRestoration />
    </main>
  )
}

export default Terms
