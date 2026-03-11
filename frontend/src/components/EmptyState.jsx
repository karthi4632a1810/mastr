import { Inbox } from 'lucide-react'
import Button from './Button'

const EmptyState = ({ 
  icon: Icon = Inbox, 
  title = 'No data available', 
  message = 'There is no data to display at the moment.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  )
}

export default EmptyState
