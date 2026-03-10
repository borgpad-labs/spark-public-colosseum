import React from "react"
import { Link } from "react-router-dom"

const LiveSaleIsOver = () => {
  return (
    <div className="mb-10 flex w-full max-w-[400px] flex-col items-center gap-1 rounded-lg border border-bd-primary bg-secondary px-4 py-6 text-sm opacity-60">
      <span>{"Raise target has been reached. Live Sale is over."}</span>
      <Link to={"/launch-pools"}>
        <span className="underline">See Next Events</span>
      </Link>
    </div>
  )
}

export default LiveSaleIsOver
