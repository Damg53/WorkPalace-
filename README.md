<div align="center">

# WorkPalace

### Reserva de espacios especializados por horas en Medellín

> Proyecto en fase inicial: la plataforma está enfocada en conectar usuarios con espacios especializados disponibles por bloques de tiempo.

> Este repositorio incluye la versión actual del frontend y del backend para la gestión de reservas.

Estudios de grabación · Cocinas industriales · Talleres de carpintería · Estudios fotográficos

![Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Database](https://img.shields.io/badge/Database-Neon-00E599?style=for-the-badge&logo=neon&logoColor=white)
![ISO 25010](https://img.shields.io/badge/Calidad-ISO%2FIEC%2025010-2EA44F?style=for-the-badge)
![Medellín](https://img.shields.io/badge/Ciudad-Medell%C3%ADn-6366F1?style=for-the-badge)

[Descripción](#descripción) · [Problema](#problema) · [Solución](#solución) · [Cifras](#cifras-iniciales) · [Funcionalidades](#funcionalidades-clave) · [Calidad](#atributos-de-calidad) · [Equipo](#equipo)

</div>

---

## Descripción

Muchos profesionales independientes, emprendedores y creativos en Medellín requieren acceso a espacios especializados para desarrollar su actividad económica. Sin embargo, la inversión permanente en este tipo de infraestructura resulta inasumible para la mayoría de ellos, especialmente cuando el uso es esporádico u ocasional.

Paralelamente, la ciudad presenta un alto nivel de espacios especializados infrautilizados: instalaciones que permanecen ociosas durante buena parte del día o de la semana, lo que representa una pérdida de oportunidades económicas tanto para sus propietarios como para el ecosistema productivo local.

## Problema

| Pregunta | Respuesta |
|---|---|
| ¿Qué problema existe? | Acceso limitado a infraestructura costosa combinado con la existencia de espacios vacíos que generan pérdida de oportunidades económicas para propietarios y usuarios. |
| ¿A quién afecta? | Profesionales independientes, emprendedores, creativos y propietarios de espacios infrautilizados en Medellín. |

## Solución

**WorkPalace** conecta ambas puntas del mercado con un canal confiable, seguro y accesible:

```mermaid
flowchart LR
    A["Profesionales y creativos<br/>necesitan espacios por horas"] --> W(("WorkPalace"))
    B["Propietarios con<br/>espacios ociosos"] --> W
    W --> C["Reserva por bloques<br/>de horas"]
    W --> D["Ingresos para<br/>propietarios"]
    W --> E["Acceso flexible<br/>sin inversión fija"]
```

## Cifras iniciales

> **Demanda.** Estudios locales evidencian una demanda sostenida de espacios especializados por bloques de horas, en lugar de arrendamientos permanentes o de largo plazo.

> **Perfil del mercado.** La investigación de Karla Bibiana Mora Martínez (2015) reporta que aproximadamente el 22.3% de la población de trabajadores independientes analizada corresponde a hombres de alrededor de 45 años, lo que sugiere un segmento significativo de profesionales maduros que ejercen su actividad de forma autónoma y sin infraestructura propia permanente.

### Modelo de negocio

| Plan | Comisión por reserva | Ganancia estimada por reserva (usuario) |
|:---:|:---:|:---:|
| **Normal** | **15%** | $34.000 – $36.000 COP |
| **Pro** | **10%** | $34.000 – $36.000 COP |

Estas cifras dimensionan el volumen económico que actualmente no se está capturando por la falta de un canal formal de intermediación.

> **Ineficiencia de mercado.** Existe oferta de infraestructura ociosa y demanda insatisfecha de acceso flexible, pero no existe un mecanismo confiable, seguro y accesible que conecte ambas partes.

## Funcionalidades clave

| Icono | Funcionalidad |
|:---:|---|
| <img src="https://api.iconify.design/fa6-solid/clock.svg?color=%23f0f0f0" width="18" alt="Reloj" /> | **Reservas por bloques horarios** |
| <img src="https://api.iconify.design/fa6-solid/credit-card.svg?color=%23f0f0f0" width="18" alt="Tarjeta" /> | **Pagos en línea** |
| <img src="https://api.iconify.design/fa6-solid/id-card.svg?color=%23f0f0f0" width="18" alt="Identificación" /> | **Verificación de identidad** |
| <img src="https://api.iconify.design/fa6-solid/bolt.svg?color=%23f0f0f0" width="18" alt="Rayo" /> | **Disponibilidad en tiempo real** |
| <img src="https://api.iconify.design/fa6-solid/magnifying-glass.svg?color=%23f0f0f0" width="18" alt="Búsqueda" /> | **Filtros y búsqueda avanzada** |

## Atributos de calidad

Seleccionados bajo el estándar **ISO/IEC 25010**:

| Seguridad | Fiabilidad | Usabilidad | Eficiencia de desempeño |
|:---:|:---:|:---:|:---:|
| <img src="https://api.iconify.design/fa6-solid/lock.svg?color=%23f0f0f0" width="18" alt="Candado" /> | <img src="https://api.iconify.design/fa6-solid/circle-check.svg?color=%23f0f0f0" width="18" alt="Verificado" /> | <img src="https://api.iconify.design/fa6-solid/computer-mouse.svg?color=%23f0f0f0" width="18" alt="Usabilidad" /> | <img src="https://api.iconify.design/fa6-solid/chart-line.svg?color=%23f0f0f0" width="18" alt="Rendimiento" /> |

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Frontend | ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) |
| Despliegue del frontend | ![Vercel](https://img.shields.io/badge/-Vercel-000000?logo=vercel&logoColor=white) |
| Despliegue del backend | ![Render](https://img.shields.io/badge/-Render-46E3B7?logo=render&logoColor=white) |
| Base de datos | PostgreSQL en [Neon](https://neon.tech/) |

## Documentación de arquitectura

- ADR 001: Selección de Estilo Arquitectónico: [docs/adr/ADR-001-Seleccion-de-Estilo-Arquitectonico.md](docs/adr/ADR-001-Seleccion-de-Estilo-Arquitectonico.md)

## Inicio rápido

> Nota: para ejecutar el proyecto, se recomienda tener Node.js 18 o superior.

1. Clona este repositorio.
2. Instala las dependencias:

```bash
npm install
```

3. Configura tus variables de entorno en un archivo `.env`:

```env
DB_NAME=WorkPalace
```

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

5. Si deseas levantar el backend por separado:

```bash
npm run server
```

## Equipo

| Integrante |
|---|
| **Diego Alejandro Morales Gómez** |
| **Daniel Antonio Sarmiento Amador** |
| **Andree Kal-El Marín Hernández** |

## Referencias

- Mora Martínez, K. B. (2015). Investigación sobre trabajadores independientes.

---

<div align="center">
Proyecto integrador · Medellín, Colombia
</div>
