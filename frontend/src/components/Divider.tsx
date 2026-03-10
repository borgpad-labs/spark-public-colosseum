import React from "react"
import { AvailableIcons, Icon } from "./Icon/Icon"
import greenCloudImg from "@/assets/greenCloud.svg"

type DividerProps = {
  icon: AvailableIcons
}

const Divider = ({ icon }: DividerProps) => {
  return (
    <div className="relative flex w-full max-w-[400px] items-center">
      <img
        src={greenCloudImg}
        className="absolute h-[96px] w-full opacity-50"
      ></img>
      <div className="contribution-gradient h-[1px] flex-1 rotate-180"></div>
      <Icon icon={icon} className="mx-4 h-5 w-5 text-fg-brand-primary" />
      <div className="contribution-gradient h-[1px] flex-1"></div>
    </div>
  )
}

export default Divider
