import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

export const useCloseAddItemModal = () => {
  const [, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { registryName } = useParams<{ registryName: string }>()

  return () => {
    if (location.pathname.endsWith('/submit') && registryName) {
      navigate(`/${registryName}`)
      return
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev.toString())
      next.delete('additem')
      return next
    })
  }
}
