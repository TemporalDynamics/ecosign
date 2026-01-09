# FIX: Título "Centro Legal" en Canvas

## Problema
Error de sintaxis al agregar título dentro del canvas. La estructura JSX no se cerró correctamente.

## Solución
El canvas prop necesita:
1. Abrir con: `canvas={`
2. JSX del contenido
3. Cerrar con: `}`

## Implementación Correcta

```tsx
<LegalCenterStage
  canvas={
    <div className="h-full w-full flex flex-col">
      {/* Título Centro Legal */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Centro Legal</h2>
        <button onClick={resetAndClose}>
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Contenido */}
      <div className="flex-1 px-6 py-3 overflow-y-auto">
        {/* TODO el contenido actual */}
      </div>
    </div>
  }
  leftOverlay={...}
/>
```

## Estado
El título "Centro Legal" ahora está dentro del canvas, se expande con los paneles y tiene el botón de cerrar integrado.
