import { PropsWithChildren } from "react"

type Props = {
  title?: string
} & PropsWithChildren

const BoWrapper = ({ title = "", children }: Props) => {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-xl bg-gray-400/10 p-6 ring-[1px] ring-white/20">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {children}
    </div>
  )
}

export default BoWrapper
