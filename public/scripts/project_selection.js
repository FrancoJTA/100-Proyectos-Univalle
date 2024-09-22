import { db, auth, collection, getDocs, doc, getDoc, updateDoc, onAuthStateChanged } from './api-firebase.js';

//TODO: Verificar rol de session y mandar a admin si es admin
let proyectosCache = [];
// Verifica el estado de autenticación del usuario
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        console.log("Usuario autenticado y verificado.");
        
        const userDocRef = doc(db, "Usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.Rol === "Administrador") {
                window.location.href = 'admin';
                return;
            }
            
            // Cargar los proyectos una sola vez y almacenar en proyectosCache
            proyectosCache = await getProjectsFromFirestore();

            // Renderizar los proyectos y cargar los seleccionados
            renderProjects();
            await cargarProyectosSeleccionados(user.uid);
        } else {
            console.error("No se encontraron datos de usuario. Contacte al administrador.");
            window.location.href = '/';
        }

    } else {
        window.location.href = '/';
    }
});

// Función para obtener los proyectos de Firestore
async function getProjectsFromFirestore() {
    const projectsCollection = collection(db, "Proyectos");
    const projectsSnapshot = await getDocs(projectsCollection);
    return projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Función para renderizar los proyectos
function renderProjects() {
    const container = document.querySelector('.cards-container');
    container.innerHTML = ''; 

    proyectosCache.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = 'card project-item';
        projectCard.dataset.index = index;
        projectCard.dataset.id = project.id;
        
        projectCard.innerHTML = `
        <h3>${project["Nombre"]}</h3>
        <p><strong>Tipo de App:</strong> ${project["Tipo de Aplicación"]}</p>
        <p><strong>Área:</strong> ${project["Área"]}</p>`;
    
        if (selectedProjects.includes(project.id)) {
            projectCard.classList.add('selected');
        }

        projectCard.addEventListener('click', () => {
            showProjectDetails(project, index);
        });

        container.appendChild(projectCard);
    });

    setUpEventListeners();
}


// Función para mostrar los detalles del proyecto
function showProjectDetails(project, index) {
    document.getElementById('project-description').textContent = project["Descripción"];
    document.getElementById('project-objectives').textContent = project["Objetivos"];
    document.getElementById('project-status').textContent = project["Estado"];
    document.getElementById('project-duration').textContent = project["Tiempo de Desarrollo"];
    document.getElementById('project-members').textContent = project["Integrantes"];
    document.getElementById('project-specialties').textContent = project["Especialidades Requeridas"];
  
    currentProjectIndex = index;
    projectDetailsModal.classList.remove('hidden');
}

// Configura los event listeners
function setUpEventListeners() {
    selectProjectButton.addEventListener('click', () => {
        if(selectedProjects.length < 3){
            projectDetailsModal.classList.add('hidden');
            justificationModal.classList.remove('hidden');
        }else{
            alert("No puedes seleccionar más de 3 proyectos.");
        }
    });

    cancelDetailsButton.addEventListener('click', () => {
        projectDetailsModal.classList.add('hidden');
        currentProjectIndex = null;
    });

    cancelJustificationButton.addEventListener('click', () => {
        justificationModal.classList.add('hidden');
        currentProjectIndex = null;
    });

    submitJustificationButton.addEventListener('click', () => {
        const justification = justificationText.value.trim();
        if (justification) {
            const projectCard = document.querySelector(`.project-item[data-index="${currentProjectIndex}"]`);
            const projectId = projectCard.dataset.id;

            if (!selectedProjects.includes(projectId)) {
                selectedProjects.push(projectId);
                selectedJustifications[projectId] = justification;

                projectCard.classList.add('selected');
                addProjectToTable(projectCard.querySelector('h3').textContent, justification, projectId);

                justificationText.value = '';
                justificationModal.classList.add('hidden');

                if (selectedProjects.length === 3) {
                    document.getElementById('scrollUpButton').disabled = false;
                }
            }
        } else {
            alert('Por favor, proporciona una justificación.');
        }
    });


    // Evento para el botón de subir (envío de proyectos seleccionados)
    document.getElementById('scrollUpButton').addEventListener('click', async () => {
        console.log(selectedProjects);
        if (selectedProjects.length === 3) {
            const user = auth.currentUser;
            if (user) {
                try {
                    await actualizarProyectos(user.uid); // Ahora pasamos la UID directamente
                } catch (error) {
                    console.error("Error al actualizar los datos del usuario:", error);
                    alert("Hubo un error al actualizar la información. Por favor, intenta de nuevo.");
                }
            } else {
                alert("Usuario no autenticado.");
            }
        } else {
            console.log(selectedProjects);
            alert("Debes seleccionar exactamente 3 proyectos antes de subir.");
        }
    });
}

document.addEventListener("DOMContentLoaded", async function() {
    const searchInput = document.getElementById("search-input");

    searchInput.addEventListener("input", function() {
        // Ajusta el ancho del input según el tamaño del contenido
        this.style.width = (this.value.length + 4) + 'ch';
    });

    // Establece un ancho mínimo para el input
    searchInput.style.minWidth = '20ch';

    // Espera a que la información esté completamente cargada antes de mostrarla
    try {
        await cargarSelectores();  // Cargar los selectores con valores únicos
        await renderProjectsConFiltros();  // Renderizar proyectos con los filtros aplicados

        // Una vez que los proyectos están listos, ocultar el loading y mostrar el contenido
        document.body.classList.add('loaded');
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        alert("Hubo un problema al cargar los datos. Por favor, intenta de nuevo.");
    }
});

// Función para actualizar proyectos del usuario
async function actualizarProyectos(uid) {
    const userDocRef = doc(db, "Usuarios", uid); // Ahora usamos la UID directamente para obtener el documento

    const updatedData = {
        P1: selectedProjects[0],
        P2: selectedProjects[1],
        P3: selectedProjects[2],
        R1: selectedJustifications[selectedProjects[0]],
        R2: selectedJustifications[selectedProjects[1]],
        R3: selectedJustifications[selectedProjects[2]],
    };

    await updateDoc(userDocRef, updatedData);
    alert("Proyectos y justificaciones actualizados exitosamente.");
    window.location.href = 'profile';
}

// Función para cargar los proyectos seleccionados por el usuario y marcar los proyectos en la UI
async function cargarProyectosSeleccionados(uid) {
    const userDocRef = doc(db, "Usuarios", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();

        const proyectosSeleccionados = [
            { id: userData.P1, justificacion: userData.R1 },
            { id: userData.P2, justificacion: userData.R2 },
            { id: userData.P3, justificacion: userData.R3 }
        ];

        proyectosSeleccionados.forEach(proyecto => {
            if (proyecto.id) {
                const projectCard = document.querySelector(`.project-item[data-id="${proyecto.id}"]`);
                if (projectCard) {
                    projectCard.classList.add('selected');
                    selectedProjects.push(proyecto.id);
                    selectedJustifications[proyecto.id] = proyecto.justificacion;

                    addProjectToTable(projectCard.querySelector('h3').textContent, proyecto.justificacion, proyecto.id);
                }
            }
        });

        if (selectedProjects.length === 3) {
            document.getElementById('scrollUpButton').disabled = false;
        }
    }
}

// Añade el proyecto a la tabla
function addProjectToTable(name, justification, projectId) {
    const table = document.getElementById('tablaJustificacion');
    const row = table.insertRow();

    row.dataset.projectId = projectId;
    row.innerHTML = `
        <td>${name}</td>
        <td>${justification}</td>
        <td class="delete-column"><button class="delete-btn">X</button></td>
    `;

    row.querySelector('.delete-btn').addEventListener('click', () => {
        deleteProject(row, projectId);
    });
}

// Elimina el proyecto de la tabla y de la lista de seleccionados
function deleteProject(row, projectId) {
    row.remove();
    selectedProjects = selectedProjects.filter(id => id !== projectId);
    delete selectedJustifications[projectId];

    document.querySelector(`.project-item[data-id="${projectId}"]`).classList.remove('selected');
}

// Variables globales para los filtros
let seleccionActual = {
    area: null,
    tipo: null,
    especialidad: null
};

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

// Función para cargar los selectores con los valores únicos
async function cargarSelectores() {
    const projects = await getProjectsFromFirestore();

    const areasUnicas = obtenerValoresUnicos(projects, "Área");
    const tiposUnicos = obtenerValoresUnicos(projects, "Tipo de Aplicación");
    const especialidadesUnicas = obtenerEspecialidadesUnicas(projects);

    llenarSelector(document.getElementById('area-filter'), areasUnicas, "Área");
    llenarSelector(document.getElementById('tipo-filter'), tiposUnicos, "Tipo de Aplicación");
    llenarSelector(document.getElementById('Especialidad-filter'), especialidadesUnicas, "Especialidad");
}

function llenarSelector(selector, valores, placeholder) {
    selector.innerHTML = `<option value="">${placeholder}</option>`;
    valores.forEach(valor => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = valor;
        selector.appendChild(option);
    });
}

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    cargarSelectores();  // Cargar los selectores con valores únicos
    renderProjectsConFiltros();  // Renderizar proyectos con los filtros aplicados
});

// Cargar los proyectos con filtros aplicados
function renderProjectsConFiltros() {
    let projectsFiltrados = proyectosCache;

    if (seleccionActual.area) {
        projectsFiltrados = projectsFiltrados.filter(project => project.Área === seleccionActual.area);
    }
    if (seleccionActual.tipo) {
        projectsFiltrados = projectsFiltrados.filter(project => project["Tipo de Aplicación"] === seleccionActual.tipo);
    }
    if (seleccionActual.especialidad) {
        projectsFiltrados = projectsFiltrados.filter(project => project["Especialidades Requeridas"] && project["Especialidades Requeridas"].includes(seleccionActual.especialidad));
    }

    const searchValue = document.getElementById('search-input').value.toLowerCase();
    if (searchValue) {
        projectsFiltrados = projectsFiltrados.filter(project => project["Nombre"].toLowerCase().includes(searchValue));
    }

    renderFilteredProjects(projectsFiltrados);
}


// Función para renderizar proyectos filtrados
function renderFilteredProjects(projects) {
    const container = document.querySelector('.cards-container');
    container.innerHTML = '';

    projects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = 'card project-item';
        projectCard.dataset.index = index;
        projectCard.dataset.id = project.id;

        projectCard.innerHTML = `
        <h3>${project["Nombre"]}</h3>
        <p><strong>Tipo de App:</strong> ${project["Tipo de Aplicación"]}</p>
        <p><strong>Área:</strong> ${project["Área"]}</p>`;

        // Verificar si el proyecto está seleccionado
        if (selectedProjects.includes(project.id)) {
            projectCard.classList.add('selected');
        }

        projectCard.addEventListener('click', () => {
            showProjectDetails(project, index);
        });

        container.appendChild(projectCard);
    });
}

// Configurar los event listeners para los filtros
document.getElementById('area-filter').addEventListener('change', function() {
    seleccionActual.area = this.value || null;
    renderProjectsConFiltros();
});

document.getElementById('tipo-filter').addEventListener('change', function() {
    seleccionActual.tipo = this.value || null;
    renderProjectsConFiltros();
});

document.getElementById('Especialidad-filter').addEventListener('change', function() {
    seleccionActual.especialidad = this.value || null;
    renderProjectsConFiltros();
});

document.getElementById('search-input').addEventListener('input', function() {
    renderProjectsConFiltros();
});

document.addEventListener("DOMContentLoaded", function() {
    const floatingButton = document.querySelector('.floating-button');
    const floatingButtonImage = floatingButton.querySelector('img');
    const tablaJustificacion = document.querySelector('#tablaJustificacion');
    let scrolledDown = false;
    let isScrolling = false;

    // Función para manejar el clic en el botón flotante
    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();

        if (!scrolledDown) {
            tablaJustificacion.scrollIntoView({ behavior: 'smooth' });
            isScrolling = true;
            setTimeout(() => {
                floatingButtonImage.src = "../images/arriba.png";
                scrolledDown = true;
                isScrolling = false;
            }, 500); // Ajusta el tiempo de espera según sea necesario
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            isScrolling = true;
            setTimeout(() => {
                floatingButtonImage.src = "../images/flechaBlanca-removebg-preview - copia.png";
                scrolledDown = false;
                isScrolling = false;
            }, 500);
        }
    });

    // Función para manejar el scroll manual
    window.addEventListener('scroll', function() {
        if (isScrolling) return; // Evita cambios si estamos en el proceso de desplazamiento automático

        requestAnimationFrame(() => {
            const scrollPosition = window.scrollY || window.pageYOffset;
            const tablaPosition = tablaJustificacion.offsetTop;
            const windowHeight = window.innerHeight;
            const tablaHeight = tablaJustificacion.offsetHeight;

            // Detecta si el usuario está cerca de la tablaJustificacion o en la parte superior
            if (scrollPosition + windowHeight >= tablaPosition && scrollPosition < tablaPosition + tablaHeight) {
                floatingButtonImage.src = "../images/arriba.png";
                scrolledDown = true;
            } else if (scrollPosition === 0) {
                floatingButtonImage.src = "../images/flechaBlanca-removebg-preview - copia.png";
                scrolledDown = false;
            }
        });
    });
});

// Variables globales
const justificationModal = document.getElementById('justification-modal');
const justificationText = document.getElementById('justification-text');
const submitJustificationButton = document.getElementById('submit-justification');
const selectProjectButton = document.getElementById('select-project');
const cancelDetailsButton = document.getElementById('cancel-details');
const cancelJustificationButton = document.getElementById('cancel-justification');
const projectDetailsModal = document.getElementById('project-details-modal');
let selectedProjects = [];
let selectedJustifications = {};
let currentProjectIndex = null;