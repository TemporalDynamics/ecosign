# Guía de Contribución de Ecosign

¡Gracias por tu interés en contribuir a Ecosign! Agradecemos cualquier ayuda, desde la corrección de errores hasta la sugerencia de nuevas funcionalidades.

## ⚖️ Filosofía

Ecosign es un proyecto de código abierto con un núcleo propietario. Creemos en la transparencia y en el poder de la comunidad para construir software robusto y seguro. Al mismo tiempo, protegemos nuestra propiedad intelectual clave para asegurar la sostenibilidad y la visión a largo plazo del proyecto.

## ✍️ Proceso de Contribución

1.  **Busca o crea un *Issue*:** Antes de empezar a trabajar, por favor, busca si ya existe un *issue* relacionado con tu idea o problema. Si no es así, crea uno nuevo para discutir los cambios propuestos.
2.  **Haz un *Fork* del repositorio:** Crea una copia del repositorio en tu propia cuenta de GitHub.
3.  **Crea una rama:** Trabaja en una rama con un nombre descriptivo (ej. `feat/nueva-funcion` o `fix/bug-login`).
4.  **Envía un *Pull Request* (PR):** Una vez que tu trabajo esté listo, envía un PR a la rama `main` de este repositorio. Asegúrate de enlazar el *issue* que tu PR resuelve.

## 📄 La Documentación es Código

Un pilar fundamental de nuestro proyecto es mantener la documentación sincronizada con el código.

**Regla de Oro:** Todo Pull Request que modifique el comportamiento del código (añada una variable de entorno, cambie un endpoint de la API, modifique un script de build, etc.) **debe incluir** la actualización correspondiente en la documentación (`README.md`, `ARCHITECTURE.md`, etc.).

Los PRs que no cumplan este requisito no serán aprobados.

## 📦 Componente Propietario: `eco-packer`

El directorio `/eco-packer`, que contiene la lógica de negocio fundamental de Ecosign, es un componente de código cerrado y representa la **propiedad intelectual clave** del proyecto.

Por esta razón, su código fuente no está incluido en este repositorio público y se encuentra listado en el archivo `.gitignore`. No se aceptarán contribuciones ni se dará soporte sobre este componente a la comunidad externa. El resto del proyecto (cliente, infraestructura de Supabase, contratos, etc.) es completamente open-source.
