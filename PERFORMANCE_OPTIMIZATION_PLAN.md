# Optimización de rendimiento para VerifySign

## Problema identificado
- Los archivos de video en `/public/videos/` tienen tamaños muy grandes (29-32MB cada uno)
- Estos videos se incluyen en la build estática y se descargan con la aplicación
- Esto aumenta significativamente el tamaño de la carga inicial y los tiempos de carga

## Soluciones recomendadas

### 1. Alojamiento externo de videos
Mover los videos grandes a un servicio de almacenamiento apropiado:

1. **Opción A (Recomendada)**: Subir los videos a Supabase Storage con políticas de lectura pública
2. **Opción B**: Usar un servicio CDN como Cloudflare Stream, Vimeo o YouTube para alojar los videos
3. **Opción C**: Usar un bucket S3 con CloudFront para delivery optimizado

### 2. Lazy loading de videos
Implementar lazy loading para los videos que no son críticos para la carga inicial:

```jsx
// Ejemplo de componente con lazy loading para video
const LazyVideo = ({ src, title, ...props }) => {
  return (
    <video
      src={src}
      title={title}
      controls
      loading="lazy"
      {...props}
    />
  );
};
```

### 3. Preload selectivo
Para videos que sí son críticos en ciertas páginas, usar estrategia de preload selectiva:

```html
<link rel="preload" as="video" href="URL_DEL_VIDEO" />
```

### 4. Compresión y formatos optimizados
- Convertir los videos a formatos más eficientes (WebM, H.265)
- Considerar diferentes resoluciones para diferentes dispositivos
- Implementar detección de calidad de conexión para servir videos apropiados

### 5. Estrategia de cache optimizada
Actualizar las cabeceras de cache para los assets estáticos en Vercel:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 6. Code splitting adicional
Considerar implementar code splitting para secciones menos usadas de la aplicación:

```jsx
const VideoPage = React.lazy(() => import('./pages/VideoPage'));
const FloatingVideoPlayer = React.lazy(() => import('./components/FloatingVideoPlayer'));

// En el router
<Route 
  path="/videos" 
  element={
    <Suspense fallback={<div>Loading...</div>}>
      <VideoPage />
    </Suspense>
  } 
/>
```

## Prioridad de implementación
1. **Alta**: Mover videos grandes a almacenamiento externo
2. **Media**: Implementar lazy loading y estrategias de preload
3. **Baja**: Optimización de formatos y cache headers

## Beneficios esperados
- Reducción significativa del tamaño de la build inicial
- Mejora en el tiempo de carga de la aplicación
- Mejor experiencia de usuario en conexiones lentas
- Reducción de costos de transferencia de datos