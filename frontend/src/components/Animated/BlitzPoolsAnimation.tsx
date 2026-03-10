import React, { useEffect, useRef } from "react"

const BlitzPoolsAnimation = () => {
  const embedContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load the Unicorn Studio script
    const script = document.createElement("script")
    script.src = "https://pub-afd56fb014c94eac935a52c2d0d6a5e8.r2.dev/unicorn-animation/unicornStudio.umd.js"
    script.async = true

    script.onload = () => {
      // @ts-expect-error type error
      if (window.UnicornStudio && embedContainerRef.current) {
        // @ts-expect-error type error
        window.UnicornStudio.init()
          .then((scenes: unknown) => {
            // Scenes are ready
            console.log(scenes)
          })
          .catch((err: unknown) => {
            console.error(err)
          })
      }
    }

    document.body.appendChild(script)

    // Cleanup the script when the component unmounts
    return () => {
      document.body.removeChild(script)
    }
  }, [])
  return (
    <div
      ref={embedContainerRef}
      className="z-[101] mt-[100px] h-[642px] w-full opacity-50 md:mt-0"
      data-us-project-src="https://pub-afd56fb014c94eac935a52c2d0d6a5e8.r2.dev/unicorn-animation/blitz-animation.json"
      data-us-scale="1"
      data-us-dpi="1.5"
      data-us-lazyload="true"
      data-us-disableMobile="true"
      data-us-alttext="Unicorn Studio animation"
      data-us-arialabel="This is a canvas scene"
    ></div>
  )
}

export default BlitzPoolsAnimation
