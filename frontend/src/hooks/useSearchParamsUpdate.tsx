import { useSearchParams } from "react-router-dom"

export const useSearchParamsUpdate = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const getParam = (key: string) => {
    return searchParams.get(key) || null
  }
  const addParam = (key: string, value: string) => {
    searchParams.set(key, value)
    setSearchParams(searchParams)
  }
  const removeParam = (key: string) => {
    searchParams.delete(key)
    console.log(searchParams)
    setSearchParams(searchParams)
  }
  const removeParamIfNull = (key: string) => {
    const searchParamItem = searchParams.get(key)
    if (searchParamItem === "null") {
      removeParam(key)
      return true
    }
    console.log(`search param ${key} was 'null' so it was removed.`);
  }

  return {
    addParam,
    removeParam,
    getParam,
    removeParamIfNull,
  }
}
