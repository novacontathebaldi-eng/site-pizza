// setAdmin.js
const admin = require('firebase-admin');

// IMPORTANTE: Baixe sua chave de serviço no Firebase
// Console > Configurações do Projeto > Contas de serviço > Gerar nova chave privada
const serviceAccount = require('./path/to/your/serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// IMPORTANTE: Cole aqui o UID do usuário que você quer tornar admin
const uid = 'uid-do-seu-usuario-admin'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Sucesso! O usuário ${uid} agora é um administrador.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro ao definir custom claim:', error);
    process.exit(1);
  });