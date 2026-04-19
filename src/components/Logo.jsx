import React from 'react';

const Logo = ({ className = '', style = {} }) => {
  return (
    <svg 
      viewBox="0 0 1000 350" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      style={style}
      width="100%"
      height="100%"
    >
      <defs>
        <style>
          {`
            .lnmiit-brand {
              font-family: 'Arial', 'Inter', sans-serif;
              fill: #005696;
            }
            .brand-title {
              font-size: 190px;
              font-weight: 900;
              letter-spacing: -2px;
            }
            .brand-subtitle {
              font-size: 52px;
              font-weight: 400;
              letter-spacing: 0.5px;
            }
            .brand-square {
              fill: #E86518;
            }
          `}
        </style>
      </defs>
      
      {/* Orange Squares (Top Row) */}
      <rect x="740" y="20" width="80" height="80" className="brand-square" />
      <rect x="830" y="20" width="80" height="80" className="brand-square" />
      <rect x="920" y="20" width="80" height="80" className="brand-square" />
      
      {/* Orange Squares (Middle Row) */}
      <rect x="830" y="110" width="80" height="80" className="brand-square" />
      <rect x="920" y="110" width="80" height="80" className="brand-square" />
      
      {/* Orange Square (Bottom Row) */}
      <rect x="920" y="200" width="80" height="80" className="brand-square" />
      
      {/* LNMIIT Text */}
      <text x="0" y="180" className="lnmiit-brand brand-title">LNMIIT</text>
      
      {/* Subtitle */}
      <text x="0" y="260" className="lnmiit-brand brand-subtitle">The LNM Institute of</text>
      <text x="0" y="325" className="lnmiit-brand brand-subtitle">Information Technology</text>
    </svg>
  );
};

export default Logo;
