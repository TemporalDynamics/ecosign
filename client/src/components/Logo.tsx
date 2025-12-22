import { Link } from 'react-router-dom';

interface LogoProps {
  to: string;
  variant?: 'option-a' | 'option-b' | 'option-c';
}

/**
 * Logo component with three design variants:
 *
 * option-a: Clean E without background box (minimal)
 * option-b: Dominant box with stronger presence (app-like)
 * option-c: E as typographic first letter of EcoSign (system/protocol)
 */
const Logo = ({ to, variant = 'option-a' }: LogoProps) => {
  // OPTION A: Eliminar recuadro - E limpia sin fondo
  if (variant === 'option-a') {
    return (
      <Link to={to} className="flex items-center space-x-3">
        <img
          src="/assets/images/logo.png"
          alt="EcoSign Logo"
          className="h-9 w-auto"
          style={{
            mixBlendMode: 'darken',
            filter: 'brightness(0) saturate(100%) invert(17%) sepia(57%) saturate(2394%) hue-rotate(192deg) brightness(95%) contrast(98%)'
          }}
        />
        <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
      </Link>
    );
  }

  // OPTION B: Recuadro protagonista - más grande, color decidido
  if (variant === 'option-b') {
    return (
      <Link to={to} className="flex items-center space-x-3">
        <div className="bg-[#0E4B8B] rounded-lg p-2.5 flex items-center justify-center w-11 h-11">
          <img
            src="/assets/images/logo.png"
            alt="EcoSign Logo"
            className="h-7 w-auto brightness-0 invert"
          />
        </div>
        <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
      </Link>
    );
  }

  // OPTION C: E como letra inicial - integración tipográfica
  // La E del logo es parte de "EcoSign"
  if (variant === 'option-c') {
    return (
      <Link to={to} className="flex items-center">
        <div className="flex items-baseline -space-x-[2px]">
          {/* E del logo como primera letra */}
          <img
            src="/assets/images/logo.png"
            alt="E"
            className="h-[32px] w-auto translate-y-[5px]"
            style={{
              mixBlendMode: 'darken',
              filter: 'brightness(0) saturate(100%) invert(17%) sepia(57%) saturate(2394%) hue-rotate(192deg) brightness(95%) contrast(98%)'
            }}
          />
          {/* "coSign" - resto del texto */}
          <span className="text-2xl font-bold text-[#0E4B8B]">coSign</span>
        </div>
      </Link>
    );
  }

  return null;
};

export default Logo;
