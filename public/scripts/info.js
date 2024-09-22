import { db, auth, getDoc, doc, onAuthStateChanged, signOut, updateDoc } from './api-firebase.js';

// Verifica el estado de autenticación del usuario
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        try {
            const userDocRef = doc(db, "Usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                if (userData.Rol === "Administrador") {
                    window.location.href = 'admin';
                    return;
                } else {
                    await mostrarInformacionUsuario(user.uid, user.email);

                    // Ocultar el anillo de carga y mostrar el perfil con transición
                    const loadingContainer = document.getElementById('loading-container');
                    const profileContainer = document.querySelector('.profile-container');

                    // Esconder el contenedor de carga
                    loadingContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    loadingContainer.style.opacity = '0';
                    loadingContainer.style.transform = 'translateY(-20px)';

                    // Después de la transición esconder el elemento
                    setTimeout(() => {
                        loadingContainer.style.display = 'none';
                        profileContainer.classList.add('visible');
                    }, 500); // Tiempo para que la transición de carga termine
                }
            } else {
                console.error("No se encontraron datos de usuario. Contacte al administrador.");
                alert("No se encontraron datos de usuario. Redirigiendo al inicio.");
                window.location.href = '/';  // Redirige al inicio si no encuentra el usuario
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
            alert("Hubo un error al obtener los datos del usuario. Redirigiendo al inicio.");
            window.location.href = '/';  // Redirige al inicio si ocurre un error
        }
    } else {
        window.location.href = '/';  // Redirige al inicio si el usuario no está autenticado o el correo no está verificado
    }
});

// Cerrar sesión y redirigir al login
document.getElementById('cerrar-sesion').addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Sesión cerrada con éxito.");
        window.location.href = '/'; // Redirige a la página de login
    }).catch((error) => {
        console.error("Error al cerrar sesión: ", error);
    });
});

// Función para mostrar la información del usuario y los proyectos seleccionados
async function mostrarInformacionUsuario(uid, email) {
    const userDocRef = doc(db, "Usuarios", uid); // Usamos la UID para obtener el documento del usuario
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.Rol === "Administrador") {
            // Si es administrador, redirigir a la página de soporte
            window.location.href = 'soporte';
            return; // Detener la ejecución de la función
        }

        // Mostrar la información del usuario
        document.getElementById('inf-nombre').textContent = userData.Nombre;
        document.getElementById('inf-apellido').textContent = userData.Apellido;
        document.getElementById('inf-email').textContent = email; // Usamos el email del autenticador
        document.getElementById('inf-telefono').textContent = userData.Telefono;
        document.getElementById('inf-semestre').textContent =(userData.Semestre !== null && userData.Semestre !== undefined) ?  userData.Semestre + 'º Semestre': '';

        // Prellenar los campos del modal de edición
        document.getElementById('editar-nombre').value = userData.Nombre;
        document.getElementById('editar-apellido').value = userData.Apellido;
        document.getElementById('editar-telefono').value = (userData.Telefono !== null && userData.Telefono !== undefined) ? userData.Telefono : '';
        document.getElementById('editar-semestre').value = userData.Semestre;

        // Mostrar los proyectos seleccionados y sus justificaciones
        const proyectosSeleccionados = [
            { id: userData.P1, justificacion: userData.R1 },
            { id: userData.P2, justificacion: userData.R2 },
            { id: userData.P3, justificacion: userData.R3 }
        ];

        const projectCards = document.querySelectorAll('.project-card');
        
        // Limpiar los contenidos anteriores
        projectCards.forEach(card => {
            card.querySelector('h4').textContent = '';
            card.querySelector('p').textContent = '';
        });

        for (let i = 0; i < proyectosSeleccionados.length; i++) {
            const proyecto = proyectosSeleccionados[i];
            if (proyecto.id && proyecto.justificacion) {
                const projectDoc = await getDoc(doc(db, "Proyectos", proyecto.id));
                if (projectDoc.exists()) {
                    const projectData = projectDoc.data();

                    // Colocar los datos en las tarjetas de proyecto
                    projectCards[i].querySelector('h4').textContent = projectData.Nombre;
                    projectCards[i].querySelector('p').textContent = proyecto.justificacion;
                }
            }
        }
    } else {
        console.error("No se encontró un documento de usuario con la UID proporcionada.");
    }
}

// Funcionalidad para abrir y cerrar la ventana modal de edición
const modal = document.getElementById("modal-editar-perfil");
const btnEditarPerfil = document.getElementById("editar-perfil");

btnEditarPerfil.onclick = function() {
    modal.style.display = "block";
}

document.getElementById('cancelar-edicion').onclick = function() {
    modal.style.display = "none";
}

// Funcionalidad para guardar los cambios en el perfil del usuario
document.getElementById('editar-perfil-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const nuevoNombre = document.getElementById('editar-nombre').value;
    const nuevoApellido = document.getElementById('editar-apellido').value;
    const nuevoTelefono = document.getElementById('editar-telefono').value;
    const nuevoSemestre = document.getElementById('editar-semestre').value;

    try {
        const userDocRef = doc(db, "Usuarios", auth.currentUser.uid);
        await updateDoc(userDocRef, {
            Nombre: nuevoNombre,
            Apellido: nuevoApellido,
            Telefono: nuevoTelefono,
            Semestre: nuevoSemestre
        });

        // Actualizar la interfaz con los nuevos datos
        document.getElementById('inf-nombre').textContent = nuevoNombre;
        document.getElementById('inf-apellido').textContent = nuevoApellido;
        document.getElementById('inf-telefono').textContent = (nuevoTelefono !== null && nuevoTelefono !== undefined) ? nuevoTelefono : '';
        document.getElementById('inf-semestre').textContent = nuevoSemestre + 'º Semestre';

        // Cerrar la ventana modal
        modal.style.display = "none";

        console.log("Perfil actualizado con éxito.");
    } catch (error) {
        console.error("Error al actualizar el perfil: ", error);
        alert("Hubo un error al actualizar el perfil. Por favor, inténtalo de nuevo.");
    }
});