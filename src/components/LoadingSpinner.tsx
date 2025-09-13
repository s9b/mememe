import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  message,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-purple-600',
    secondary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
      <svg fill="none" viewBox="0 0 24 24" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-75"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {spinner}
      {message && (
        <p className={`mt-3 ${textSizeClasses[size]} text-gray-600 dark:text-gray-300 text-center`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// Specialized loading components for common use cases
export const MemeGenerationLoader: React.FC<{ message?: string }> = ({ 
  message = 'Generating your memes...' 
}) => (
  <LoadingSpinner
    size="lg"
    color="primary"
    message={message}
    className="py-12"
  />
);

export const PageLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <LoadingSpinner
    size="xl"
    color="primary"
    message={message}
    fullScreen
  />
);

export const ButtonLoader: React.FC = () => (
  <LoadingSpinner size="sm" color="white" />
);

export const InlineLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner size="sm" color="primary" />
    {message && <span className="text-sm text-gray-600 dark:text-gray-300">{message}</span>}
  </div>
);