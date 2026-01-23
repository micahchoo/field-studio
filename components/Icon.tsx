import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
  // title prop for native tooltips
  title?: string;
}

// Update Icon component to accept and pass through the title prop for tooltips
export const Icon: React.FC<IconProps> = ({ name, className = "", onClick, title }) => {
  return (
    <span 
      className={`material-icons select-none ${className}`} 
      onClick={onClick}
      title={title}
      style={{ fontSize: 'inherit' }}
    >
      {name}
    </span>
  );
};