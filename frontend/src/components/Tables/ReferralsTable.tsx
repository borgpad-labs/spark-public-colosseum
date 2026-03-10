import { TableCell } from "./TableCell"
import { TableHeader } from "./TableHeader"
import Text from "@/components/Text"
import Img from "../Image/Img"

type ReferralData = {
  referrer_by: string;
  address: string;
  invested_dollar_value: number; // or string
}

type Props = {
  data?: ReferralData[]
  isLoading?: boolean
}

const ReferralsTable = ({ data = [], isLoading = false }: Props) => {
  return (
    <div className="w-full">
      <div className="w-full">
        <div className="min-h-[200px] md:h-[500px] overflow-y-auto">
          {!isLoading ? (
            <table className="w-full divide-y divide-bd-secondary/15">
              <thead className="sticky top-0 z-10">
                <tr className="max-h-[24px]">
                  <TableHeader className="px-2 w-[25%]">
                    <span className="w-full pl-2">User</span>
                  </TableHeader>
                  <TableHeader className="px-0.5 w-[25%]">
                    Connected
                  </TableHeader>
                  <TableHeader className="px-0.5 w-[25%]">
                    Invested
                  </TableHeader>
                  <TableHeader className="px-0.5 w-[25%]">
                    Tickets
                  </TableHeader>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3">
                    <div className="h-[1px] bg-bd-primary"></div>
                  </td>
                </tr>
              </thead>
              {data.length ? (
                <tbody className="divide-y divide-bd-secondary/5 pb-10">
                  {data.map((item) => (
                    <tr className="h-[36px] min-h-[36px] max-h-[36px]" key={item.address}>
                      <TableCell className="py-[2px]">
                        <div className="flex w-full flex-row items-center gap-1">
                          <div className="flex flex-col flex-nowrap items-start">
                            <span className="truncate text-xs font-semibold text-fg-primary px-2">
                              {item.address}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-[2px]">
                        <span className="text-xs text-fg-success-primary">Yes</span>
                      </TableCell>
                      <TableCell className="py-[2px]">
                        <span className="text-xs text-fg-primary">{item.invested_dollar_value}</span>
                      </TableCell>
                      <TableCell className="py-[2px]">
                        <span className="text-xs text-fg-primary">{item.invested_dollar_value}</span>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody>
                  <tr>
                    <td colSpan={4} className="py-8">
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-fg-secondary mb-2">
                          No one used your referral code yet.
                        </span>
                        <span className="text-fg-tertiary text-sm">
                          Share your code with friends to start earning rewards!
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          ) : (
            <TableSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}

export default ReferralsTable

const TableSkeleton = () => {
  return (
    <table className="min-h-[200px] w-full divide-y divide-bd-secondary/15">
      <thead className="sticky top-0 z-[2] bg-transparent">
        <tr className="max-h-[52px] bg-default">
          <TableHeader>
            <div className="w-[220px] pl-12">User</div>
          </TableHeader>
          <TableHeader>Connected</TableHeader>
          <TableHeader>Invested</TableHeader>
          <TableHeader>Tickets</TableHeader>
        </tr>
      </thead>
      <tbody className="divide-y divide-bd-secondary/5 pb-10">
        {[1, 2, 3, 4, 5].map((item) => (
          <tr className="h-[36px] min-h-[36px] max-h-[36px]" key={item}>
            <TableCell className="py-[2px]">
              <div className="flex w-[220px] flex-row items-center gap-2">
                <Img size="8" src={""} isFetchingLink isRounded />
                <div className="flex flex-col flex-nowrap items-start">
                  <Text isLoading className="w-[60px] opacity-50" />
                  <Text isLoading className="w-[60px] opacity-50" />
                </div>
              </div>
            </TableCell>
            <TableCell className="py-[2px]">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-[2px]">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-[2px]">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}