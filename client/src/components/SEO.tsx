import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
}

const BASE_URL = 'https://ecosign.app';

export default function SEO({ title, description, path }: SEOProps) {
  const fullTitle = `${title} | EcoSign`;
  const url = path ? `${BASE_URL}${path}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
    </Helmet>
  );
}
