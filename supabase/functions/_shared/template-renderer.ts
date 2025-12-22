const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') || 'https://ecosign.app';
const TEMPLATE_CACHE = new Map<string, string>();

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
  const text = await Deno.readTextFile(templateUrl);
  TEMPLATE_CACHE.set(templateName, text);
  return text;
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
