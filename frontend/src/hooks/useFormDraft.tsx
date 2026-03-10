import { useEffect } from "react"
import { UseFormSetValue } from "react-hook-form"

type FormMethods = {
  formValues: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  isSubmitted: boolean
}

export const useFormDraft = (
  formName: string,
  { formValues: _formValues, setValue, isSubmitted }: FormMethods,
  isEnabled: boolean = true,
  replaceItem?: { key: string; value: "" },
) => {
  useEffect(() => {
    if (isEnabled) {
      const formData = localStorage.getItem(formName)
      if (formData) {
        Object.entries(JSON.parse(formData)).forEach(([key, value]) => {
          setValue(key, value)
        })
      }
    }
  }, [formName, setValue, isEnabled])

  useEffect(() => {
    if (isEnabled) {
      const formValues = _formValues
      if (replaceItem?.key) {
        formValues[replaceItem.key] = replaceItem.value
      } // this will avoid saving certain keys inside localStorage (e.g. admin key)
      localStorage.setItem(formName, JSON.stringify(formValues))
      if (isSubmitted) {
        localStorage.removeItem(formName)
      }
    }
  }, [formName, _formValues, isSubmitted, isEnabled, replaceItem])
}
