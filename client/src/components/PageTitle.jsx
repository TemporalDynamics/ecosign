export default function PageTitle({ children, subtitle }) {
  return (
    <header className="pt-4 mb-10 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
        {children}
      </h1>
      {subtitle && (
        <p className="mt-3 text-base md:text-lg text-neutral-600 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </header>
  );
}
