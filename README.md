# Ecosign

Ecosign es una aplicación JAMStack para la certificación de documentos y firmas digitales con capacidades de anclaje en blockchain (Polygon y Bitcoin).

Este es un monorepo que contiene todos los paquetes y aplicaciones de Ecosign.

## 📜 Documentación Principal

Para entender la arquitectura completa, el flujo de datos, el modelo de seguridad y las decisiones de diseño, consulta el documento principal de arquitectura:

- **[📄 Arquitectura del Sistema Ecosign](./docs/ARCHITECTURE.md)**

## 📂 Estructura del Proyecto

El repositorio está organizado de la siguiente manera:

- **`/client`**: La aplicación principal de cara al usuario. Es una Single-Page Application (SPA) construida con React y Vite.
- **`/supabase`**: Contiene todo el backend de Supabase. Para instrucciones sobre el desarrollo local, consulta la **[Guía de Desarrollo del Backend](./supabase/README.md)**.
- **`/eco-packer`**: Una librería compartida que encapsula la lógica de negocio principal y la gestión de formatos de Ecosign.
- **`/contracts`**: Contratos inteligentes (Solidity) para el anclaje en la blockchain de Polygon.
- **`/docs`**: Documentación técnica, diagramas y decisiones de arquitectura.
- **`/scripts`**: Scripts de utilidad para tareas de mantenimiento, despliegue o pruebas.

## 🚀 Empezar a Desarrollar

Para levantar el entorno de desarrollo del frontend, dirígete al directorio `client` y sigue las instrucciones de su `README`.

- **[💻 Guía de Desarrollo del Cliente](./client/README.md)**

## 🤝 Contribuciones y Licencia

Este es un proyecto de código abierto bajo la Licencia MIT, con la excepción de ciertos componentes propietarios como se detalla en nuestra guía de contribución.

Invitamos a la comunidad a contribuir. Por favor, lee nuestra **[Guía de Contribución](./CONTRIBUTING.md)** para entender nuestro proceso de desarrollo y nuestras políticas sobre la documentación y el código propietario.
