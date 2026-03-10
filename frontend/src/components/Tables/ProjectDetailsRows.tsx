import { twMerge } from "tailwind-merge"
import { AvailableIcons, Icon } from "../Icon/Icon"
import { ExpandedProject } from "@/utils/projects-helper"

type DetailRow = {
    icon: AvailableIcons
    label: string
    value: string | number
    valueClassName?: string
}

export const createDetailRow = (
    icon: AvailableIcons,
    label: string,
    value: string | number,
    valueClassName?: string
): DetailRow => {
    return { icon, label, value, valueClassName }
}

export const ProjectDetailRows = ({
    project,
    rows
}: {
    project: ExpandedProject | null
    rows: DetailRow[]
}) => {
    if (!project) return null

    return (
        <>
            {rows.map((row, index) => (
                <div
                    key={`${row.icon}-${index}`}
                    className={twMerge(
                        "flex items-center justify-between p-2 rounded-lg",
                        index % 2 === 0 ? "bg-default" : "bg-secondary"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Icon icon={row.icon} className="text-fg-secondary"/>
                        <span className="text-fg-secondary">{row.label}</span>
                    </div>
                    <span className={twMerge("text-fg-secondary", row.valueClassName)}>
                        {row.value}
                    </span>
                </div>
            ))}
        </>
    )
}