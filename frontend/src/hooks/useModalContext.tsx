import { createContext, ReactNode, useContext, useState } from "react"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface ModalState {
  component: React.ComponentType<ModalProps> | null
  props?: Record<string, unknown>
}

interface ModalContextType {
  showModal: (component: React.ComponentType<ModalProps>, props?: Record<string, unknown>) => void
  hideModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) throw new Error("Component is outside of the <ModalProvider />")
  return context
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ component: null })

  const showModal = (component: React.ComponentType<ModalProps>, props?: Record<string, unknown>) => {
    setModal({ component, props })
  }

  const hideModal = () => {
    setModal({ component: null })
  }

  const ModalComponent = modal.component

  return (
    <ModalContext.Provider
      value={{
        showModal,
        hideModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}
