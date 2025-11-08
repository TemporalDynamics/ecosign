import React from 'react';

function Button({ children, variant = 'primary', size = 'medium', onClick, type = 'button', className = '', ...props }) {
  const baseClasses = 'button';
  const variantClasses = `button--${variant}`;
  const sizeClasses = `button--${size}`;
  
  const classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();

  return (
    <button 
      className={classes}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;