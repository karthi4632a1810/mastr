import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4 sm:py-8">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative z-10 inline-block w-full max-w-[95vw] sm:max-w-[800px] bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
              } sm:mx-0 sm:h-10 sm:w-10`}>
                <AlertTriangle className={`h-6 w-6 ${
                  variant === 'danger' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button
                variant={variant}
                onClick={onConfirm}
                className="w-full sm:w-auto sm:ml-3"
              >
                {confirmText}
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                className="mt-3 sm:mt-0 w-full sm:w-auto"
              >
                {cancelText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
