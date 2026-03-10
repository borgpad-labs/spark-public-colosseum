import React from "react"
import NavItem from "./NavItem"

const navItems = {
  "key-information": "Key Information",
  rewards: "Rewards",
  team: "Team",
  fundraising: "Fundraising",
  analysis: "Analysis",
  tokenomics: "Tokenomics",
}

const Navbar = () => {
  const renderNavItems = () => {
    return Object.entries(navItems).map(([id, label]) => {
      return <NavItem key={id} id={id} label={label} />
    })
  }

  return (
    <nav className="flex h-8 items-center gap-2 overflow-x-scroll text-fg-disabled lg:px-4">
      {renderNavItems()}
    </nav>
  )
}

export default Navbar
