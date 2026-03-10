export const getStoredValue = (key: string) => {
  const storedValue = localStorage.getItem(key)
  if (!storedValue) return null
  return JSON.parse(storedValue)
}
