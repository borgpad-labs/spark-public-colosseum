import { useEffect } from "react"
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas-lite"

type Props = {
  filename: string
  inputName: string
  isActive: boolean
}

const STATE_MACHINE_NAME = "State Machine 1"

const RiveStakingCard = ({ filename, isActive, inputName }: Props) => {
  const { RiveComponent, rive } = useRive({
    src: `/animations/${filename}`,
    stateMachines: STATE_MACHINE_NAME,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
    autoplay: false,

    // line below solves issues on mobile swiping/scrolling.
    shouldDisableRiveListeners: true,
  })

  const animation = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    inputName, // name of the boolean type input that activates animation in Rive runtime
    !isActive,
  )

  useEffect(() => {
    if (rive && animation) {
      animation.value = isActive
      rive.play()
    }
  }, [isActive, rive, animation])

  return <RiveComponent />
}

export default RiveStakingCard
