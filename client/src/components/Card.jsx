import React from 'react';

function Card({ children, className = '', ...props }) {
  const classes = `card ${className}`.trim();
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export default Card;