# ADR 002: Estructura Interna del repositorio

**Estado:** Propuesto

**Decisión:** Organizar el repositorio de WorkPalace mediante una estructura modular por responsabilidades, alineada con la arquitectura de Monolito Modular seleccionada en el ADR-001.

## 1. Contexto relevante

WorkPalace es una plataforma que conecta a personas interesadas en utilizar espacios especializados con propietarios que desean ofrecer sus espacios disponibles. Para cumplir este objetivo, el sistema necesita gestionar funcionalidades como el registro de usuarios, la verificación de identidad, la publicación de espacios, las búsquedas, las reservas, la disponibilidad y los pagos.

Debido a que estas funcionalidades tienen responsabilidades diferentes, es necesario establecer una estructura interna que facilite la organización del código, el mantenimiento y la incorporación de nuevas funcionalidades.

En el ADR-001 se seleccionó el Monolito Modular como estilo arquitectónico inicial para WorkPalace. Por lo tanto, la organización del repositorio debe reflejar esta decisión, separando las funcionalidades en módulos y evitando dependencias innecesarias entre ellos.

Además, se busca mantener la lógica del negocio separada de los detalles tecnológicos, como la base de datos, los servicios externos y los mecanismos de comunicación con los usuarios.

## 2. Decisión tomada

Se propone mantener diferenciadas las responsabilidades del frontend y del backend, y organizar progresivamente la lógica de negocio del backend por módulos funcionales. Dentro de los módulos que lo requieran, el código podrá separarse en capas de dominio, aplicación e infraestructura.

**Estrategia de alojamiento del código: Monorepo.** El frontend y el backend se mantienen en un mismo repositorio, con una raíz y configuración de proyecto compartidas, en lugar de dividirlos en repositorios independientes (Multirepo). Se elige este enfoque porque WorkPalace parte de un Monolito Modular: permite coordinar y versionar conjuntamente cambios que afectan a ambas partes, reutilizar herramientas y simplificar el desarrollo y la integración mientras el equipo y el sistema se mantienen en esta etapa. La separación en `src/` y `server/` conserva sus responsabilidades diferenciadas sin requerir repositorios separados.

**Criterio de organización: por feature o dominio.** En el backend, cada módulo agrupa el código relacionado con una funcionalidad o dominio del negocio, como `users/`, `spaces/` o `reservations/`. Este criterio contrasta con una organización por capas técnicas globales, que reuniría en carpetas comunes todos los controladores, servicios o modelos de funcionalidades distintas y dispersaría el código de cada feature. Cuando sea pertinente, las capas de dominio, aplicación e infraestructura se organizarán dentro del módulo correspondiente, no como criterio global que sustituya la división por funcionalidades.

La propuesta no implica que estos módulos y capas ya estén implementados. La estructura actual del repositorio es:

```text
workpalace/
├── docs/
│   └── adr/
├── public/
├── server/
│   ├── db.js
│   ├── schema.sql
│   ├── server.js
│   ├── swagger.js
│   └── test-*.js
├── src/
│   ├── assets/
│   ├── components/
│   ├── img/
│   ├── services/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── README.md
```

El backend ya integra Swagger UI mediante `server/swagger.js` y `server/server.js`; la documentación interactiva está disponible en `/api-docs` y la especificación OpenAPI en `/api-docs.json`. Las pruebas del backend también están actualmente dentro de `server/`.

Como objetivo de evolución, se propone organizar las funcionalidades del backend de esta forma:

```text
server/
├── modules/
│   ├── users/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── verification/
│   ├── spaces/
│   ├── search/
│   ├── reservations/
│   ├── availability/
│   └── payments/
├── tests/
├── db.js
├── schema.sql
├── server.js
└── swagger.js
```

La estructura objetivo es conceptual y deberá ajustarse gradualmente a los archivos, herramientas y convenciones del repositorio. No requiere mover archivos ni crear capas que todavía no aporten una responsabilidad concreta.

Los módulos tendrán las siguientes responsabilidades:

- **Users:** registro, autenticación y administración de perfiles.
- **Verification:** validación de identidad de los usuarios.
- **Spaces:** publicación, consulta y administración de espacios.
- **Search:** búsqueda y filtrado de espacios según los criterios del usuario.
- **Reservations:** creación y administración de reservas.
- **Availability:** gestión de horarios y disponibilidad de los espacios.
- **Payments:** procesamiento y seguimiento de los pagos.

Dentro de los módulos que requieran esta separación, el dominio contendrá las reglas del negocio; la aplicación coordinará los casos de uso; y la infraestructura implementará los mecanismos técnicos necesarios, como el acceso a la base de datos o la integración con servicios externos. El frontend conservará sus componentes y servicios de interfaz en `src/`.

Los elementos compartidos entre módulos deberán limitarse a utilidades realmente comunes. La configuración general continuará en los archivos de configuración existentes; si su crecimiento lo justifica, podrá organizarse en un directorio específico. Las pruebas automatizadas podrán organizarse en `server/tests/` a medida que se modularice el backend, mientras que `docs/adr/` conservará los registros de decisiones arquitectónicas.

## 3. Alternativas consideradas

### 3.1. Estructura por tipo de archivo

Consiste en agrupar todos los controladores, servicios, modelos y repositorios en carpetas generales, independientemente de la funcionalidad a la que pertenezcan.

Se descarta como estructura principal porque, a medida que crezca el sistema, puede resultar más difícil identificar todos los componentes relacionados con una funcionalidad específica.

### 3.2. Estructura sin separación modular

Consiste en mantener la mayoría de las funcionalidades dentro de una estructura general, sin establecer límites claros entre las responsabilidades del sistema.

Se descarta porque puede aumentar el acoplamiento entre componentes y dificultar el mantenimiento y la evolución de WorkPalace.

### 3.3. Repositorios independientes por microservicio

Consiste en separar las funcionalidades en servicios que puedan desarrollarse y desplegarse de manera independiente, potencialmente con repositorios diferentes.

Se descarta para la etapa inicial porque no corresponde con la decisión de Monolito Modular tomada en el ADR-001 y podría introducir complejidad adicional en despliegues, comunicación y coordinación entre servicios.

### 3.4. Arquitectura Hexagonal como estructura general

La Arquitectura Hexagonal propone aislar el dominio mediante puertos y adaptadores, de modo que la lógica de negocio no dependa directamente de tecnologías externas.

No se descarta como principio de diseño, ya que puede complementar la decisión adoptada. Sin embargo, se establece que la organización principal del repositorio estará basada en módulos funcionales, y que los principios de Arquitectura Hexagonal podrán aplicarse dentro de los módulos que lo requieran.

## 4. Consecuencias de la decisión

### Consecuencias positivas

- Facilita la identificación y localización del código correspondiente a cada funcionalidad.
- Promueve una separación clara de responsabilidades.
- Reduce el acoplamiento innecesario entre módulos.
- Facilita el mantenimiento, las pruebas y la incorporación de nuevas funcionalidades.
- Permite aplicar principios de inversión de dependencias y separar la lógica del negocio de los detalles tecnológicos.
- Mantiene la estructura alineada con el Monolito Modular definido en el ADR-001.
- Facilita una posible evolución futura de módulos hacia servicios independientes si las necesidades del proyecto lo justifican.

### Consecuencias negativas

- Requiere establecer y respetar convenciones de organización del código.
- Puede generar duplicación si no se identifican adecuadamente los elementos compartidos.
- Exige controlar las dependencias para evitar que los módulos terminen acoplados entre sí.
- Puede implicar una organización inicial más elaborada que una estructura sin separación de responsabilidades.

## 5. Buenas prácticas de implementación

Para mantener la coherencia de la estructura propuesta, se establecen las siguientes prácticas:

1. **Separación de responsabilidades:** cada módulo debe tener una función claramente definida y evitar asumir responsabilidades que pertenecen a otros módulos.
2. **Control de dependencias:** los módulos deben interactuar mediante interfaces o contratos definidos cuando sea necesario, evitando el acceso directo e indiscriminado a sus componentes internos.
3. **Inversión de dependencias:** la lógica del negocio no debe depender directamente de implementaciones concretas de bases de datos o servicios externos.
4. **Pruebas automatizadas:** los casos de uso y las reglas del negocio deben contar con pruebas apropiadas para verificar su funcionamiento.
5. **Configuración centralizada:** las configuraciones generales y los secretos deben gestionarse de forma segura, sin incluir credenciales en el repositorio.
6. **Documentación Swagger/OpenAPI:** mantener la especificación de `server/swagger.js` sincronizada con los endpoints, sus parámetros, respuestas y requisitos de autenticación; verificar que `/api-docs` y `/api-docs.json` sigan disponibles al modificar la API.
7. **Documentación actualizada:** los cambios significativos en la estructura o en las decisiones arquitectónicas deben quedar documentados.
8. **Consistencia con el proyecto real:** la estructura debe seguir las convenciones de la tecnología utilizada y no crear carpetas o capas que no aporten una responsabilidad concreta.

## 6. Conclusión

Se propone organizar el repositorio de WorkPalace mediante módulos funcionales alineados con la arquitectura de Monolito Modular seleccionada en el ADR-001. Esta decisión busca mantener el código organizado, facilitar el mantenimiento y reducir el acoplamiento entre las funcionalidades del sistema.

La estructura propuesta también permite aplicar principios de separación de responsabilidades e inversión de dependencias, manteniendo la posibilidad de utilizar patrones como la Arquitectura Hexagonal dentro de los módulos cuando resulte conveniente.

La decisión podrá revisarse si la evolución del proyecto evidencia la necesidad de modificar la organización interna del repositorio.

## Referencias

[1] Martin Fowler. *Architecture Decision Record*. https://martinfowler.com/bliki/ArchitectureDecisionRecord.html

[2] Amazon Web Services. *Architectural decision record process*. https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html