import { useState, useEffect } from "react";
import { Button } from "./ui";

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Bienvenido a VerifySign",
    description: "Tu plataforma de certificación digital con soberanía de datos.",
    icon: "🎉",
  },
  {
    title: "Dos Formas de Usar VerifySign",
    description: "Modo Invitado: Genera certificados .ECO sin registro. Ideal para pruebas rápidas.\n\nCon Cuenta: Accede a dashboard completo, historial y funciones avanzadas.",
    icon: "👤",
  },
  {
    title: "Tu Documento, Tu Prueba",
    description: "Los certificados .ECO son tu propiedad. Funcionan independientemente de nuestra plataforma. Eso es soberanía digital real.",
    icon: "🔒",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("verifysign_onboarding_completed");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("verifysign_onboarding_completed", "true");
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{step.icon}</div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            {step.title}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-line leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-blue-600"
                  : "w-2 bg-neutral-300 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              Anterior
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            className={currentStep === 0 ? "w-full" : "flex-1"}
          >
            {currentStep === steps.length - 1 ? "Comenzar" : "Siguiente"}
          </Button>
        </div>

        <button
          onClick={handleSkip}
          className="w-full mt-4 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Saltar tutorial
        </button>
      </div>
    </div>
  );
}

export default Onboarding;
