import { Link, useLocation } from "react-router-dom"
import { twMerge } from "tailwind-merge"

type Props = {
  id: string
  label: string
}

const NavItem = ({ id, label }: Props) => {
  const { hash } = useLocation()
  const activeId = hash.substring(1)
  return (
    <Link
      to={`#${id}`}
      className={twMerge(
        "flex h-full items-center transition-colors hover:text-fg-primary/70",
        activeId === id &&
          "border-b-[2px] border-fg-brand-primary text-fg-primary hover:text-fg-primary",
      )}
    >
      <span className="text-nowrap px-2 py-1">{label}</span>
    </Link>
  )
}

export default NavItem
