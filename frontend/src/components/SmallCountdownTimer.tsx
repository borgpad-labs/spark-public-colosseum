import { formatDateForTimer } from "@/utils/date-helpers"
import { isAfter } from "date-fns/isAfter"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"

type SmallCountDownTimerProps = {
  countdownEventDate: Date
  labelDuringCountdown: string
}

type TUseTimer = {
  days: string
  hours: string
  minutes: string
  seconds: string
}

const DAYS_IN_MS = 1000 * 60 * 60 * 24
const HOURS_IN_MS = 1000 * 60 * 60
const MIN_IN_MS = 1000 * 60
const SEC_IN_MS = 1000

const formatNumber = (num: number) => {
  return num < 10 ? `0${num}` : `${num}`
}

const getCountdownTime = (timeLeft: number): TUseTimer => {
  const days = Math.floor(timeLeft / DAYS_IN_MS) // Give the remaining days
  timeLeft -= days * DAYS_IN_MS // Subtract passed days
  const hours = Math.floor(timeLeft / HOURS_IN_MS) // Give remaining hours
  timeLeft -= hours * HOURS_IN_MS // Subtract hours
  const minutes = Math.floor(timeLeft / MIN_IN_MS) // Give remaining minutes
  timeLeft -= minutes * MIN_IN_MS // Subtract minutes
  const seconds = Math.floor(timeLeft / SEC_IN_MS) // Give remaining seconds
  return {
    days: formatNumber(days),
    hours: formatNumber(hours),
    minutes: formatNumber(minutes),
    seconds: formatNumber(seconds),
  }
}

const calculateTimeLeft = (countdownEventDate: Date) => countdownEventDate.getTime() - Date.now()

const SmallCountDownTimer = ({ countdownEventDate, labelDuringCountdown }: SmallCountDownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(countdownEventDate))

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(countdownEventDate))
  }, [countdownEventDate])

  const isEventFinished = isAfter(new Date(), countdownEventDate)

  useEffect(() => {
    if (isEventFinished) return
    const timerId = setTimeout(() => {
      setTimeLeft((prev) => prev - 1000)
    }, 1000)

    return () => {
      clearTimeout(timerId)
    }
  })
  const { days, hours, minutes, seconds } = getCountdownTime(timeLeft)

  return (
    <div className={twMerge("flex w-full items-center gap-1 rounded-t-xl")}>
      {isEventFinished ? (
        <span className="truncate text-ellipsis text-sm opacity-50">{`Sale started on ${formatDateForTimer(countdownEventDate)}`}</span>
      ) : (
        <div className={twMerge("flex items-start text-sm normal-nums opacity-50")}>
          <span className={twMerge("text-nowrap pr-1 text-sm font-normal")}>{labelDuringCountdown}</span>
          <div className="flex w-[20px] flex-col items-center">
            <span className="font-medium">{days}</span>
          </div>
          <span className="">:</span>
          <div className="flex w-[20px] flex-col items-center">
            <span className="font-medium">{hours}</span>
          </div>
          <span className="">:</span>
          <div className="flex w-[20px] flex-col items-center">
            <span className="font-medium">{minutes}</span>
          </div>
          <span className="">:</span>
          <div className="flex w-[20px] flex-col items-center">
            <span className="font-medium">{seconds}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SmallCountDownTimer
