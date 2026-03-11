import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

const Modal = ({ isOpen, onClose, title, children }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto safe-area-top safe-area-bottom">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 py-4 sm:py-8">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50" 
          onClick={onClose}
          aria-label="Close modal"
        ></div>

        <div className={`relative z-10 inline-block w-full max-w-[95vw] sm:max-w-[800px] max-h-[95vh] sm:max-h-[85vh] bg-white rounded-lg sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all flex flex-col ${isMobile ? 'rounded-none' : ''}`}>
          <div className="bg-white px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 overflow-y-auto flex-1 scrollbar-thin">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-200 z-10">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-2 truncate">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 active:bg-gray-100 p-2 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
