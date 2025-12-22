# Guía: Cómo cambiar entre las variantes del logo

## Ver las tres opciones

1. Arrancá el servidor de desarrollo:
   ```bash
   cd client && npm run dev
   ```

2. Abrí en tu navegador:
   ```
   http://localhost:5173/logo-test
   ```

3. Vas a ver las tres variantes lado a lado:
   - **Opción A**: Sin recuadro (limpia)
   - **Opción B**: Recuadro dominante (fuerte)
   - **Opción C**: E como letra inicial (tipográfica)

## Cómo aplicar la variante elegida en el Header

Una vez que decidas cuál te gusta, seguí estos pasos:

### Paso 1: Editar `Header.tsx`

Abrí `/client/src/components/Header.tsx`

### Paso 2: Importar el componente Logo

Agregá en la parte superior del archivo:

```tsx
import Logo from './Logo';
```

### Paso 3: Reemplazar el logo actual

Buscá estas líneas (aprox. línea 139-142):

```tsx
<Link to={variant === 'public' ? '/' : '/inicio'} className="flex items-center space-x-3">
  <img src="/assets/images/logo.png" alt="EcoSign Logo" className="h-8 w-auto" />
  <span className="text-2xl font-bold text-[#0E4B8B]">EcoSign</span>
</Link>
```

Y reemplazalas por:

```tsx
<Logo
  to={variant === 'public' ? '/' : '/inicio'}
  variant="option-c"  // 👈 Cambiá esto por la opción que elijas
/>
```

### Paso 4: Elegir la variante

Cambiá el valor de `variant` según tu elección:

- `variant="option-a"` → Sin recuadro
- `variant="option-b"` → Recuadro dominante
- `variant="option-c"` → E como letra inicial (recomendada según el análisis)

## Ajustes finos para Opción C

Si elegís la Opción C y querés ajustar el kerning/spacing:

1. Abrí `/client/src/components/Logo.tsx`
2. Buscá la sección "OPTION C"
3. Ajustá estos valores según tu ojo:
   - `h-[32px]` → tamaño de la E
   - `translate-y-[5px]` → alineación vertical
   - `-space-x-[2px]` → spacing entre E y "coSign"

Ejemplo:

```tsx
<div className="flex items-baseline -space-x-[3px]">  {/* Ajustá este valor */}
  <img
    src="/assets/images/logo.png"
    alt="E"
    className="h-[34px] w-auto translate-y-[6px]"  {/* Ajustá estos valores */}
    style={{
      mixBlendMode: 'darken',
      filter: 'brightness(0) saturate(100%) invert(17%) sepia(57%) saturate(2394%) hue-rotate(192deg) brightness(95%) contrast(98%)'
    }}
  />
  <span className="text-2xl font-bold text-[#0E4B8B]">coSign</span>
</div>
```

## Tip final

La recomendación de Copilot sigue siendo válida:

> No las mires ahora. Dejá la página abierta, volvé en 2 horas,
> y la que te siga molestando se descarta sola.

Una vez que elijas, aplicá el cambio en el Header y listo. Si después querés volver a cambiar, solo modificás el `variant` en una línea.
