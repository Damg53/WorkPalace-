## 5. Registro de la decisión arquitectónica (ADR)

### 5.1 ¿Qué es un ADR?

Un ADR (Architecture Decision Record) es un documento utilizado para registrar decisiones importantes relacionadas con la arquitectura de un sistema de software. Su propósito es dejar constancia de la decisión tomada, el contexto que llevó a tomarla, las alternativas consideradas y las consecuencias que tendrá.

Los ADR permiten conservar la información relacionada con las decisiones arquitectónicas a lo largo del tiempo. Esto facilita que los integrantes actuales y futuros del equipo comprendan no solamente cuál fue la decisión adoptada, sino también las razones que llevaron a ella.

Martin Fowler explica que un ADR permite registrar una decisión arquitectónica junto con su contexto y sus consecuencias, proporcionando un registro histórico de las decisiones importantes del sistema. [1]

De forma similar, Amazon Web Services plantea que un ADR debe documentar una decisión arquitectónica significativa, incluyendo el contexto, la decisión adoptada y sus consecuencias. [2]

Para WorkPalace, el ADR será utilizado para documentar la selección del estilo arquitectónico que se empleará en el desarrollo del sistema.

---

### 5.2 ADR-001: Selección del estilo arquitectónico para WorkPalace

Estado: Aceptado

Decisión: Seleccionar Monolito Modular como estilo arquitectónico inicial para WorkPalace.

#### Contexto

WorkPalace es una plataforma que busca conectar a personas que necesitan utilizar espacios especializados con propietarios que disponen de espacios infrautilizados.

El sistema debe manejar diferentes funcionalidades, entre ellas:

- Registro y autenticación de usuarios.
- Verificación de identidad.
- Publicación y administración de espacios.
- Búsqueda y filtrado.
- Gestión de reservas.
- Administración de disponibilidad.
- Procesamiento de pagos.

Estas funcionalidades pertenecen a diferentes áreas del sistema, pero están fuertemente relacionadas entre sí. Por ejemplo, una reserva depende de la disponibilidad de un espacio y, posteriormente, puede involucrar un proceso de pago.

Además, el sistema debe prestar especial atención a características como seguridad, fiabilidad, facilidad de uso y rendimiento. Por esta razón, la arquitectura debe permitir separar las responsabilidades de cada funcionalidad sin introducir una complejidad excesiva para la etapa inicial del proyecto.

#### Decisión

Se selecciona el Monolito Modular como arquitectura inicial de WorkPalace.

La aplicación será desplegada como una sola unidad, pero internamente estará dividida en módulos independientes y organizados según sus responsabilidades.

Una posible distribución de los módulos sería:

- Usuarios: registro, autenticación y administración de perfiles.
- Verificación: validación de identidad.
- Espacios: creación, edición y administración de espacios.
- Búsqueda: consulta y filtrado de espacios.
- Reservas: creación y administración de reservas.
- Disponibilidad: administración de horarios y disponibilidad.
- Pagos: procesamiento de transacciones.

Cada módulo tendrá una responsabilidad específica y deberá limitar sus dependencias con respecto a los demás módulos.

---

### 5.3 Justificación de la decisión

El Monolito Modular representa una alternativa intermedia entre una arquitectura monolítica tradicional y una arquitectura completamente distribuida.

Una aplicación monolítica puede ser sencilla de desarrollar y desplegar, pero a medida que aumenta su tamaño puede resultar difícil mantener una separación clara entre las diferentes funcionalidades. La modularización permite solucionar parte de este problema mediante la organización del sistema en componentes con responsabilidades bien definidas.

Por otro lado, una arquitectura de microservicios permite separar los componentes de una aplicación en servicios independientes, pero también introduce una serie de complejidades relacionadas con la comunicación entre servicios, la distribución de datos, el monitoreo y el manejo de errores. Martin Fowler destaca que los sistemas distribuidos implican costos adicionales que deben ser considerados antes de adoptar microservicios. [3]

En el caso de WorkPalace, no se considera necesario asumir esa complejidad desde la primera versión. El sistema puede beneficiarse de una separación modular sin requerir inicialmente múltiples servicios independientes.

El Monolito Modular también permite mantener dentro de un mismo sistema funcionalidades que necesitan trabajar coordinadamente, como las reservas y la disponibilidad. Esto facilita el manejo de operaciones que requieren consistencia entre ambas funcionalidades.

Otro aspecto importante es que esta decisión no impide una evolución futura. Si el sistema aumenta considerablemente su número de usuarios o alguna funcionalidad requiere escalar de manera independiente, los módulos podrían separarse progresivamente en servicios independientes.

Por lo tanto, se considera que el Monolito Modular proporciona un equilibrio adecuado entre simplicidad, organización, mantenibilidad y posibilidad de evolución.

---

### 5.4 Alternativas consideradas

#### Arquitectura monolítica

La arquitectura monolítica fue considerada porque permite construir el sistema como una única aplicación, facilitando inicialmente su desarrollo y despliegue.

Sin embargo, se diferencia del Monolito Modular en que este último establece una separación interna más clara entre las diferentes funcionalidades. Para WorkPalace, esta separación resulta conveniente debido a la existencia de diferentes áreas funcionales como usuarios, espacios, reservas, pagos y disponibilidad.

Por esta razón, se selecciona el Monolito Modular sobre un monolito completamente acoplado.

#### Cliente-servidor

El modelo cliente-servidor es apropiado para representar la comunicación entre los usuarios de WorkPalace y el servidor que procesa las solicitudes.

Sin embargo, esta arquitectura no define por sí misma cómo deben organizarse las diferentes funcionalidades internas de la aplicación. Por este motivo, no se considera suficiente como decisión arquitectónica principal para el proyecto.

#### Microservicios

Los microservicios permiten dividir una aplicación en servicios independientes que pueden desarrollarse, desplegarse y escalarse de manera individual. [3]

Esta arquitectura podría ser útil para WorkPalace en una etapa de mayor crecimiento. Por ejemplo, funcionalidades como pagos, reservas o disponibilidad podrían convertirse en servicios independientes.

Sin embargo, implementarla desde el inicio implicaría introducir complejidad relacionada con comunicación entre servicios, consistencia de datos, monitoreo, despliegues independientes y manejo de fallos distribuidos.

Por este motivo, se considera más apropiado comenzar con un Monolito Modular.

#### Clean Architecture

Clean Architecture propone organizar el software de manera que las reglas de negocio sean independientes de detalles externos como frameworks, bases de datos o interfaces.

Esta alternativa puede resultar útil para estructurar internamente el código de WorkPalace. Sin embargo, no necesariamente debe considerarse excluyente respecto al Monolito Modular.

Es posible utilizar un Monolito Modular y aplicar principios de Clean Architecture dentro de sus módulos. De esta manera, el Monolito Modular define principalmente la organización de los módulos del sistema, mientras que Clean Architecture puede contribuir a definir la organización interna de cada módulo.

#### Serverless

Serverless permite ejecutar funcionalidades bajo demanda sin que el equipo tenga que administrar directamente toda la infraestructura de servidores. Este enfoque puede ser apropiado para determinadas funcionalidades y cargas de trabajo.

Sin embargo, utilizar Serverless como arquitectura principal de WorkPalace implicaría adoptar un modelo distribuido basado en funciones y servicios administrados, aumentando la cantidad de decisiones relacionadas con infraestructura y comunicación entre componentes.

AWS señala que las arquitecturas Serverless requieren considerar cuidadosamente la granularidad de las funciones y la separación de responsabilidades para evitar una arquitectura excesivamente compleja. [4]

Por esta razón, no se selecciona Serverless como arquitectura principal en esta etapa.

---

### 5.5 Consecuencias de la decisión

#### Consecuencias positivas

- Permite separar las funcionalidades del sistema mediante módulos.
- Mantiene una infraestructura relativamente sencilla.
- Facilita el desarrollo inicial del proyecto.
- Facilita el mantenimiento y evolución del código.
- Reduce el acoplamiento entre funcionalidades.
- Permite coordinar fácilmente funcionalidades relacionadas.
- Permite aplicar principios de Clean Architecture dentro de los módulos.
- Facilita una posible migración futura hacia microservicios.

#### Consecuencias negativas

- Los módulos siguen formando parte de una misma aplicación desplegable.
- Un problema crítico en la aplicación podría afectar a diferentes módulos.
- Los módulos no pueden escalarse de manera completamente independiente.
- Se debe controlar cuidadosamente la comunicación y las dependencias entre módulos.
- Si el proyecto alcanza una escala considerable, algunos módulos podrían requerir una separación posterior.

---

### 5.6 Conclusión

Después de comparar las arquitecturas estudiadas —monolítica, monolito modular, cliente-servidor, microservicios, Clean Architecture y Serverless— se selecciona el Monolito Modular como la alternativa más adecuada para la primera versión de WorkPalace.

La principal razón es que permite obtener una estructura organizada y modular sin asumir desde el comienzo la complejidad de una arquitectura distribuida.

La solución permite separar funcionalidades como usuarios, espacios, reservas, disponibilidad, pagos y verificación, manteniendo al mismo tiempo una infraestructura relativamente sencilla.

Además, la decisión permite que la arquitectura evolucione con el proyecto. Si en el futuro WorkPalace aumenta significativamente su escala, algunos módulos podrán convertirse en servicios independientes si las necesidades de escalabilidad, disponibilidad o mantenimiento lo justifican.

Por lo tanto, el Monolito Modular se considera la decisión arquitectónica inicial, pero esta decisión podrá ser revisada mediante un nuevo ADR si las condiciones del sistema cambian.

### Referencias

[1] Martin Fowler. Architecture Decision Record. https://martinfowler.com/bliki/ArchitectureDecisionRecord.html

[2] Amazon Web Services. Architectural decision record process. https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html

[3] Martin Fowler. Microservice Trade-Offs. https://www.martinfowler.com/articles/microservice-trade-offs.html

[4] Amazon Web Services. Comparing design approaches for building serverless microservices. https://aws.amazon.com/blogs/compute/comparing-design-approaches-for-building-serverless-microservices/
