// Configuração do Firebase.
// Cole aqui o objeto que o Firebase mostra em:
// Configurações do projeto → Geral → Seus apps → App da Web → "Configuração do SDK" (opção "Config").
// Esses valores identificam o projeto e podem ficar públicos no GitHub:
// quem protege os dados são o login e as regras do Firestore (firestore.rules).

export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// Nome da viagem no banco. Para planejar outra viagem no futuro,
// copie o projeto e troque este valor.
export const TRIP_ID = "europa-2027";
