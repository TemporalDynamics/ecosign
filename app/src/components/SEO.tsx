import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
}

export function SEO({
  title = "VerifySign - Certificación Digital Forense con Blockchain",
  description = "VerifySign crea evidencia forense digital inmutable con certificados .ECO. Protege tus documentos con hash SHA-256, timestamp criptográfico y anclaje en blockchain.",
  keywords = "certificación digital, firma electrónica, blockchain, evidencia forense, NDA digital, timestamp, hash SHA-256, certificado .ECO",
  canonical,
  ogType = "website",
  ogImage = "/og-image.png",
}: SEOProps) {
  useEffect(() => {
    document.title = title;

    updateMetaTag("name", "description", description);
    updateMetaTag("name", "keywords", keywords);

    updateMetaTag("property", "og:title", title);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:type", ogType);
    updateMetaTag("property", "og:image", ogImage);

    updateMetaTag("name", "twitter:title", title);
    updateMetaTag("name", "twitter:description", description);
    updateMetaTag("name", "twitter:image", ogImage);

    if (canonical) {
      updateLinkTag("canonical", canonical);
    }
  }, [title, description, keywords, canonical, ogType, ogImage]);

  return null;
}

function updateMetaTag(attribute: string, attributeValue: string, content: string) {
  let element = document.querySelector(
    `meta[${attribute}="${attributeValue}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }

  element.content = content;
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.href = href;
}

export default SEO;
