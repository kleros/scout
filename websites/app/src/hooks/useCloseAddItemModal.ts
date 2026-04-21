import { useSearchParams } from 'react-router-dom'

export const useCloseAddItemModal = () => {
  const [, setSearchParams] = useSearchParams()

  return () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev.toString())
      next.delete('additem')
      return next
    })
  }
}
