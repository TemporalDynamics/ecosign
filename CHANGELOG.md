# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### 🔒 Seguridad
- Protección de código fuente de `eco-packer` (patente en trámite)
- Actualizado `.gitignore` para excluir archivos sensibles

---

## [0.1.0] - 2025-11-09

### ✨ Agregado
- Landing page profesional con diseño unificado
- Verificador público con UI completa
- Dashboard con modales de certificación
- Sistema de tooltips pedagógicos
- Integración de Lucide React (pictogramas profesionales)
- Documentación completa (README, ARCHITECTURE, PRE-RELEASE)
- CI/CD con GitHub Actions
- Estructura de Netlify Functions (base)

### 🎨 UI/UX
- Tema claro unificado (blanco + gradientes cyan/blue)
- Componentes reutilizables: CardWithImage, Tooltip, Button
- Responsive design completo
- Eliminación de emojis, reemplazo por iconos profesionales

### 📚 Documentación
- `PRE-RELEASE.md` - Estado del Developer Preview
- `QUICK-WINS-HOY.md` - Estrategia de lanzamiento
- `SECURITY.md` - Política de seguridad
- `CONTRIBUTING.md` - Guía de contribución

### 🔧 Infraestructura
- Netlify deployment configurado
- Supabase schema inicial (tablas `cases`, `signatures`)
- Variables de entorno documentadas en `.env.example`

---

## Formato de Commits

Usaremos commits descriptivos siguiendo este patrón:

```
tipo(scope): descripción corta

[cuerpo opcional con detalles]

[footer opcional con referencias]
```

**Tipos**:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `security`: Mejora de seguridad
- `docs`: Documentación
- `style`: Formato, sin cambios de código
- `refactor`: Refactorización de código
- `test`: Agregar/modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplo**:
```
security(verify): agregar validación de tipo y tamaño de archivo

- Validar extensiones permitidas (.eco, .ecox, .pdf, .zip)
- Limitar tamaño máximo a 50MB
- Validar MIME types básicos
- Mostrar errores claros al usuario

Relacionado: #12
```

---

## [Próximos Releases]

### v0.2.0 - Blindaje de Seguridad (Semana 1)
- [ ] Validación de entrada en uploads
- [ ] Rate limiting en Netlify Functions
- [ ] CSRF protection
- [ ] CSP headers completos
- [ ] Supabase Auth integrado

### v0.3.0 - Backend Funcional (Semana 2)
- [ ] Netlify Functions: `generate-link`, `verify-access`, `log-event`
- [ ] Integración real con eco-packer
- [ ] Supabase RLS policies completas
- [ ] Storage con URLs firmadas

### v0.4.0 - Diferenciadores (Semana 3-4)
- [ ] OpenTimestamps - Anclaje en Bitcoin
- [ ] Watermark dinámico en viewer
- [ ] Dashboard de accesos con export CSV/JSON
- [ ] Preparación para Mifiel/SignNow

---

**Última actualización**: 2025-11-09
