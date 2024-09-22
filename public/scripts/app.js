import { db, auth, doc, getDoc, setDoc, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from './api-firebase.js';

//cambiar redireccion segun el rol

//T-funcione verificacion de email al registrar
// en la session verificar roles

onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    // Obtener el documento del usuario desde Firestore para verificar su rol
    const userDocRef = doc(db, "Usuarios", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Redirigir según el rol del usuario
      if (userData.Rol === "Administrador") {
        window.location.href = 'admin';
      } else {
        window.location.href = 'profile';
      }
    } else {
      alert("No se encontraron datos de usuario. Contacte al administrador.");
    }
  } else if (user) {
    alert("Por favor, verifica tu correo antes de acceder a la aplicación.");
  }
});


// Lógica de registro
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const nombre = document.getElementById('userName').value;
  const apellido = document.getElementById('userLastname').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const p1 = null;
  const p2 = null;
  const p3 = null;
  const r1 = null;
  const r2 = null;
  const r3 = null;
  let rol = "Estudiante";

  // Validar la extensión del correo electrónico
  
  const domain = email.split('@')[1];
  if (domain === "est.univalle.edu") {
    rol = "Estudiante";
  } else if (domain === "univalle.edu") {
    rol = "Administrador";
  } else {
    alert("El correo electrónico debe pertenecer al dominio de Univalle.");
    return; // Detener el proceso de registro si el dominio no coincide
  }

  // Crea el usuario en Firebase Authentication
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;

      // Enviar correo de verificación
      await sendEmailVerification(user);

      // Crea un objeto JSON con los datos del usuario
      const userData = {
        Nombre: nombre,
        Apellido: apellido,
        P1: p1,
        P2: p2,
        P3: p3,
        R1: r1,
        R2: r2,
        R3: r3,
        Rol: rol,
      };

      // Guarda los datos del usuario en Firestore usando la UID de Firebase Authentication
      const userDocRef = doc(db, "Usuarios", user.uid); // Usa la UID como ID del documento
      await setDoc(userDocRef, userData);
      alert("Usuario registrado con éxito.");

    })
    .catch((error) => {
      console.error("Error al registrar el usuario:", error);
      alert("Error al registrar el usuario: " + error.message);
    });
});

// Lógica de inicio de sesión
document.querySelector('.form-login').addEventListener('submit', function(e) {
  e.preventDefault();

  const email = document.querySelector('.form-login input[type="email"]').value;
  const password = document.querySelector('.form-login input[type="password"]').value;

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const userDocRef = doc(db, "Usuarios", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const user = userCredential.user;

      if (user.emailVerified) {
        alert("Inicio de sesión exitoso.");
        
        // Redirige basado en el rol del usuario
        if (userData.Rol === "Administrador") {
          window.location.href = 'admin';
        } else {
          window.location.href = 'profile';
        }
      } else {
        alert("Por favor, verifica tu correo antes de iniciar sesión.");
      }
    })
    .catch((error) => {
      console.error("Error en el inicio de sesión:", error);
      alert("Error en el inicio de sesión: " + error.message);
    });
});
