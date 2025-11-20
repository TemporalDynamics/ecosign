export default function PageTitle({ children, subtitle }) {
  return (
    <div className="text-center mt-24 mb-8">
      <h1 className="text-4xl font-bold text-black mb-4">
        {children}
      </h1>
      {subtitle && (
        <p className="text-lg text-gray-600 mt-4">
          {subtitle}
        </p>
      )}
    </div>
  );
}
