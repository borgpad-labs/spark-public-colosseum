import { Icon } from "../Icon/Icon"
import Img from "../Image/Img"
import Text from "@/components/Text"
import { Link } from "react-router-dom"

type UpcomingLbpCtaProps = {
  logoUrl: string
  projectName: string
  projectUrl: string
}

const UpcomingLbpCta = ({ logoUrl, projectName, projectUrl }: UpcomingLbpCtaProps) => {
  return (
    <section className="mt-10 flex w-full max-w-[400px] flex-col items-center gap-6">
      <h3 className="z-[1] px-4 text-center text-3xl font-semibold  leading-tight">Upcoming Launch Pool</h3>
      <Link to={projectUrl} className="w-full">
        <div className="relative w-full overflow-hidden rounded-[13px] bg-[#abff73]/25 p-[1px]">
          <div className="animated-conic-gradient absolute z-[-1] animate-rotate-border" />
          <div className="z-[10] flex h-[40px] items-center justify-between gap-2 rounded-xl bg-[#16231e] p-3">
            <div className="flex items-center gap-3">
              <Img src={logoUrl} size="6" isRounded />
              <Text text={projectName} isLoading={false} className="text-nowrap text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal">Get Whitelisted</span>
              <div className="w-[20px]">
                <Icon icon="SvgArrowRight" className="w-[20px] text-xl opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
export default UpcomingLbpCta
