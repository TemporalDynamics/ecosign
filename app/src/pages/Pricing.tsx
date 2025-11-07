import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { supabase } from "../lib/supabase";
import { trackPurchase } from "../lib/analytics";
import { getActiveVariant } from "../config/copyVariants";
import SEO from "../components/SEO";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
  recommended?: boolean;
  stripePriceId?: string;
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    billingPeriod: "para siempre",
    features: [
      "5 certificados .ECO/mes",
      "Verificación ilimitada",
      "Dashboard básico",
      "Soporte comunitario",
      "Almacenamiento 30 días",
    ],
  },
  {
    id: "standard",
    name: "Estándar",
    price: 9,
    billingPeriod: "/mes",
    recommended: true,
    stripePriceId: "price_standard_monthly",
    features: [
      "50 certificados .ECO/mes",
      "Verificación ilimitada",
      "Dashboard avanzado con analíticas",
      "Firma de NDA ilimitada",
      "Soporte por email prioritario",
      "Almacenamiento 1 año",
      "API access básico",
      "Exportación de logs",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 29,
    billingPeriod: "/mes",
    stripePriceId: "price_premium_monthly",
    features: [
      "Certificados .ECO ilimitados",
      "Verificación ilimitada",
      "Dashboard empresarial completo",
      "Firma de NDA ilimitada",
      "Anclaje blockchain real (Polygon)",
      "Soporte 24/7 dedicado",
      "Almacenamiento ilimitado",
      "API access completo",
      "Whitelabel personalizado",
      "Integración con tu marca",
      "SLA garantizado 99.9%",
    ],
  },
];

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (plan.id === "free") {
      if (!user) {
        navigate("/app/login?redirect=dashboard");
      } else {
        navigate("/dashboard");
      }
      return;
    }

    if (!user) {
      navigate(`/app/login?redirect=pricing&plan=${plan.id}`);
      return;
    }

    setLoading(plan.id);

    try {
      const response = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userEmail: user.email,
          planId: plan.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        await trackPurchase(getActiveVariant(), plan.id);
        window.location.href = data.url;
      } else {
        throw new Error("No se pudo crear la sesión de checkout");
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Error al procesar el pago. Por favor, intenta nuevamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <SEO
        title="Precios y Planes | VerifySign"
        description="Elige el plan perfecto para tus necesidades de certificación digital. Desde certificados gratuitos hasta planes empresariales con blockchain real. Todos incluyen verificación ilimitada."
        canonical="https://verifysign.com/pricing"
      />
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-neutral-950 dark:to-blue-950 p-6">
        <div className="w-full max-w-7xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Planes y Precios
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades. Todos incluyen verificación
            ilimitada y soberanía total sobre tus datos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 relative ${
                plan.recommended
                  ? "border-2 border-blue-500 shadow-xl scale-105"
                  : "border border-neutral-200 dark:border-neutral-700"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Recomendado
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                    ${plan.price}
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {plan.billingPeriod}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-neutral-700 dark:text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.recommended ? "primary" : "outline"}
                onClick={() => handleSelectPlan(plan)}
                disabled={loading === plan.id}
                className="w-full"
              >
                {loading === plan.id
                  ? "Procesando..."
                  : plan.id === "free"
                  ? "Comenzar Gratis"
                  : `Suscribirse a ${plan.name}`}
              </Button>
            </Card>
          ))}
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-8 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                ¿Puedo cancelar en cualquier momento?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Sí, puedes cancelar tu suscripción en cualquier momento desde tu dashboard. No hay
                contratos ni penalizaciones.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                ¿Los certificados .ECO siguen siendo válidos si cancelo?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                ¡Absolutamente! Tus certificados .ECO son tu propiedad permanente. Siempre podrás
                verificarlos y usarlos, incluso si cancelas tu plan.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                ¿Qué métodos de pago aceptan?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Aceptamos todas las tarjetas de crédito y débito principales a través de Stripe.
                También puedes pagar con Google Pay y Apple Pay.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                ¿Ofrecen descuentos para organizaciones?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Sí, ofrecemos planes empresariales personalizados con descuentos por volumen.
                Contáctanos para obtener una cotización.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ¿Necesitas ayuda para elegir? <a href="/contact" className="text-blue-600 dark:text-blue-400 underline">Contáctanos</a>
          </p>
        </div>
      </div>
      </div>
    </>
  );
}

export default Pricing;
