const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') || 'https://ecosign.app';
const TEMPLATE_CACHE = new Map<string, string>();
const FALLBACK_TEMPLATES: Record<string, string> = {
  'firmante-otp.html': `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 12px 0; color: #111;">Hola {{display_name}}</h2>
      <p style="margin: 0 0 16px 0; color: #444;">
        Este es tu codigo de acceso para {{workflow_title}}.
      </p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; padding: 12px 16px; background: #f2f4f7; border-radius: 8px; display: inline-block;">
        {{otp_code}}
      </div>
      <p style="margin: 16px 0 0 0; color: #666; font-size: 12px;">
        Si no solicitaste este codigo, ignora este mensaje.
      </p>
    </div>
  `
};

function normalizeSiteUrl(siteUrl?: string | null) {
  const raw = siteUrl || DEFAULT_SITE_URL;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function injectDefaults(
  variables: Record<string, string | number | boolean | null | undefined>,
  siteUrl?: string | null
) {
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl);
  return {
    siteUrl: resolvedSiteUrl,
    ...variables,
  };
}

function renderTemplateString(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined>
) {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const safeValue = value === null || value === undefined ? '' : String(value);
    rendered = rendered.replaceAll(`{{${key}}}`, safeValue);
  }
  return rendered;
}

async function loadTemplate(templateName: string) {
  if (TEMPLATE_CACHE.has(templateName)) {
    return TEMPLATE_CACHE.get(templateName) as string;
  }
  const templateUrl = new URL(`./templates/${templateName}`, import.meta.url);
  try {
    const text = await Deno.readTextFile(templateUrl);
    TEMPLATE_CACHE.set(templateName, text);
    return text;
  } catch (error) {
    const fallback = FALLBACK_TEMPLATES[templateName];
    if (fallback) {
      console.warn(`Template ${templateName} not found. Using fallback.`, error);
      TEMPLATE_CACHE.set(templateName, fallback);
      return fallback;
    }
    throw error;
  }
}

export async function renderTemplateFromFile({
  templateName,
  variables,
  siteUrl,
}: {
  templateName: string;
  variables: Record<string, string | number | boolean | null | undefined>;
  siteUrl?: string | null;
}) {
  const template = await loadTemplate(templateName);
  const normalized = injectDefaults(variables, siteUrl);
  return renderTemplateString(template, normalized);
}

export function renderTemplate({
  template,
  variables,
  siteUrl,
}: {
  template: string;
  variables: Record<string, string | number | boolean | null | undefined>;
  siteUrl?: string | null;
}) {
  const normalized = injectDefaults(variables, siteUrl);
  return renderTemplateString(template, normalized);
}
