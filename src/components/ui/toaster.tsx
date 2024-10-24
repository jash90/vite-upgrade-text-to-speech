import { useToast } from './use-toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className={`mb-2 p-4 rounded-md shadow-md ${
            toast.variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'
          }`}
        >
          <h3 className="font-bold">{toast.title}</h3>
          {toast.description && <p>{toast.description}</p>}
        </div>
      ))}
    </div>
  )
}