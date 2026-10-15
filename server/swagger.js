const response = (description) => ({ description });

const errorResponse = {
  description: 'La solicitud no se pudo procesar.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const stringField = (description) => ({ type: 'string', description });
const integerField = (description) => ({ type: 'integer', description });
const booleanField = (description) => ({ type: 'boolean', description });
const objectBody = (properties, required = []) => ({
  type: 'object',
  properties,
  required,
});

function createOperation(method, path, summary, tag, options = {}) {
  const parameters = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'integer' },
  }));

  for (const parameter of options.query || []) {
    parameters.push({
      name: parameter.name,
      in: 'query',
      required: false,
      schema: { type: parameter.type || 'string' },
      description: parameter.description,
    });
  }

  const successStatus = options.successStatus || 200;
  const responses = {
    [successStatus]: response(options.successDescription || 'Solicitud procesada correctamente.'),
  };

  if (options.auth) {
    responses[400] = response('Falta un identificador de usuario válido.');
    responses[403] = response('No autorizado para realizar esta operación.');
  }
  if (options.body) responses[400] = errorResponse;
  if (options.notFound) responses[404] = response('No se encontró el recurso solicitado.');
  if (options.conflict) responses[409] = response('La operación entra en conflicto con el estado actual.');
  responses[500] = response('Error interno del servidor.');

  const operation = {
    tags: [tag],
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    responses,
  };

  if (parameters.length) operation.parameters = parameters;
  if (options.auth === 'admin') {
    operation.security = [{ AdminUserId: [] }, { DevelopmentAdminRole: [] }];
  } else if (options.auth) {
    operation.security = [{ UserId: [] }];
  }
  if (options.body) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: options.bodySchema || { type: 'object', additionalProperties: true },
        },
      },
    };
  }
  if (options.description) operation.description = options.description;
  return operation;
}

const bodySchemas = {
  signup: {
    ...objectBody({
      fullName: stringField('Nombre completo.'),
      email: stringField('Correo electrónico.'),
      username: stringField('Nombre de usuario.'),
      password: stringField('Contraseña (6 a 128 caracteres).'),
      phone: stringField('Opcional: no es necesario enviarlo para registrar la cuenta.'),
    }, ['fullName', 'email', 'username', 'password']),
    example: {
      fullName: 'Nombre Completo',
      email: 'correo@ejemplo.com',
      username: 'usuario',
      password: 'contraseña',
    },
  },
  login: objectBody({
    username: stringField('Nombre de usuario o correo electrónico.'),
    password: stringField('Contraseña.'),
  }, ['username', 'password']),
  otpVerify: objectBody({
    challengeId: stringField('Identificador del desafío OTP.'),
    code: stringField('Código de verificación de seis dígitos.'),
  }, ['challengeId', 'code']),
  otpResend: objectBody({
    challengeId: stringField('Identificador del desafío OTP.'),
  }, ['challengeId']),
  role: objectBody({
    role: { type: 'string', enum: ['admin', 'user'], description: 'Nuevo rol.' },
  }, ['role']),
  active: objectBody({
    active: booleanField('Indica si la cuenta debe estar activa.'),
  }, ['active']),
  profile: objectBody({
    full_name: stringField('Nombre completo.'),
    email: stringField('Correo electrónico.'),
    username: stringField('Nombre de usuario.'),
    profile_image_url: stringField('URL de la imagen de perfil.'),
    phone: stringField('Número celular colombiano.'),
    two_factor_enabled: booleanField('Activa o desactiva la verificación en dos pasos.'),
  }),
  favorite: objectBody({
    placeId: integerField('ID del espacio.'),
    placeName: stringField('Nombre del espacio.'),
    placeCity: stringField('Ciudad del espacio.'),
  }, ['placeId', 'placeName']),
  couponValidation: objectBody({
    couponCode: stringField('Código del cupón.'),
  }, ['couponCode']),
  couponCreate: objectBody({
    code: stringField('Código único del cupón.'),
    label: stringField('Descripción del cupón.'),
    discount: integerField('Porcentaje de descuento (1 a 100).'),
    maxUses: integerField('Máximo de usos (opcional).'),
    startsAt: stringField('Fecha de inicio (opcional).'),
    endsAt: stringField('Fecha de finalización (opcional).'),
  }, ['code', 'label', 'discount']),
  couponUpdate: objectBody({
    label: stringField('Descripción del cupón.'),
    discount: integerField('Porcentaje de descuento.'),
    maxUses: integerField('Máximo de usos.'),
    startsAt: stringField('Fecha de inicio.'),
    endsAt: stringField('Fecha de finalización.'),
    active: booleanField('Indica si el cupón está activo.'),
  }),
  blockCreate: objectBody({
    placeId: integerField('ID del espacio.'),
    startsAt: stringField('Fecha de inicio del bloqueo (AAAA-MM-DD).'),
    endsAt: stringField('Fecha de finalización del bloqueo (AAAA-MM-DD).'),
    reason: stringField('Motivo del bloqueo.'),
  }, ['placeId', 'startsAt', 'endsAt']),
  reservationCreate: objectBody({
    placeId: integerField('ID del espacio.'),
    checkIn: stringField('Fecha de inicio (AAAA-MM-DD).'),
    checkOut: stringField('Fecha de finalización (AAAA-MM-DD).'),
    huespedes: integerField('Cantidad de huéspedes.'),
    couponCode: stringField('Código del cupón (opcional).'),
    payment: {
      type: 'object',
      properties: {
        method: stringField('Método de pago.'),
        exp: stringField('Vencimiento de tarjeta (MM/AA).'),
      },
    },
  }, ['placeId', 'checkIn', 'checkOut']),
  reservationUpdate: objectBody({
    checkIn: stringField('Fecha de inicio (AAAA-MM-DD).'),
    checkOut: stringField('Fecha de finalización (AAAA-MM-DD).'),
    huespedes: integerField('Cantidad de huéspedes.'),
    estado: stringField('Nuevo estado de la reserva.'),
    active: booleanField('Indica si la reserva está activa.'),
  }),
  placeCreate: objectBody({
    name: stringField('Nombre del espacio.'),
    tipo: stringField('Tipo de espacio.'),
    barrio: stringField('Barrio.'),
    ciudad: stringField('Ciudad.'),
    capacidad: integerField('Capacidad.'),
    precio_hora: integerField('Precio por hora.'),
    modalidad: stringField('Modalidad.'),
    caracteristicas: stringField('Características.'),
    nivel_ruido: stringField('Nivel de ruido.'),
    image_url: stringField('URL de la imagen.'),
  }, ['name', 'tipo']),
  placeUpdate: objectBody({
    name: stringField('Nombre del espacio.'),
    tipo: stringField('Tipo de espacio.'),
    barrio: stringField('Barrio.'),
    ciudad: stringField('Ciudad.'),
    capacidad: integerField('Capacidad.'),
    precio_hora: integerField('Precio por hora.'),
    modalidad: stringField('Modalidad.'),
    caracteristicas: stringField('Características.'),
    image_url: stringField('URL de la imagen.'),
    active: booleanField('Indica si el espacio está activo.'),
  }),
};

const endpoints = [
  ['get', '/api/debug', 'Consultar información de depuración', 'Sistema'],
  ['get', '/api/health', 'Comprobar el estado del servidor', 'Sistema'],
  ['post', '/api/signup', 'Registrar un usuario', 'Autenticación', { body: true, bodySchema: bodySchemas.signup, successStatus: 201 }],
  ['post', '/api/login', 'Iniciar sesión', 'Autenticación', { body: true, bodySchema: bodySchemas.login }],
  ['post', '/api/login/otp/verify', 'Verificar el código OTP', 'Autenticación', { body: true, bodySchema: bodySchemas.otpVerify }],
  ['post', '/api/login/otp/resend', 'Reenviar el código OTP', 'Autenticación', { body: true, bodySchema: bodySchemas.otpResend }],
  ['post', '/api/coupons/validate', 'Validar un cupón', 'Cupones', { auth: 'user', body: true, bodySchema: bodySchemas.couponValidation }],
  ['get', '/api/users', 'Listar usuarios', 'Usuarios', { auth: 'admin' }],
  ['put', '/api/users/:id/role', 'Cambiar el rol de un usuario', 'Usuarios', { auth: 'admin', body: true, bodySchema: bodySchemas.role, notFound: true }],
  ['put', '/api/users/:id/active', 'Activar o desactivar un usuario', 'Usuarios', { auth: 'admin', body: true, bodySchema: bodySchemas.active, notFound: true }],
  ['delete', '/api/users/:id', 'Eliminar un usuario', 'Usuarios', { auth: 'admin', successStatus: 204, notFound: true }],
  ['get', '/api/users/:id/profile', 'Consultar el perfil de un usuario', 'Usuarios', { notFound: true }],
  ['put', '/api/users/:id/profile', 'Actualizar el perfil de un usuario', 'Usuarios', { body: true, bodySchema: bodySchemas.profile, notFound: true }],
  ['get', '/api/users/:id/favorites', 'Listar espacios favoritos', 'Usuarios', { auth: 'user' }],
  ['post', '/api/users/:id/favorites', 'Agregar un espacio a favoritos', 'Usuarios', { auth: 'user', body: true, bodySchema: bodySchemas.favorite, successStatus: 201 }],
  ['delete', '/api/users/:id/favorites/:placeId', 'Eliminar un espacio de favoritos', 'Usuarios', { auth: 'user', successStatus: 204, notFound: true }],
  ['get', '/api/users/:id/notifications', 'Listar notificaciones de un usuario', 'Usuarios', { auth: 'user' }],
  ['put', '/api/users/:id/notifications/:notificationId/read', 'Marcar una notificación como leída', 'Usuarios', { auth: 'user', notFound: true }],
  ['get', '/api/admin/coupons', 'Listar cupones', 'Administración', { auth: 'admin' }],
  ['post', '/api/admin/coupons', 'Crear un cupón', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.couponCreate, successStatus: 201, conflict: true }],
  ['put', '/api/admin/coupons/:id', 'Actualizar un cupón', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.couponUpdate, notFound: true }],
  ['delete', '/api/admin/coupons/:id', 'Eliminar un cupón', 'Administración', { auth: 'admin', successStatus: 204, notFound: true }],
  ['get', '/api/admin/audit', 'Consultar el registro de auditoría', 'Administración', { auth: 'admin' }],
  ['get', '/api/admin/blocks', 'Listar bloqueos de espacios', 'Administración', { auth: 'admin' }],
  ['post', '/api/admin/blocks', 'Crear un bloqueo de espacio', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.blockCreate, successStatus: 201 }],
  ['delete', '/api/admin/blocks/:id', 'Eliminar un bloqueo', 'Administración', { auth: 'admin', successStatus: 204, notFound: true }],
  ['get', '/api/reservations', 'Listar reservas del usuario', 'Reservas', { auth: 'user' }],
  ['post', '/api/reservations', 'Crear una reserva', 'Reservas', { auth: 'user', body: true, bodySchema: bodySchemas.reservationCreate, successStatus: 201, notFound: true, conflict: true }],
  ['delete', '/api/reservations/:id', 'Cancelar una reserva propia', 'Reservas', { auth: 'user', notFound: true }],
  ['get', '/api/available-reservations', 'Listar reservas disponibles', 'Reservas'],
  ['get', '/api/admin/reservations', 'Listar todas las reservas', 'Administración', { auth: 'admin' }],
  ['put', '/api/admin/reservations/:id', 'Actualizar una reserva', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.reservationUpdate, notFound: true }],
  ['delete', '/api/admin/reservations/:id', 'Eliminar una reserva', 'Administración', { auth: 'admin', successStatus: 204, notFound: true }],
  ['get', '/api/places', 'Listar espacios', 'Espacios', {
    query: [{ name: 'date', description: 'Fecha para consultar disponibilidad (AAAA-MM-DD).' }],
    description: 'Envía el header x-user-id para ver espacios; sin él la API devuelve una lista vacía.',
  }],
  ['get', '/api/admin/places', 'Listar espacios para administración', 'Administración', { auth: 'admin' }],
  ['post', '/api/admin/places', 'Crear un espacio', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.placeCreate, successStatus: 201 }],
  ['put', '/api/admin/places/:id', 'Actualizar un espacio', 'Administración', { auth: 'admin', body: true, bodySchema: bodySchemas.placeUpdate, notFound: true }],
  ['delete', '/api/admin/places/:id', 'Eliminar un espacio', 'Administración', { auth: 'admin', successStatus: 204, notFound: true }],
];

const paths = {};
for (const [method, route, summary, tag, options = {}] of endpoints) {
  const path = route.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  paths[path] ||= {};
  paths[path][method] = createOperation(method, route, summary, tag, options);
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'WorkPalace API',
    version: '1.0.0',
    description: 'Documentación interactiva de la API backend de WorkPalace.',
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Autenticación' },
    { name: 'Usuarios' },
    { name: 'Espacios' },
    { name: 'Reservas' },
    { name: 'Cupones' },
    { name: 'Administración' },
  ],
  paths,
  components: {
    securitySchemes: {
      UserId: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'ID del usuario que realiza la solicitud.',
      },
      AdminUserId: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'ID de un usuario administrador activo. En producción se valida contra la base de datos.',
      },
      DevelopmentAdminRole: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-role',
        description: 'Solo para desarrollo: usa el valor admin. No se acepta en producción.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Descripción del error.' },
        },
      },
    },
  },
};
