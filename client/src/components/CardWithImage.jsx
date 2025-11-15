import React from 'react';
import { Link } from 'react-router-dom';

function CardWithImage({ title, description, image, imagePosition = 'right', icon: Icon, linkTo, hoverLabel = 'Ver detalles' }) {
  const Wrapper = linkTo ? Link : 'div';
  const wrapperProps = linkTo ? { to: linkTo } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-12 items-start group ${linkTo ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-3xl' : ''}`}
    >
      {/* Image Side */}
      <div className="w-full md:w-1/2 flex-shrink-0">
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-auto object-cover"
            />
          ) : (
            // Placeholder if no image provided
            <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
              {Icon && <Icon className="w-24 h-24 text-cyan-600" strokeWidth={1.5} />}
            </div>
          )}

          {linkTo && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-cyan-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4">
              <span className="text-white text-sm font-semibold bg-cyan-600/80 px-3 py-1 rounded-full shadow-lg">
                {hoverLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Text Side */}
      <div className="w-full md:w-1/2 flex flex-col justify-start">
        {/* Title aligned to top edge */}
        <h4 className={`text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight ${linkTo ? 'group-hover:text-cyan-600 transition-colors duration-200' : ''}`}>
          {title}
        </h4>

        {/* Description with larger text */}
        {typeof description === 'string' ? (
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
            {description}
          </p>
        ) : (
          <div className="text-lg md:text-xl text-gray-700 leading-relaxed space-y-4">
            {description}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default CardWithImage;
