import { Icon } from "@/components/Icon/Icon"

const TopContributor = () => {
  return (
    <div className="w-full rounded-lg bg-gradient-to-t from-brand-primary/50 to-brand-primary/15 p-[1px]">
      <div className=" relative flex items-center gap-4 rounded-[7px] bg-secondary bg-top-contributor bg-bottom bg-no-repeat object-cover px-4 py-3 ">
        <div className="absolute bottom-0 left-0 -z-[1] h-[83px] w-full "></div>
        <Icon icon="SvgTrophy" className="text-2xl text-brand-primary" />
        <div className="flex flex-col items-start">
          <span className="font-medium">{`You are a top ${10}% contributor`}</span>
          <span className="text-sm text-fg-tertiary">{`Contribute ${10000} BORG more go become top ${5}%`}</span>
        </div>
      </div>
    </div>
  )
}

export default TopContributor
