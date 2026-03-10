import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { backendSparkApi, ApplicationResponse } from "@/data/api/backendSparkApi"
import { TableCell } from "../Tables/TableCell"
import { TableHeader } from "../Tables/TableHeader"
import { Button } from "../Button/Button"
import { Icon } from "../Icon/Icon"
import Text from "@/components/Text"

type SortField = 'githubUsername' | 'projectId' | 'deliverableName' | 'requestedPrice' | 'estimatedDeadline' | 'status' | 'createdAt'

const Applications = () => {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, refetch } = useQuery({
    queryFn: () => backendSparkApi.getAllApplications({ sortBy: sortField, sortDirection: sortDirection }),
    queryKey: ["getAllApplications", sortField, sortDirection],
    refetchOnWindowFocus: false,
  })

  const applications = data?.applications || []

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↓'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // If it's not a valid date, return the original string
      return dateString
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPrice = (price: number | null | undefined) => {
    // Handle null/undefined values
    if (price === null || price === undefined || isNaN(price)) {
      return "0"
    }

    // Check if the price seems to be in lamports (very large number > 1 million)
    // or if it's already in SOL (reasonable number)
    if (price > 1000000) {
      // Likely in lamports, convert to SOL
      return (price / 1000000000).toFixed(6)
    } else {
      // Already in SOL or a reasonable number
      return price.toString()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500'
      case 'approved':
        return 'text-green-500'
      case 'rejected':
        return 'text-red-500'
      default:
        return 'text-fg-secondary'
    }
  }

  return (
    <main className="z-[10] flex h-full w-full max-w-full flex-col items-center gap-10 py-[100px] font-normal text-fg-primary lg:py-[20px]">
      <div className="flex w-full max-w-6xl justify-between items-center">
        <h1 className="text-center text-2xl font-semibold mx-auto">Applications</h1>
        <Button
          btnText={isLoading ? "Refreshing..." : "Refresh"}
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="ml-4"
        />
      </div>

      <div className="relative w-full max-w-6xl flex flex-col rounded-lg bg-transparent">
        <div className="overflow-x-auto">
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {!isLoading ? (
              applications.length ? (
                <table className="w-full divide-y divide-bd-secondary/15">
                  <thead className="sticky top-0 z-[2] bg-accent">
                    <tr className="max-h-[52px] bg-default">
                      <TableHeader onClick={() => handleSort('githubUsername')}>
                        GitHub User {getSortIcon('githubUsername')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('projectId')}>
                        Project ID {getSortIcon('projectId')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('deliverableName')}>
                        Deliverable {getSortIcon('deliverableName')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('requestedPrice')}>
                        Price (SOL) {getSortIcon('requestedPrice')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('estimatedDeadline')}>
                        Deadline {getSortIcon('estimatedDeadline')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('status')}>
                        Status {getSortIcon('status')}
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('createdAt')}>
                        Created {getSortIcon('createdAt')}
                      </TableHeader>
                      <TableHeader className="hover:cursor-default hover:bg-default">
                        Actions
                      </TableHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bd-secondary/5 pb-10">
                    {applications.map((application: ApplicationResponse) => (
                      <tr className="h-[64px]" key={application.id}>
                        <TableCell className="py-0">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <span className="text-xs font-mono text-fg-secondary">@</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-fg-primary">
                                {application.githubUsername}
                              </span>
                              <span className="text-xs text-fg-secondary">
                                ID: {application.projectId && application.projectId.length > 12
                                  ? `${application.projectId.slice(0, 4)}...${application.projectId.slice(-4)}`
                                  : application.projectId}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-0">
                          <span className="text-xs text-fg-secondary font-mono">
                            {application.projectId && application.projectId.length > 12
                              ? `${application.projectId.slice(0, 4)}...${application.projectId.slice(-4)}`
                              : application.projectId}
                          </span>
                        </TableCell>
                        <TableCell className="py-0">
                          <div className="max-w-[200px]">
                            <span className="text-sm text-fg-primary truncate block">
                              {application.deliverableName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-0">
                          <span className="text-sm text-fg-primary font-medium">
                            {formatPrice(application.requestedPrice)} SOL
                          </span>
                        </TableCell>
                        <TableCell className="py-0">
                          <span className="text-sm text-fg-primary">
                            {formatDate(application.estimatedDeadline)}
                          </span>
                        </TableCell>
                        <TableCell className="py-0">
                          <span className={`text-sm font-medium capitalize ${getStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-0">
                          <span className="text-sm text-fg-secondary">
                            {formatDate(application.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="py-0">
                          <div className="flex gap-2">
                            <Button
                              btnText="View"
                              size="xs"
                              color="tertiary"
                              className="text-xs"
                              onClick={() => {
                                // TODO: Open a modal with full application details
                                console.log('View application:', application)
                              }}
                            />
                            <a
                              href={`https://github.com/${application.githubUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                btnText="GitHub"
                                size="xs"
                                color="secondary"
                                className="text-xs"
                                suffixElement={<Icon icon="SvgExternalLink" className="w-3 h-3" />}
                              />
                            </a>
                          </div>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon icon="SvgDocument" className="w-16 h-16 text-fg-secondary mb-4" />
                  <span className="text-lg text-fg-secondary">No applications found</span>
                  <span className="text-sm text-fg-tertiary">Applications will appear here once developers submit them</span>
                </div>
              )
            ) : (
              <TableSkeleton />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const TableSkeleton = () => {
  return (
    <table className="w-full divide-y divide-bd-secondary/15">
      <thead className="sticky top-0 z-[2] bg-accent">
        <tr className="max-h-[52px] bg-default">
          <TableHeader>GitHub User</TableHeader>
          <TableHeader>Project ID</TableHeader>
          <TableHeader>Deliverable</TableHeader>
          <TableHeader>Price (SOL)</TableHeader>
          <TableHeader>Deadline</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader>Actions</TableHeader>
        </tr>
      </thead>
      <tbody className="divide-y divide-bd-secondary/5 pb-10">
        {[1, 2, 3, 4, 5].map((item) => (
          <tr className="h-[64px]" key={item}>
            <TableCell className="py-0">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-fg-secondary/20 rounded animate-pulse" />
                <div className="flex flex-col gap-1">
                  <Text isLoading className="w-[100px] opacity-50" />
                  <Text isLoading className="w-[60px] opacity-50" />
                </div>
              </div>
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[150px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[60px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[60px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <div className="flex gap-2">
                <Text isLoading className="w-[40px] opacity-50" />
                <Text isLoading className="w-[50px] opacity-50" />
              </div>
            </TableCell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Applications 