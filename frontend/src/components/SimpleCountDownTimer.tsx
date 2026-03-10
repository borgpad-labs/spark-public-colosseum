import { isAfter } from "date-fns/isAfter"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { twMerge } from "tailwind-merge"

type CountDownTimerProps = {
  endOfEvent: Date
  labelAboveTimer: string
  className?: string
  timerClass?: string
  labelClass?: string
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

const calculateTimeLeft = (endOfEvent: Date) =>
  endOfEvent.getTime() - Date.now()

const SimpleCountDownTimer = ({
  endOfEvent,
  labelAboveTimer,
  className,
  timerClass,
  labelClass,
}: CountDownTimerProps) => {
  const { t } = useTranslation()
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endOfEvent))

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(endOfEvent))
  }, [endOfEvent])

  const isEventFinished = endOfEvent ? isAfter(new Date(), endOfEvent) : false
  useEffect(() => {
    if (isEventFinished) return
    const countdownInterval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endOfEvent))
    }, 1000)

    return () => {
      clearInterval(countdownInterval)
    }
  })
  const { days, hours, minutes, seconds } = getCountdownTime(timeLeft)

  return (
    <div
      className={twMerge(
        "flex h-[120px] w-full flex-col items-center rounded-t-xl pt-8",
        className,
      )}
    >
      <span className={twMerge("text-base font-light text-fg-primary/60", labelClass)}>{labelAboveTimer}</span>
      {isEventFinished ? (
        <span className="text-base text-fg-primary/60"> </span>
      ) : (
        <span className={twMerge("text-base normal-nums", timerClass)}>
          {`${days}d : ${hours}h : ${minutes}m : ${seconds}s`}
        </span>
      )}
    </div>
  );
}

export default SimpleCountDownTimer
