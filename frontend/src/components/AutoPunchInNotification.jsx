import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const AutoPunchInNotification = ({ notification, onDismiss, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!isVisible || !notification) return null;

  const { type, message, time, matchScore, employeeName } = notification;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`fixed top-20 right-4 z-50 p-4 border rounded-lg shadow-lg ${getBgColor()} animate-slide-in max-w-md`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {type === 'success' ? 'Auto Punch-In Recorded' : 'Auto Punch-In Notice'}
          </h3>
          <p className="mt-1 text-sm text-gray-700">{message}</p>
          {employeeName && (
            <p className="mt-1 text-xs text-gray-600">Employee: {employeeName}</p>
          )}
          {matchScore !== undefined && (
            <p className="mt-1 text-xs text-gray-600">
              Match Score: {(matchScore * 100).toFixed(1)}%
            </p>
          )}
          {time && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(time).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            if (onDismiss) onDismiss();
          }}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AutoPunchInNotification;

