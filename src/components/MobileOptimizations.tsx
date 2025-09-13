import React, { useState, useEffect } from 'react';

// Hook to detect mobile device
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Mobile-optimized button component
interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = ''
}) => {
  const baseClasses = "font-medium rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variantClasses = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl",
    outline: "border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm min-h-[40px]", // Minimum touch target size
    md: "px-6 py-3 text-base min-h-[48px]",
    lg: "px-8 py-4 text-lg min-h-[56px]"
  };

  const widthClasses = fullWidth ? "w-full" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`}
    >
      {children}
    </button>
  );
};

// Touch-optimized input component
interface MobileInputProps {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-4 py-3 text-base
        border border-gray-300 dark:border-gray-600 
        rounded-lg
        bg-white dark:bg-gray-700 
        text-gray-900 dark:text-gray-100 
        placeholder-gray-500 dark:placeholder-gray-400
        focus:ring-2 focus:ring-purple-500 focus:border-purple-500
        disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[48px]
        ${className}
      `}
    />
  );
};

// Mobile-optimized textarea
interface MobileTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  className = ''
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`
        w-full px-4 py-3 text-base
        border border-gray-300 dark:border-gray-600 
        rounded-lg
        bg-white dark:bg-gray-700 
        text-gray-900 dark:text-gray-100 
        placeholder-gray-500 dark:placeholder-gray-400
        focus:ring-2 focus:ring-purple-500 focus:border-purple-500
        disabled:opacity-50 disabled:cursor-not-allowed
        resize-y
        min-h-[96px]
        ${className}
      `}
    />
  );
};

// Mobile-optimized select component
interface MobileSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = ''
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          appearance-none w-full px-4 py-3 pr-10 text-base
          border border-gray-300 dark:border-gray-600 
          rounded-lg
          bg-white dark:bg-gray-700 
          text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          min-h-[48px]
          ${className}
        `}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

// Pull-to-refresh component for mobile
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
      setIsPulling(distance > 60);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling) {
      await onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
          style={{ height: pullDistance, marginTop: -pullDistance }}
        >
          <div className={`transition-all duration-200 ${isPulling ? 'scale-110' : 'scale-100'}`}>
            {isPulling ? (
              <div className="text-purple-600">
                <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            ) : (
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0l-7 7m7-7v18" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = true
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';

  return (
    <div className={`
      bg-white dark:bg-gray-800 
      rounded-lg shadow-md 
      ${paddingClasses[padding]} 
      ${hoverClasses}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Skeleton loader for mobile
export const MobileSkeleton: React.FC<{ 
  lines?: number; 
  className?: string;
  avatar?: boolean;
}> = ({ 
  lines = 3, 
  className = '',
  avatar = false 
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2 ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};