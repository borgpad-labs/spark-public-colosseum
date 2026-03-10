import { useTranslation } from "react-i18next"

import { ConnectButton } from "@/components/Header/ConnectButton"
import { useWalletContext } from "@/hooks/useWalletContext"
import { Button } from "@/components/Button/Button"

const SaleUnsuccessful = () => {
  const { t } = useTranslation()
  const { walletState } = useWalletContext()

  return (
    <div className="flex flex-col items-center gap-6">
      <span className="w-full max-w-[520px] whitespace-pre-line text-center text-sm opacity-60">
        {t("sale_over.sale_unsuccessful")}
      </span>
      {walletState !== "CONNECTED" ? (
        <ConnectButton
          size="md"
          color="secondary"
          isLoading={walletState === "CONNECTING"}
          customBtnText="Connect Wallet to Claim Your Contribution"
        />
      ) : (
        <Button
          size="lg"
          btnText="Claim Your Refund"
          onClick={() => console.log("click event - Claim Your Refund")}
        />
      )}
    </div>
  )
}

export default SaleUnsuccessful
