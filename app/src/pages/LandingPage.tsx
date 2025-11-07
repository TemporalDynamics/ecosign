import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCopyVariant, getActiveVariant } from "../config/copyVariants";
import { trackPageView, trackCTAClick } from "../lib/analytics";
import { Button } from "../components/ui";
import SEO from "../components/SEO";

export function LandingPage() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState(getCopyVariant());
  const [variantId, setVariantId] = useState(getActiveVariant());

  useEffect(() => {
    const id = getActiveVariant();
    setVariantId(id);
    setVariant(getCopyVariant());
    trackPageView(id);
  }, []);

  const handlePrimaryCTA = async () => {
    await trackCTAClick(variantId, variant.hero.primaryCTA);
    navigate("/access");
  };

  const handleSecondaryCTA = async () => {
    await trackCTAClick(variantId, variant.hero.secondaryCTA);
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleValueCTA = async () => {
    await trackCTAClick(variantId, variant.value.cta);
    navigate("/access");
  };

  return (
    <>
      <SEO
        title={variant.hero.title + " | VerifySign"}
        description={variant.hero.subtitle}
        canonical="https://verifysign.com"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 leading-tight">
            {variant.hero.title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
            {variant.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={handlePrimaryCTA}
              className="px-8 py-3 text-lg"
            >
              {variant.hero.primaryCTA}
            </Button>
            <Button
              variant="outline"
              onClick={handleSecondaryCTA}
              className="px-8 py-3 text-lg"
            >
              {variant.hero.secondaryCTA}
            </Button>
          </div>
        </div>
      </div>

      {/* Value Section */}
      <div id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
            {variant.value.headline}
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 text-center">
            {variant.value.description}
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {variant.value.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700"
              >
                <span className="text-3xl flex-shrink-0">{feature.icon}</span>
                <p className="text-neutral-700 dark:text-neutral-300 text-lg">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="primary"
              onClick={handleValueCTA}
              className="px-8 py-3 text-lg"
            >
              {variant.value.cta}
            </Button>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="container mx-auto px-4 py-16 border-t border-neutral-200 dark:border-neutral-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Cifrado de nivel militar (AES-256)
              </p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">⛓️</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Anclaje en blockchain público
              </p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">🏛️</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Reconocido en procesos legales
              </p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">🌍</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Miles de certificados generados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debug indicator (remove in production) */}
      <div className="fixed bottom-4 right-4 bg-neutral-800 text-white px-3 py-1 rounded text-xs opacity-50">
        Variant: {variantId}
      </div>
      </div>
    </>
  );
}

export default LandingPage;
