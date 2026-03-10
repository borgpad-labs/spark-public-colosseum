import { useTranslation } from "react-i18next"

import { AvailableIcons, Icon } from "../Icon/Icon"
import { twMerge } from "tailwind-merge"

type BadgeProps = {
  label: string
  icon?: AvailableIcons
  className?: string
  iconClassName?: string
}

const BadgeRoot = ({ label, icon, className, iconClassName }: BadgeProps) => {
  return (
    <div
      className={twMerge(
        "flex items-center gap-2 rounded-full border-[1px] py-1 pl-[7px] pr-2 ",
        className,
      )}
    >
      {icon && (
        <Icon icon={icon} className={twMerge("text-[18px]", iconClassName)} />
      )}
      <span className="leading-normal">{label}</span>
    </div>
  )
}

type ConfirmationBadgeProps = {
  isConfirmed: boolean
  classNames?: string
  label?: string
}
const ConfirmationBadge = ({
  isConfirmed,
  classNames,
  label,
}: ConfirmationBadgeProps) => {
  const { t } = useTranslation()
  const renderLabel = () => {
    if (label) return label
    return isConfirmed ? t("tge.eligible") : t("tge.not_eligible")
  }

  return (
    <BadgeRoot
      icon={isConfirmed ? "SvgCircledCheckmark" : "SvgCircledX"}
      label={renderLabel()}
      className={twMerge(
        isConfirmed
          ? "border-bd-success-primary bg-success-primary text-fg-success-primary"
          : "border-error-secondary bg-error-primary text-fg-error-primary",
        classNames,
      )}
      iconClassName={isConfirmed ? "text-fg-success-secondary" : ""}
    />
  )
}

export const Badge = Object.assign(BadgeRoot, {
  Confirmation: ConfirmationBadge,
})
