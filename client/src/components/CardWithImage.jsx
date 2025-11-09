import React from 'react';

function CardWithImage({ title, description, image, imagePosition = 'right', icon: Icon }) {
  return (
    <div className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-12 items-start`}>
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
        </div>
      </div>

      {/* Text Side */}
      <div className="w-full md:w-1/2 flex flex-col justify-start">
        {/* Title aligned to top edge */}
        <h4 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
          {title}
        </h4>

        {/* Description with larger text */}
        <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default CardWithImage;
