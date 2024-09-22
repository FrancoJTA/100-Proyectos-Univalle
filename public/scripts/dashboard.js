import { db, collection, getDocs, query, where, getDoc, onAuthStateChanged, updateDoc, doc, auth, signOut, addDoc, deleteDoc } from './api-firebase.js';


onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        console.log("Usuario autenticado y verificado.");
        
        // Verificar el rol del usuario
        const userDocRef = doc(db, "Usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Si el usuario es un administrador, redirigir a la página de soporte
            if (userData.Rol === "Estudiante") {
                window.location.href = 'profile';
                return; // Detener la ejecución del código en esta página
            }else{
                cargarDatosYGenerarTabla();
            }
            
            // Si no es administrador, continuar con la carga de proyectos
            } else {
            console.error("No se encontraron datos de usuario. Contacte al administrador.");
        }

    } else {
        window.location.href = '/';
    }
});

let estudiantesCache = [];
let proyectosCache = [];
let seleccionActual = {
    area: null,
    tipo: null,
    especialidad: null
};

// Variables para almacenar los datos originales
let datosOriginales = {
    area: null,
    tipo: null,
    especialidad: null
};



// Función para cargar los estudiantes y proyectos, y luego generar la tabla y mostrar el contador
async function cargarDatosYGenerarTabla() {
    try {


        
        const estudiantesSnapshot = await getDocs(query(collection(db, "Usuarios"), where("Rol", "==", "Estudiante"), where("P1", "!=", null)));
        estudiantesCache = estudiantesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const proyectosSnapshot = await getDocs(collection(db, "Proyectos"));
        proyectosCache = proyectosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // const usuariosResponse = await fetch('../scripts/Usuarios.json');
        // const usuariosCache = await usuariosResponse.json();

        // estudiantesCache = usuariosCache
        //     .filter(usuario => usuario.Rol === "Estudiante" && usuario.P1 !== null)
        //     .map((doc, index) => ({ id: index.toString(), ...doc }));  // id basado en el índice, convertido a string para simular el id de Firebase

        // const proyectosResponse = await fetch('../scripts/Proyectos.json');
        // const proyectosCacheJson = await proyectosResponse.json();

        // proyectosCache = proyectosCacheJson.map((doc, index) => ({ id: index.toString(), ...doc }));

       
       // Mostrar el contador de estudiantes
        contarEstudiantesConProyectos();
        generarTablaProyectos();
        // Generar la tabla de estudiantes
        generarTablaEstudiantes();

        // Inicializar el dashboard
        inicializarDashboard();

    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
}

document.getElementById('cerrar-sesion').addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Sesión cerrada con éxito.");
        window.location.href = '/'; // Redirige a la página de login
    }).catch((error) => {
        console.error("Error al cerrar sesión: ", error);
    });
});


//------------------------tabla proyectos
function generarTablaProyectos() {
    // Limpiar el cuerpo de la tabla antes de llenarla
    const tbody = document.getElementById('project-tbody');
    tbody.innerHTML = '';

    // Llenar la tabla con los datos de proyectos
    proyectosCache.forEach(proyecto => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${proyecto.Nombre}</td>
            <td>${proyecto["Especialidades Requeridas"]}</td>
            <td>${proyecto.Descripción}</td>
            <td>${proyecto["Tiempo de Desarrollo"]}</td>
            <td>${proyecto["Tipo de Aplicación"]}</td>
            <td>${proyecto.Área}</td>
            <td>${proyecto.Objetivos}</td>
            <td>${proyecto.Estado}</td>
            <td>${proyecto.Integrantes}</td>
            <td>
                <button class="circular-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="circular-btn delete-btn"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;

        // Agregar event listeners para los botones de editar y eliminar
        tr.querySelector('.edit-btn').addEventListener('click', () => editarProyecto(proyecto.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => eliminarProyecto(proyecto.id));

        tbody.appendChild(tr);
    });
    llenarSelectoresProyectos();
    inicializarSeleccionOtro();
    inicializarEspecialidades();
}

//filtrar la tabla
function buscarproyectocrud() {
    const nombreProyecto = document.getElementById('project-search-input').value.toLowerCase();
    
    const proyectosFiltrados = proyectosCache.filter(proyecto => 
        proyecto.Nombre.toLowerCase().includes(nombreProyecto)
    );

    // Actualizar la tabla con los proyectos filtrados
    const tbody = document.getElementById('project-tbody');
    tbody.innerHTML = ''; // Limpiar el cuerpo de la tabla antes de llenarlo

    proyectosFiltrados.forEach(proyecto => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${proyecto.Nombre}</td>
            <td>${proyecto["Especialidades Requeridas"]}</td>
            <td>${proyecto.Descripción}</td>
            <td>${proyecto["Tiempo de Desarrollo"]}</td>
            <td>${proyecto["Tipo de Aplicación"]}</td>
            <td>${proyecto.Área}</td>
            <td>${proyecto.Objetivos}</td>
            <td>${proyecto.Estado}</td>
            <td>${proyecto.Integrantes}</td>
            <td>
                <button class="circular-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="circular-btn delete-btn"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;

        // Agregar event listeners para los botones de editar y eliminar
        tr.querySelector('.edit-btn').addEventListener('click', () => editarProyecto(proyecto.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => eliminarProyecto(proyecto.id));

        tbody.appendChild(tr);
    });
}

function llenarSelectoresProyectos() {
    const tiposAplicacion = obtenerValoresUnicos(proyectosCache, "Tipo de Aplicación");
    const areas = obtenerValoresUnicos(proyectosCache, "Área");

    const agregarTipoSelect = document.getElementById('agregar-tipo');
    const editarTipoSelect = document.getElementById('editar-tipo');
    const agregarAreaSelect = document.getElementById('agregar-area');
    const editarAreaSelect = document.getElementById('editar-area');

    // Limpiar opciones existentes
    agregarTipoSelect.innerHTML = '';
    editarTipoSelect.innerHTML = '';
    agregarAreaSelect.innerHTML = '';
    editarAreaSelect.innerHTML = '';

    // Llenar opciones de Tipo de Aplicación
    tiposAplicacion.forEach(tipo => {
        const option = `<option value="${tipo}">${tipo}</option>`;
        agregarTipoSelect.innerHTML += option;
        editarTipoSelect.innerHTML += option;
    });

    // Llenar opciones de Área
    areas.forEach(area => {
        const option = `<option value="${area}">${area}</option>`;
        agregarAreaSelect.innerHTML += option;
        editarAreaSelect.innerHTML += option;
    });

    // Agregar opción "Otro"
    agregarTipoSelect.innerHTML += '<option value="Otro">Otro</option>';
    editarTipoSelect.innerHTML += '<option value="Otro">Otro</option>';
    agregarAreaSelect.innerHTML += '<option value="Otro">Otro</option>';
    editarAreaSelect.innerHTML += '<option value="Otro">Otro</option>';
}

function manejarSeleccionOtro(selectElement, inputElement) {
    selectElement.addEventListener('change', function() {
        if (this.value === 'Otro') {
            inputElement.style.display = 'block';
            inputElement.required = true;
            inputElement.focus(); // Coloca el foco en el input de texto
        } else {
            inputElement.style.display = 'none';
            inputElement.required = false;
            inputElement.value = ''; // Limpia el campo si se cambia a otra opción
        }
    });

    inputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir que el formulario se envíe si es el caso
            const newOptionValue = inputElement.value.trim();
            if (newOptionValue) {
                // Crear una nueva opción en el select con el valor del input
                const newOption = document.createElement('option');
                newOption.value = newOptionValue;
                newOption.text = newOptionValue;
                newOption.selected = true;

                selectElement.appendChild(newOption);

                // Ocultar el input de texto y limpiar su valor
                inputElement.style.display = 'none';
                inputElement.required = false;
                inputElement.value = '';

                // Seleccionar automáticamente la nueva opción en el select
                selectElement.value = newOptionValue;
            }
        }
    });
}

function inicializarSeleccionOtro() {
    manejarSeleccionOtro(document.getElementById('agregar-tipo'), document.getElementById('agregar-tipo-otro'));
    manejarSeleccionOtro(document.getElementById('editar-tipo'), document.getElementById('editar-tipo-otro'));
    manejarSeleccionOtro(document.getElementById('agregar-area'), document.getElementById('agregar-area-otro'));
    manejarSeleccionOtro(document.getElementById('editar-area'), document.getElementById('editar-area-otro'));
}

// Función para mostrar el modal y prellenar el formulario con los datos del proyecto a editar
function editarProyecto(id) {
    const proyecto = proyectosCache.find(proyecto => proyecto.id === id);

    // Prellenar el formulario con los datos del proyecto
    document.getElementById('editar-id').value = proyecto.id;
    document.getElementById('editar-nombre').value = proyecto.Nombre;

    // Actualizar las burbujas de especialidades
    const especialidades = proyecto["Especialidades Requeridas"].split(',').map(e => e.trim());
    const containerElement = document.getElementById('editar-especialidades-container');
    containerElement.innerHTML = ''; // Limpiar las burbujas anteriores
    especialidades.forEach(especialidad => {
        agregarEspecialidadBurbujas(containerElement, especialidad);
    });

    document.getElementById('editar-descripcion').value = proyecto.Descripción;
    document.getElementById('editar-tiempo').value = proyecto["Tiempo de Desarrollo"];
    
    // Manejar tipo de aplicación y área
    const tipoAplicacion = proyecto["Tipo de Aplicación"];
    const area = proyecto.Área;

    const editarTipoSelect = document.getElementById('editar-tipo');
    const editarAreaSelect = document.getElementById('editar-area');
    const editarTipoOtro = document.getElementById('editar-tipo-otro');
    const editarAreaOtro = document.getElementById('editar-area-otro');

    // Configurar Tipo de Aplicación
    if ([...editarTipoSelect.options].some(option => option.value === tipoAplicacion)) {
        editarTipoSelect.value = tipoAplicacion;
        editarTipoOtro.style.display = 'none';
    } else {
        editarTipoSelect.value = 'Otro';
        editarTipoOtro.value = tipoAplicacion;
        editarTipoOtro.style.display = 'block';
    }

    // Configurar Área
    if ([...editarAreaSelect.options].some(option => option.value === area)) {
        editarAreaSelect.value = area;
        editarAreaOtro.style.display = 'none';
    } else {
        editarAreaSelect.value = 'Otro';
        editarAreaOtro.value = area;
        editarAreaOtro.style.display = 'block';
    }

    document.getElementById('editar-objetivos').value = proyecto.Objetivos;
    document.getElementById('editar-estado').value = proyecto.Estado;
    document.getElementById('editar-integrantes').value = proyecto.Integrantes;

    // Mostrar el modal de edición
    document.getElementById('modal-editar-proyecto').style.display = 'block';
}
// Función para eliminar un proyecto
function eliminarProyecto(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        // Referencia al documento que se desea eliminar en Firestore
        const docRef = doc(db, "Proyectos", id);
        
        // Eliminar el documento en Firestore
        deleteDoc(docRef)
            .then(() => {
                console.log("Proyecto eliminado con éxito.");
                
                // Remover el proyecto del cache local
                proyectosCache = proyectosCache.filter(proyecto => proyecto.id !== id);
                
                // Recargar la tabla con los datos actualizados
                generarTablaProyectos();
                reiniciarGraficos();
                actualizarTablaConFiltro();
            })
            .catch((error) => {
                console.error("Error al eliminar el proyecto:", error);
            });
    }
}


// Mostrar modal para agregar proyecto
document.getElementById('add-project-btn').addEventListener('click', () => {
    document.getElementById('modal-agregar-proyecto').style.display = 'block';
});

// Ocultar modal de agregar proyecto
document.getElementById('cancelar-agregar').addEventListener('click', () => {
    document.getElementById('modal-agregar-proyecto').style.display = 'none';
});

// Funcionalidad para agregar proyecto
document.getElementById('agregar-proyecto-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Obtener las especialidades desde el contenedor de burbujas
    const especialidades = document.getElementById('agregar-especialidades-container').dataset.especialidades;

    // Crear un nuevo objeto de proyecto con los datos del formulario
    const nuevoProyecto = {
        Nombre: document.getElementById('agregar-nombre').value,
        "Especialidades Requeridas": especialidades,
        Descripción: document.getElementById('agregar-descripcion').value,
        "Tiempo de Desarrollo": document.getElementById('agregar-tiempo').value,
        "Tipo de Aplicación": document.getElementById('agregar-tipo').value,
        Área: document.getElementById('agregar-area').value,
        Objetivos: document.getElementById('agregar-objetivos').value,
        Estado: document.getElementById('agregar-estado').value,
        Integrantes: document.getElementById('agregar-integrantes').value,
    };

    try {
        // Guardar en Firestore y obtener la referencia del documento agregado
        const docRef = await addDoc(collection(db, "Proyectos"), nuevoProyecto);
        
        // Añadir el proyecto al cache local con su ID
        proyectosCache.push({ id: docRef.id, ...nuevoProyecto });

        // Recargar la tabla con los nuevos datos
        generarTablaProyectos();
        reiniciarGraficos();
        actualizarTablaConFiltro();

        // Cerrar el modal de agregar
        document.getElementById('modal-agregar-proyecto').style.display = 'none';
    } catch (error) {
        console.error("Error al agregar el proyecto:", error);
    }
});

// Ocultar modal de editar proyecto
document.getElementById('cancelar-editar').addEventListener('click', () => {
    document.getElementById('modal-editar-proyecto').style.display = 'none';
});

// Funcionalidad para guardar los cambios en el proyecto
document.getElementById('editar-proyecto-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Obtener el ID del proyecto a editar
    const id = document.getElementById('editar-id').value;
    // Obtener las especialidades desde el contenedor de burbujas
    const especialidades = document.getElementById('editar-especialidades-container').dataset.especialidades;

    // Crear un objeto de proyecto actualizado con los datos del formulario
    const proyectoActualizado = {
        Nombre: document.getElementById('editar-nombre').value,
        "Especialidades Requeridas": especialidades,
        Descripción: document.getElementById('editar-descripcion').value,
        "Tiempo de Desarrollo": document.getElementById('editar-tiempo').value,
        "Tipo de Aplicación": document.getElementById('editar-tipo').value,
        Área: document.getElementById('editar-area').value,
        Objetivos: document.getElementById('editar-objetivos').value,
        Estado: document.getElementById('editar-estado').value,
        Integrantes: document.getElementById('editar-integrantes').value,
    };

    try {
        // Referencia al documento que se actualizará
        const docRef = doc(db, "Proyectos", id);
        // Actualizar el proyecto en Firestore
        await updateDoc(docRef, proyectoActualizado);

        // Actualizar el proyecto en el cache local
        proyectosCache = proyectosCache.map(proyecto => 
            proyecto.id === id ? { id, ...proyectoActualizado } : proyecto
        );

        // Recargar la tabla con los nuevos datos
        generarTablaProyectos();
        reiniciarGraficos();
        actualizarTablaConFiltro();

        // Cerrar el modal de edición
        document.getElementById('modal-editar-proyecto').style.display = 'none';
    } catch (error) {
        console.error("Error al actualizar el proyecto:", error);
    }
});


function inicializarEspecialidades() {
    const agregarContainer = document.getElementById('agregar-especialidades-container');
    const editarContainer = document.getElementById('editar-especialidades-container');

    const agregarSelector = document.getElementById('agregar-especialidades-selector');
    const editarSelector = document.getElementById('editar-especialidades-selector');

    const agregarOtroInput = document.getElementById('agregar-especialidades-otro');
    const editarOtroInput = document.getElementById('editar-especialidades-otro');

    // Llenar los selectores con las especialidades únicas
    const especialidadesUnicas = obtenerEspecialidadesUnicas(proyectosCache);
    llenarSelectorEspecialidades(agregarSelector, especialidadesUnicas);
    llenarSelectorEspecialidades(editarSelector, especialidadesUnicas);

    manejarSeleccionEspecialidades(agregarSelector, agregarOtroInput, agregarContainer);
    manejarSeleccionEspecialidades(editarSelector, editarOtroInput, editarContainer);
}


function llenarSelectorEspecialidades(selectorElement, especialidades) {
    selectorElement.innerHTML = ''; // Limpiar el selector
    especialidades.forEach(especialidad => {
        const option = document.createElement('option');
        option.value = especialidad;
        option.textContent = especialidad;
        selectorElement.appendChild(option);
    });
    // Agregar la opción "Otro"
    const otroOption = document.createElement('option');
    otroOption.value = 'Otro';
    otroOption.textContent = 'Otro';
    selectorElement.appendChild(otroOption);
}


// Función para manejar la selección de especialidades
function manejarSeleccionEspecialidades(selectorElement, otroInputElement, containerElement) {
    selectorElement.addEventListener('change', function() {
        if (this.value === 'Otro') {
            otroInputElement.style.display = 'block';
            otroInputElement.focus();
        } else if (!especialidadYaAgregada(containerElement, this.value)) {
            agregarEspecialidadBurbujas(containerElement, this.value);
            this.value = ''; // Resetear el selector
        }
    });

    otroInputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento predeterminado de Enter
            const especialidad = otroInputElement.value.trim();
            if (especialidad && !especialidadYaAgregada(containerElement, especialidad)) {
                agregarEspecialidadBurbujas(containerElement, especialidad); // Agregar como nueva burbuja
                otroInputElement.value = ''; // Limpiar el campo
                otroInputElement.style.display = 'none'; // Esconder el input
                selectorElement.value = ''; // Resetear el selector
            }
        }
    });
}



// Función para verificar si una especialidad ya ha sido agregada
function especialidadYaAgregada(containerElement, especialidad) {
    return Array.from(containerElement.querySelectorAll('.burbuja'))
        .some(burbuja => burbuja.textContent.replace('×', '').trim() === especialidad);
}
// Función para agregar burbujas de especialidades
function agregarEspecialidadBurbujas(containerElement, especialidad) {
    if (!especialidad) return;

    // Crear una nueva burbuja
    const burbuja = document.createElement('div');
    burbuja.classList.add('burbuja');
    burbuja.textContent = especialidad;

    // Crear el botón de eliminar para la burbuja
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.classList.add('remove-btn');
    removeBtn.addEventListener('click', () => {
        burbuja.remove();
        actualizarEspecialidadesInput(containerElement);
    });

    burbuja.appendChild(removeBtn);
    containerElement.appendChild(burbuja);

    // Actualizar el dataset con las especialidades actuales
    actualizarEspecialidadesInput(containerElement);
}

// Función para actualizar el input con las especialidades seleccionadas
function actualizarEspecialidadesInput(containerElement) {
    const especialidades = Array.from(containerElement.querySelectorAll('.burbuja'))
        .map(burbuja => burbuja.textContent.replace('×', '').trim());
    containerElement.dataset.especialidades = especialidades.join(', '); // Guardar como atributo de datos
}





// '''''''''''''''''''''''''''''' coso

function filtrarEstudiantesYProyectos() {
    let proyectosFiltrados = proyectosCache;
    let estudiantesFiltrados = [];

    if (seleccionActual.area) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto.Área === seleccionActual.area);
    }
    if (seleccionActual.tipo) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto["Tipo de Aplicación"] === seleccionActual.tipo);
    }
    if (seleccionActual.especialidad) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto["Especialidades Requeridas"] && proyecto["Especialidades Requeridas"].includes(seleccionActual.especialidad));
    }

    // Filtrar estudiantes que tengan proyectos dentro de proyectosFiltrados
    estudiantesFiltrados = estudiantesCache.filter(estudiante => {
        return ["P1", "P2", "P3"].some(pKey => {
            return proyectosFiltrados.some(proyecto => proyecto.id === estudiante[pKey]);
        });
    });

    return { estudiantesFiltrados, proyectosFiltrados };
}


function obtenerProyectoDesdeCache(uid) {
    const proyecto = proyectosCache.find(p => p.id === uid);
    if (proyecto) {
        return { nombre: proyecto.Nombre, justificacion: proyecto.Justificacion || "Justificación no disponible" };
    } else {
        return { nombre: "Proyecto no encontrado", justificacion: "Justificación no disponible" };
    }
}

function buscarPorNombre() {
    const nombre = document.getElementById('name-find').value.toLowerCase();
    const estudiantesFiltrados = estudiantesCache.filter(estudiante => estudiante.Nombre.toLowerCase().includes(nombre));

    actualizarTablaFiltrada(estudiantesFiltrados);
}

function buscarPorApellido() {
    const apellido = document.getElementById('lastname-find').value.toLowerCase();
    const estudiantesFiltrados = estudiantesCache.filter(estudiante => estudiante.Apellido.toLowerCase().includes(apellido));

    actualizarTablaFiltrada(estudiantesFiltrados);
}

function buscarPorNombreProyecto() {
    const nombreProyecto = document.getElementById('proyectname-find').value.toLowerCase();
    const proyectosFiltrados = proyectosCache.filter(proyecto => proyecto.Nombre.toLowerCase().includes(nombreProyecto));

    const estudiantesFiltrados = estudiantesCache.filter(estudiante => {
        return ["P1", "P2", "P3"].some(pKey => {
            return proyectosFiltrados.some(proyecto => proyecto.id === estudiante[pKey]);
        });
    });

    actualizarTablaFiltrada(estudiantesFiltrados, proyectosFiltrados);
}


// Función para mostrar el modal con la información del estudiante
async function mostrarModalEstudiante(estudianteId) {
    const estudiante = estudiantesCache.find(est => est.id === estudianteId);

    if (estudiante) {
        // Obtener el correo electrónico del estudiante desde Firebase Authentication

        // Rellenar los campos del modal con la información del estudiante
        document.getElementById('modal-apellido-estudiante-unico').innerText = estudiante.Apellido;
        document.getElementById('modal-nombre-estudiante-unico').innerText = estudiante.Nombre;
        document.getElementById('modal-semestre-estudiante-unico').innerText = (estudiante.Semestre !== null && estudiante.Semestre !== undefined) ? estudiante.Semestre : '';
        document.getElementById('modal-telefono-estudiante-unico').innerText =  (estudiante.Telefono !== null && estudiante.Telefono !== undefined) ? estudiante.Telefono : '';

        // Mostrar el modal
        const modal = document.getElementById('modal-detalles-estudiante-unico');
        modal.style.display = 'block';
    }
}

// Función para cerrar el modal
document.getElementById('cerrar-modal-estudiante-unico').addEventListener('click', () => {
    document.getElementById('modal-detalles-estudiante-unico').style.display = 'none';
});

// Agregar event listener a las filas de la tabla de estudiantes
function agregarListenersTablaEstudiantes() {
    const filas = document.querySelectorAll('#tablaEstudiantes tbody tr');
    filas.forEach(fila => {
        fila.addEventListener('click', () => {
            const estudianteId = fila.dataset.id; // Asegúrate de que la fila tenga el ID del estudiante
            mostrarModalEstudiante(estudianteId);
        });
    });
}

// Función para cerrar el modal
document.getElementById('cerrar-modal-estudiante-unico').addEventListener('click', () => {
    document.getElementById('modal-detalles-estudiante-unico').style.display = 'none';
});


function actualizarTablaFiltrada(estudiantes, proyectos = proyectosCache) {
    let tablaHTML = `
        <div class="tabla-estudiantes-container">
            <table class="tabla-estudiantes">
                <thead>
                    <tr>
                        <th>Estudiante</th>
                        <th>Proyecto</th>
                        <th>Justificación</th>
                    </tr>
                </thead>
                <tbody>
    `;

    estudiantes.forEach(estudiante => {
        const proyectosDelEstudiante = ["P1", "P2", "P3"].map((pKey, index) => {
            const proyecto = obtenerProyectoDesdeCache(estudiante[pKey]);
            return {
                proyecto: proyecto.nombre,
                justificacion: estudiante[`R${index + 1}`] || 'Justificación no disponible',
                id: estudiante[pKey]  // Almacenamos el id del proyecto
            };
        }).filter(proy => proyectos.some(p => p.id === proy.id)); // Filtramos los proyectos según los filtrados

        if (proyectosDelEstudiante.length > 0) {
            proyectosDelEstudiante.forEach((proy, index) => {
                if (index === 0) {
                    tablaHTML += `
                        <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                            <td class="nombre-estudiante" rowspan="${proyectosDelEstudiante.length}">${estudiante.Nombre} ${estudiante.Apellido}</td>
                            <td class="proyecto-estudiante">- ${proy.proyecto}</td>
                            <td class="justificacion-proyecto">${proy.justificacion}</td>
                        </tr>
                    `;
                } else {
                    tablaHTML += `
                        <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                            <td class="proyecto-estudiante">- ${proy.proyecto}</td>
                            <td class="justificacion-proyecto">${proy.justificacion}</td>
                        </tr>
                    `;
                }
            });
        }
    });

    tablaHTML += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('tablaEstudiantes').innerHTML = tablaHTML;
    agregarListenersTablaEstudiantes();
}

function generarTablaEstudiantes() {
    let tablaHTML = `
        <div class="tabla-estudiantes-container">
            <table class="tabla-estudiantes">
                <thead>
                    <tr>
                        <th>Estudiante</th>
                        <th>Proyecto</th>
                        <th>Justificación</th>
                    </tr>
                </thead>
                <tbody>
    `;

    estudiantesCache.forEach(estudiante => {
        const proyecto1 = obtenerProyectoDesdeCache(estudiante.P1);
        const proyecto2 = obtenerProyectoDesdeCache(estudiante.P2);
        const proyecto3 = obtenerProyectoDesdeCache(estudiante.P3);

        tablaHTML += `
            <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                <td class="nombre-estudiante" rowspan="3">${estudiante.Nombre} ${estudiante.Apellido}</td>
                <td class="proyecto-estudiante">- ${proyecto1.nombre}</td>
                <td class="justificacion-proyecto">${estudiante.R1 || 'Justificación no disponible'}</td>
            </tr>
            <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                <td class="proyecto-estudiante">- ${proyecto2.nombre}</td>
                <td class="justificacion-proyecto">${estudiante.R2 || 'Justificación no disponible'}</td>
            </tr>
            <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                <td class="proyecto-estudiante">- ${proyecto3.nombre}</td>
                <td class="justificacion-proyecto">${estudiante.R3 || 'Justificación no disponible'}</td>
            </tr>
        `;
    });

    tablaHTML += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('tablaEstudiantes').innerHTML = tablaHTML;
    agregarListenersTablaEstudiantes();
}


function actualizarTablaConFiltro() {
    const { estudiantesFiltrados, proyectosFiltrados } = filtrarEstudiantesYProyectos();
    
    let tablaHTML = `
        <div class="tabla-estudiantes-container">
            <table class="tabla-estudiantes">
                <thead>
                    <tr>
                        <th>Estudiante</th>
                        <th>Proyecto</th>
                        <th>Justificación</th>
                    </tr>
                </thead>
                <tbody>
    `;

    estudiantesFiltrados.forEach(estudiante => {
        // Mapeamos los proyectos del estudiante y obtenemos la justificación correspondiente
        const proyectosDelEstudiante = ["P1", "P2", "P3"].map((pKey, index) => {
            const proyecto = obtenerProyectoDesdeCache(estudiante[pKey]);
            return {
                proyecto: proyecto.nombre,
                justificacion: estudiante[`R${index + 1}`] || 'Justificación no disponible',
                id: estudiante[pKey]
            };
        }).filter(proy => proyectosFiltrados.some(p => p.id === proy.id)); // Filtramos solo los proyectos que están en proyectosFiltrados

        if (proyectosDelEstudiante.length > 0) {
            proyectosDelEstudiante.forEach((proy, index) => {
                if (index === 0) {
                    tablaHTML += `
                        <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                            <td class="nombre-estudiante" rowspan="${proyectosDelEstudiante.length}">${estudiante.Nombre} ${estudiante.Apellido}</td>
                            <td class="proyecto-estudiante">- ${proy.proyecto}</td>
                            <td class="justificacion-proyecto">${proy.justificacion}</td>
                        </tr>
                    `;
                } else {
                    tablaHTML += `
                        <tr data-id="${estudiante.id}"> <!-- Agrega el atributo data-id aquí -->
                            <td class="proyecto-estudiante">- ${proy.proyecto}</td>
                            <td class="justificacion-proyecto">${proy.justificacion}</td>
                        </tr>
                    `;
                }
            });
        }
    });

    tablaHTML += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('tablaEstudiantes').innerHTML = tablaHTML;
    agregarListenersTablaEstudiantes();
}

function contarEstudiantesConProyectos() {
    const totalEstudiantes = estudiantesCache.length;
    document.getElementById('total-projects').textContent = totalEstudiantes;
}

async function inicializarDashboard() {
    try {
        // Generar listas únicas de Áreas, Tipos y Especialidades
        const areasUnicas = obtenerValoresUnicos(proyectosCache, "Área");
        const tiposUnicos = obtenerValoresUnicos(proyectosCache, "Tipo de Aplicación");
        const especialidadesUnicas = obtenerEspecialidadesUnicas(proyectosCache);

        // Guardar los datos originales para reiniciar más adelante
        datosOriginales.area = contarSelecciones(estudiantesCache, proyectosCache, "Área", areasUnicas);
        datosOriginales.tipo = contarSelecciones(estudiantesCache, proyectosCache, "Tipo de Aplicación", tiposUnicos);
        datosOriginales.especialidad = contarEspecialidades(estudiantesCache, proyectosCache, especialidadesUnicas);

        // Generar gráficos
        generarGrafico("myChart", datosOriginales.area, filtrarPorArea);
        generarGrafico("myChart1", datosOriginales.tipo, filtrarPorTipo);
        generarGrafico("myChart2", datosOriginales.especialidad, filtrarPorEspecialidad);

    } catch (error) {
        console.error("Error al inicializar el dashboard:", error);
    }
}

// Función para obtener valores únicos de una propiedad específica
function obtenerValoresUnicos(dataArray, propiedad) {
    const valoresSet = new Set();
    dataArray.forEach(item => {
        const valor = item[propiedad];
        if (valor) {
            valoresSet.add(valor);
        }
    });
    return Array.from(valoresSet);
}

function filtrarProyectos() {
    let proyectosFiltrados = proyectosCache;

    if (seleccionActual.area) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto.Área === seleccionActual.area);
    }
    if (seleccionActual.tipo) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto["Tipo de Aplicación"] === seleccionActual.tipo);
    }
    if (seleccionActual.especialidad) {
        proyectosFiltrados = proyectosFiltrados.filter(proyecto => proyecto["Especialidades Requeridas"] && proyecto["Especialidades Requeridas"].includes(seleccionActual.especialidad));
    }

    return proyectosFiltrados;
}

function filtrarPorArea(area, color) {
    seleccionActual.area = area;

    const proyectosFiltrados = filtrarProyectos();
    const conteoTiposFiltrados = contarSelecciones(estudiantesCache, proyectosFiltrados, "Tipo de Aplicación", obtenerValoresUnicos(proyectosFiltrados, "Tipo de Aplicación"));
    const conteoEspecialidadesFiltradas = contarEspecialidades(estudiantesCache, proyectosFiltrados, obtenerEspecialidadesUnicas(proyectosFiltrados));

    console.log("Filtro por Área:", area, " - Tipos Filtrados:", conteoTiposFiltrados, " - Especialidades Filtradas:", conteoEspecialidadesFiltradas);

    actualizarGrafico("myChart1", conteoTiposFiltrados);
    actualizarGrafico("myChart2", conteoEspecialidadesFiltradas);

    // Actualizar también las leyendas para reflejar el filtro aplicado
    actualizarLeyendas("myChart", [area], [color]);
}

function filtrarPorTipo(tipo, color) {
    seleccionActual.tipo = tipo;

    const proyectosFiltrados = filtrarProyectos();
    const conteoAreasFiltradas = contarSelecciones(estudiantesCache, proyectosFiltrados, "Área", obtenerValoresUnicos(proyectosFiltrados, "Área"));
    const conteoEspecialidadesFiltradas = contarEspecialidades(estudiantesCache, proyectosFiltrados, obtenerEspecialidadesUnicas(proyectosFiltrados));

    console.log("Filtro por Tipo:", tipo, " - Áreas Filtradas:", conteoAreasFiltradas, " - Especialidades Filtradas:", conteoEspecialidadesFiltradas);

    actualizarGrafico("myChart", conteoAreasFiltradas);
    actualizarGrafico("myChart2", conteoEspecialidadesFiltradas);

    // Actualizar también las leyendas para reflejar el filtro aplicado
    actualizarLeyendas("myChart1", [tipo], [color]);
}

function filtrarPorEspecialidad(especialidad, color) {
    seleccionActual.especialidad = especialidad;

    const proyectosFiltrados = filtrarProyectos();
    const conteoAreasFiltradas = contarSelecciones(estudiantesCache, proyectosFiltrados, "Área", obtenerValoresUnicos(proyectosFiltrados, "Área"));
    const conteoTiposFiltrados = contarSelecciones(estudiantesCache, proyectosFiltrados, "Tipo de Aplicación", obtenerValoresUnicos(proyectosFiltrados, "Tipo de Aplicación"));

    console.log("Filtro por Especialidad:", especialidad, " - Áreas Filtradas:", conteoAreasFiltradas, " - Tipos Filtrados:", conteoTiposFiltrados);

    actualizarGrafico("myChart", conteoAreasFiltradas);
    actualizarGrafico("myChart1", conteoTiposFiltrados);

    // Actualizar también las leyendas para reflejar el filtro aplicado
    actualizarLeyendas("myChart2", [especialidad], [color]);
}

// Función para obtener todas las especialidades únicas
function obtenerEspecialidadesUnicas(proyectos) {
    const especialidadesSet = new Set();
    proyectos.forEach(proyecto => {
        const especialidades = proyecto["Especialidades Requeridas"];
        if (especialidades) {
            const listaEspecialidades = especialidades.split(',').map(e => e.trim());
            listaEspecialidades.forEach(especialidad => especialidadesSet.add(especialidad));
        }
    });
    return Array.from(especialidadesSet);
}

// Función para contar selecciones de Áreas y Tipos
function contarSelecciones(estudiantes, proyectos, propiedad, valoresUnicos) {
    const conteo = {};
    valoresUnicos.forEach(valor => conteo[valor] = 0);

    estudiantes.forEach(estudiante => {
        ["P1", "P2", "P3"].forEach(pKey => {
            const proyectoID = estudiante[pKey];
            const proyecto = proyectos.find(p => p.id === proyectoID);
            if (proyecto && proyecto[propiedad]) {
                const valor = proyecto[propiedad];
                if (conteo.hasOwnProperty(valor)) {
                    conteo[valor]++;
                }
            }
        });
    });

    return conteo;
}

// Función para contar especialidades
function contarEspecialidades(estudiantes, proyectos, especialidadesUnicas) {
    const conteo = {};
    especialidadesUnicas.forEach(especialidad => conteo[especialidad] = 0);

    estudiantes.forEach(estudiante => {
        ["P1", "P2", "P3"].forEach(pKey => {
            const proyectoID = estudiante[pKey];
            const proyecto = proyectos.find(p => p.id === proyectoID);
            if (proyecto && proyecto["Especialidades Requeridas"]) {
                const especialidadesProyecto = proyecto["Especialidades Requeridas"].split(',').map(e => e.trim());
                especialidadesProyecto.forEach(especialidad => {
                    if (conteo.hasOwnProperty(especialidad)) {
                        conteo[especialidad]++;
                    }
                });
            }
        });
    });

    return conteo;
}

function generarGrafico(elementId, datos, onClickCallback) {
    const ctx = document.getElementById(elementId).getContext('2d');
    const chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(datos),
            datasets: [{    
                data: Object.values(datos),
                backgroundColor: generarColores(Object.keys(datos).length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10 // Añade espaciado interno en el gráfico
            },
            plugins: {
                legend: {
                    display: false // Oculta las leyendas dentro del gráfico
                }
            },
            cutout: '35%',
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const chart = elements[0].element.$context.chart;
                    const index = elements[0].index;
                    const label = chart.data.labels[index];
                    const color = chart.data.datasets[0].backgroundColor[index];

                    // Actualiza el gráfico seleccionado para mostrar solo el segmento clicado
                    chart.data.labels = [label];
                    chart.data.datasets[0].data = [chart.data.datasets[0].data[index]];
                    chart.data.datasets[0].backgroundColor = [color];
                    chart.update();

                    // Actualiza las leyendas para mostrar solo el segmento seleccionado
                    actualizarLeyendas(elementId, [label], [color]);

                    // Ejecuta la lógica de filtrado correspondiente para actualizar otros gráficos
                    onClickCallback(label, color);
                }
            },
            onHover: function(event, elements) {
                const targetElement = document.getElementById(elementId);
                if (elements.length) {
                    targetElement.style.cursor = 'pointer';
                } else {
                    targetElement.style.cursor = 'default';
                }
            }
        }
    });

    // Genera las leyendas iniciales con los datos
    document.getElementById(elementId)._chartInstance = chartInstance;

    if (chartInstance) {
        // Genera las leyendas iniciales con los datos
        actualizarLeyendas(elementId, chartInstance.data.labels, chartInstance.data.datasets[0].backgroundColor, chartInstance.data.datasets[0].data);
    } else {
        console.error(`No se pudo inicializar el gráfico para el elemento ${elementId}`);
    }
}

function actualizarLeyendas(elementId, labels, colors, data = null) {
    const legendContainer = document.getElementById(`${elementId}-legend`);
    const chartElement = document.getElementById(elementId);

    if (chartElement && chartElement._chartInstance) {
        // Si no se proporcionan datos, utilizar los datos de la instancia del gráfico
        const chartData = data || chartElement._chartInstance.data.datasets[0].data;

        legendContainer.innerHTML = labels
            .map((label, index) => {
                if (chartData[index] > 0) { // Solo incluir etiquetas con valores mayores a 0
                    return `
                        <div class="chart-legend-item">
                            <span class="chart-legend-color" style="background-color:${colors[index]};"></span>
                            <span class="chart-legend-label">${label}</span>
                        </div>
                    `;
                }
                return ''; // No incluir etiquetas con valor 0
            })
            .join('');

        // Aplicar la clase contenedora a la leyenda
        legendContainer.classList.add('chart-legend-container');
    }
}


function actualizarGrafico(elementId, datos) {
    const chartElement = document.getElementById(elementId);
    if (chartElement && chartElement._chartInstance) {
        const chart = chartElement._chartInstance;
        chart.data.labels = Object.keys(datos);
        chart.data.datasets[0].data = Object.values(datos);
        chart.data.datasets[0].backgroundColor = generarColores(chart.data.labels.length);
        chart.update();

        // Actualiza las leyendas después de actualizar el gráfico
        actualizarLeyendas(elementId, chart.data.labels, chart.data.datasets[0].backgroundColor);
    }
}

function generarColores(cantidad) {
    const colores = [];
    const saturacion = 65; // Saturación ajustada para colores más suaves
    const luminosidad = 60; // Luminosidad ajustada para evitar colores muy brillantes o muy oscuros

    for (let i = 0; i < cantidad; i++) {
        const hue = Math.floor((i * 360) / cantidad); // Distribuye los colores uniformemente en el espectro
        const color = `hsl(${hue}, ${saturacion}%, ${luminosidad}%)`;
        colores.push(color);
    }
    
    return colores;
}

function reiniciarGraficos() {
    actualizarGrafico("myChart", datosOriginales.area);
    actualizarGrafico("myChart1", datosOriginales.tipo);
    actualizarGrafico("myChart2", datosOriginales.especialidad);

    // Reiniciar selección actual
    seleccionActual.area = null;
    seleccionActual.tipo = null;
    seleccionActual.especialidad = null;
}

// Añadir el evento al botón de reinicio
document.getElementById('restart-btn').addEventListener('click', function() {
    reiniciarGraficos();
    actualizarTablaConFiltro();
    document.getElementById('lastname-find').value = '';
    document.getElementById('name-find').value = '';
    document.getElementById('proyectname-find').value = '';
});

document.getElementById('buscar-btn').addEventListener('click', function() {
    actualizarTablaConFiltro();
});

document.getElementById('buscar-nombre-btn').addEventListener('click', function() {
    buscarPorNombre();
});

// Asignar el evento al botón de buscar por apellido
document.getElementById('buscar-apellido-btn').addEventListener('click', function() {
    buscarPorApellido();
});

// Asignar el evento al botón de buscar por nombre de proyecto
document.getElementById('buscar-proyecto-btn').addEventListener('click', function() {
    buscarPorNombreProyecto();
});

document.getElementById('search-project-btn').addEventListener('click', buscarproyectocrud);
