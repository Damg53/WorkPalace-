import fetch from 'node-fetch';

async function testLoginAPI() {
  console.log('🔐 Probando API de Login\n');

  // Usuario de prueba (existe en la BD)
  const testUser = {
    username: 'erik',
    password: 'MiPasswordSegura' // Cambiar por la contraseña correcta
  };

  console.log('📤 Enviando solicitud de login...');
  console.log(`   Usuario: ${testUser.username}`);
  console.log(`   Contraseña: ${testUser.password}\n`);

  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Login exitoso!');
      console.log(`Usuario: ${data.user.username}`);
      console.log(`Email: ${data.user.email}`);
    } else {
      console.log('\n❌ Error en el login:', data.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('1. El servidor está corriendo: npm run server');
    console.log('2. PostgreSQL está corriendo: docker-compose up -d');
    console.log('3. La BD tiene la tabla users creada');
  }
}

testLoginAPI();
