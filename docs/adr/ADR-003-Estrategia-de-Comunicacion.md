# ADR 003: Estrategia de Comunicación

**Estado:** Aceptado

**Decisión:** Utilizar comunicación síncrona basada en REST y JSON para las interacciones entre el frontend y el backend de WorkPalace. Mantener las llamadas entre módulos del backend dentro del proceso del monolito modular y documentar el contrato público de la API con OpenAPI.

## 1. Contexto relevante

WorkPalace conecta a personas que buscan espacios especializados con propietarios que los ofrecen. El sistema incluye funcionalidades como registro e inicio de sesión, consulta de espacios, reservas y administración. El frontend está construido con React y TypeScript, y el backend utiliza Node.js y Express.

La arquitectura definida en el ADR-001 es un monolito modular. Por ello, la estrategia de comunicación debe permitir que el frontend consuma las capacidades del backend mediante un contrato claro, sin introducir desde esta etapa la complejidad operativa de servicios distribuidos.

El repositorio ya implementa endpoints HTTP bajo `/api`, intercambia datos en formato JSON y mantiene una especificación OpenAPI 3.0.3 en `server/swagger.js`. Esta especificación está disponible en `/api-docs.json` y se presenta de forma interactiva en `/api-docs`.

## 2. Decisión tomada

### 2.1 Comunicación entre frontend y backend

El frontend se comunicará con el backend mediante una API REST sobre HTTP. Las solicitudes y respuestas que intercambien datos utilizarán JSON. En producción, el tráfico deberá servirse sobre HTTPS; HTTP queda limitado al desarrollo local.

La interacción será síncrona desde el punto de vista del contrato: el cliente envía una solicitud y espera una respuesta con el resultado de esa operación. Que el código use `async`/`await` para no bloquear el hilo de ejecución no convierte esta interacción en mensajería asíncrona; el flujo de la operación sigue dependiendo de su respuesta.

Se utilizarán los métodos HTTP de acuerdo con su propósito, por ejemplo `GET` para consultar, `POST` para crear, `PUT` para actualizar y `DELETE` para eliminar. Las rutas seguirán el espacio `/api`, como en `/api/places`, `/api/reservations` y `/api/login`.

### 2.2 Comunicación entre módulos del backend

Mientras WorkPalace mantenga su arquitectura de monolito modular, los módulos del backend colaborarán mediante llamadas a funciones o servicios dentro del mismo proceso, con responsabilidades e interfaces explícitas. No se crearán endpoints HTTP internos entre módulos ni se tratarán como servicios de red independientes.

El acceso a PostgreSQL y a proveedores externos pertenece a la infraestructura del backend. Los detalles de esas integraciones no deben filtrarse al contrato que consume el frontend.

### 2.3 Contrato de comunicación

OpenAPI será la fuente de documentación del contrato HTTP. La especificación de `server/swagger.js` debe mantenerse alineada con la implementación e incluir, para cada operación:

- Ruta y método HTTP.
- Parámetros de ruta y de consulta.
- Esquemas y campos requeridos de las solicitudes JSON.
- Respuestas exitosas y sus códigos HTTP.
- Errores esperados y sus códigos, incluyendo validación, autorización, recurso inexistente y conflictos.
- Requisitos de autenticación o encabezados que apliquen.

Los cambios incompatibles en las rutas o en los esquemas deberán evaluarse antes de publicarse. Si en el futuro se necesita mantener clientes con contratos diferentes, se deberá proponer una estrategia de versionado mediante un ADR o una actualización justificada de este.

Los formatos de contrato dependen de la tecnología elegida: OpenAPI para REST, WSDL para SOAP, SDL (Schema Definition Language) para GraphQL y archivos `.proto` para gRPC. En WorkPalace se adopta OpenAPI; los demás formatos se mencionan como referencia para las alternativas evaluadas, no como tecnologías implementadas.

### 2.4 Operaciones asíncronas y tiempo real

No se adopta una cola de mensajes ni un bus de eventos como mecanismo general de comunicación en esta etapa. Una integración externa que forme parte de una solicitud —por ejemplo, el envío de un código de verificación— podrá ejecutarse durante esa solicitud y devolver su resultado al cliente.

Si una operación futura es larga, puede ejecutarse fuera del ciclo de solicitud-respuesta o requiere entrega y reintentos desacoplados, se evaluará un mecanismo asíncrono específico. La decisión deberá definir cómo se informa el estado al usuario, cómo se gestionan errores y reintentos y cómo se evita procesar dos veces una misma operación.

Tampoco se adopta WebSocket para actualizaciones en tiempo real: el proyecto no presenta actualmente un requerimiento que justifique mantener conexiones persistentes.

## 3. Alternativas consideradas

### 3.1 SOAP y WSDL

SOAP ofrece contratos formales basados en XML y puede resultar apropiado en integraciones empresariales que lo exijan. Se descarta para la API principal porque WorkPalace ya utiliza JSON y HTTP, y no necesita asumir la verbosidad ni la infraestructura adicional de SOAP/WSDL.

### 3.2 GraphQL

GraphQL permitiría que los clientes definieran con precisión los datos que consultan. Se descarta por ahora porque el proyecto ya dispone de endpoints REST que cubren sus flujos y no se ha identificado una necesidad de consultas altamente variables que compense introducir un esquema, resolvers y nuevas prácticas operativas.

### 3.3 gRPC y Protocol Buffers

gRPC ofrece contratos tipados y comunicación eficiente entre servicios. Se descarta para la comunicación principal porque el frontend web ya consume HTTP y JSON, y el backend es un monolito modular, no un conjunto de servicios que necesiten comunicación RPC de alto rendimiento.

### 3.4 WebSocket

WebSocket permite comunicación bidireccional de baja latencia y puede servir para notificaciones o actualizaciones en vivo. Se descarta mientras no exista un caso de uso en WorkPalace que requiera comunicación continua; para operaciones actuales basta con solicitudes REST.

### 3.5 Webhooks

Los webhooks permiten que un sistema externo notifique eventos a WorkPalace. No sustituyen la API usada por el frontend y no se requieren como mecanismo general en la implementación actual. Podrán incorporarse para integraciones concretas que deban notificar eventos al servidor.

### 3.6 Mensajería asíncrona

Una cola o un bus de eventos facilitaría desacoplar tareas y procesar trabajo en segundo plano, pero también introduciría infraestructura, consistencia eventual, reintentos, monitoreo y gestión de mensajes duplicados. Se pospone hasta que una necesidad concreta —como tareas largas o mayor volumen de eventos— justifique estos costos.

### 3.7 REST interno entre módulos

Exponer cada módulo como endpoint HTTP interno facilitaría su separación posterior, pero añadiría serialización y fallos de red dentro de un despliegue que actualmente es un único monolito. Se prefieren interfaces y llamadas dentro del proceso; si un módulo se extrae como servicio independiente, se revisará entonces su contrato de comunicación.

## 4. Consecuencias de la decisión

### Consecuencias positivas

- Mantiene coherencia con la implementación actual de React, Express, HTTP y JSON.
- Proporciona un contrato entendible y verificable por el frontend y el backend.
- Permite explorar y probar las operaciones mediante Swagger UI y OpenAPI.
- Conserva la simplicidad de despliegue y de comunicación propia del monolito modular.
- Facilita cambiar la implementación interna de los módulos sin exponer esos cambios al cliente.

### Consecuencias negativas

- El cliente depende de la disponibilidad del backend para completar cada operación síncrona.
- La especificación OpenAPI puede quedar desactualizada si no se mantiene junto con los endpoints.
- REST puede no ser suficiente para futuros casos de comunicación en tiempo real o trabajos desacoplados.
- La evolución del contrato requiere cuidado para no romper las versiones del frontend que ya lo consumen.

## 5. Buenas prácticas de implementación

1. **Mantener el contrato actualizado:** modificar la especificación OpenAPI de `server/swagger.js` junto con cada cambio de endpoint, esquema, respuesta o requisito de acceso; comprobar `/api-docs` y `/api-docs.json`.
2. **Validar entradas:** validar tipos, campos requeridos, formatos y límites en el backend; no confiar únicamente en las validaciones del frontend.
3. **Usar HTTP correctamente:** seleccionar métodos y códigos de estado coherentes con el resultado, y responder con un formato de error uniforme y sin detalles internos sensibles.
4. **Proteger la comunicación:** usar HTTPS en producción, validar autorización en el servidor y no incluir contraseñas, tokens ni secretos en URL o registros.
5. **Aislar dependencias:** mantener las llamadas a la base de datos y a proveedores externos detrás de componentes de infraestructura; los módulos deben depender de interfaces claras, no de detalles ajenos.
6. **Gestionar fallos externos:** establecer límites de espera y tratamiento explícito de errores para proveedores; reintentar únicamente cuando sea seguro, considerando idempotencia para operaciones que puedan duplicarse.
7. **Evitar sobrecargar respuestas:** devolver solo los datos requeridos y aplicar paginación cuando una colección pueda crecer significativamente.
8. **Probar el contrato:** incluir pruebas que verifiquen rutas, validaciones, códigos de estado y esquemas documentados, especialmente en flujos de autenticación y reservas.
9. **Revisar la estrategia ante nuevos requisitos:** incorporar WebSocket, webhooks, GraphQL o mensajería solo cuando un caso de uso lo requiera y se documenten sus costos y consecuencias.

## 6. Conclusión

Se propone mantener REST sobre HTTP con JSON como estrategia de comunicación síncrona entre el frontend y el backend de WorkPalace, utilizar OpenAPI para documentar ese contrato y conservar la comunicación entre módulos dentro del proceso del monolito modular. Esta decisión se ajusta a la arquitectura y a las tecnologías que ya utiliza el repositorio, sin introducir infraestructura distribuida que el proyecto todavía no necesita.

La decisión podrá revisarse cuando WorkPalace requiera comunicación en tiempo real, procesamiento desacoplado de larga duración o la extracción de módulos como servicios independientes.

## Referencias

[1] OpenAPI Initiative. *OpenAPI Specification*. https://spec.openapis.org/oas/v3.0.3

[2] Fielding, Roy T. *Architectural Styles and the Design of Network-based Software Architectures*. University of California, Irvine, 2000.
