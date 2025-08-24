// Estado de la aplicación
let appState = {
    selectedSemesters: [],
    selectedCourses: {},
    courseSchedules: {},
    generatedCombinations: [],
    currentPreview: null
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    renderSemesters();
    updateCreditsCounter();
    updateCoursesCounter();
}

// ===== UTILIDADES =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in-out forwards';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function formatCourseName(name) {
    if (name.length > 35) {
        const words = name.split(' ');
        if (words.length > 3) {
            const mid = Math.ceil(words.length / 2);
            return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
        }
        return name.substr(0, 32) + '...';
    }
    return name;
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function getTimeSlotIndex(time) {
    return TIME_SLOTS.findIndex(slot => slot.start === time);
}

// ===== NAVEGACIÓN DE PESTAÑAS =====
function switchTab(tabName) {
    // Actualizar botones de pestaña
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Actualizar contenido de pestaña
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Actualizar datos específicos de la pestaña
    if (tabName === 'schedules') {
        updateCourseSelect();
        renderCurrentConfiguration();
    } else if (tabName === 'generate') {
        renderCombinationsList();
    }
}

// ===== PESTAÑA 1: SELECCIÓN DE CURSOS =====
function renderSemesters() {
    const container = document.getElementById('semesters-grid');
    container.innerHTML = '';
    
    Object.keys(PLAN_ESTUDIOS).forEach(semester => {
        const semesterDiv = document.createElement('div');
        semesterDiv.className = 'semester-item';
        semesterDiv.innerHTML = `
            <div class="semester-checkbox">
                <input type="checkbox" id="sem-${semester}" 
                       onchange="handleSemesterChange('${semester}')" 
                       ${appState.selectedSemesters.includes(semester) ? 'checked' : ''}>
                <label for="sem-${semester}">${semester}</label>
            </div>
        `;
        
        if (appState.selectedSemesters.includes(semester)) {
            semesterDiv.classList.add('selected');
        }
        
        container.appendChild(semesterDiv);
    });
}

function handleSemesterChange(semester) {
    const checkbox = document.getElementById(`sem-${semester}`);
    const semesterDiv = checkbox.closest('.semester-item');
    
    if (checkbox.checked) {
        // Validar paridad de semestres
        if (appState.selectedSemesters.length > 0) {
            const currentType = appState.selectedSemesters[0].includes('Primer Semestre') ? 'impar' : 'par';
            const newType = semester.includes('Primer Semestre') ? 'impar' : 'par';
            
            if (currentType !== newType) {
                showToast('No puedes mezclar semestres pares e impares', 'warning');
                checkbox.checked = false;
                return;
            }
        }
        
        appState.selectedSemesters.push(semester);
        semesterDiv.classList.add('selected');
    } else {
        appState.selectedSemesters = appState.selectedSemesters.filter(s => s !== semester);
        semesterDiv.classList.remove('selected');
        
        // Eliminar cursos del semestre deseleccionado
        Object.keys(PLAN_ESTUDIOS[semester]).forEach(courseCode => {
            if (appState.selectedCourses[courseCode]) {
                delete appState.selectedCourses[courseCode];
                delete appState.courseSchedules[courseCode];
            }
        });
    }
    
    renderCourses();
    updateCreditsCounter();
    updateCoursesCounter();
}

function renderCourses() {
    const container = document.getElementById('courses-container');
    
    if (appState.selectedSemesters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <p>Selecciona un semestre para ver los cursos disponibles</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    appState.selectedSemesters.forEach(semester => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'semester-section';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'semester-title';
        titleDiv.textContent = semester;
        sectionDiv.appendChild(titleDiv);
        
        const coursesGrid = document.createElement('div');
        coursesGrid.className = 'courses-grid';
        
        Object.entries(PLAN_ESTUDIOS[semester]).forEach(([code, course]) => {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-item';
            courseDiv.innerHTML = `
                <div class="course-checkbox">
                    <input type="checkbox" id="course-${code}" 
                           onchange="handleCourseChange('${code}')"
                           ${appState.selectedCourses[code] ? 'checked' : ''}>
                    <div class="course-info">
                        <h3>${course.nombre}</h3>
                        <div class="course-meta">
                            <span class="course-code">${code}</span>
                            <span class="course-credits">${course.creditos} créditos</span>
                        </div>
                    </div>
                </div>
            `;
            
            if (appState.selectedCourses[code]) {
                courseDiv.classList.add('selected');
            }
            
            coursesGrid.appendChild(courseDiv);
        });
        
        sectionDiv.appendChild(coursesGrid);
        container.appendChild(sectionDiv);
    });
}

function handleCourseChange(courseCode) {
    const checkbox = document.getElementById(`course-${courseCode}`);
    const courseDiv = checkbox.closest('.course-item');
    
    if (checkbox.checked) {
        // Encontrar información del curso
        let courseInfo = null;
        for (const semester of appState.selectedSemesters) {
            if (PLAN_ESTUDIOS[semester][courseCode]) {
                courseInfo = PLAN_ESTUDIOS[semester][courseCode];
                break;
            }
        }
        
        if (courseInfo) {
            appState.selectedCourses[courseCode] = courseInfo;
            courseDiv.classList.add('selected');
        }
    } else {
        delete appState.selectedCourses[courseCode];
        delete appState.courseSchedules[courseCode];
        courseDiv.classList.remove('selected');
    }
    
    updateCreditsCounter();
    updateCoursesCounter();
}

function updateCreditsCounter() {
    const totalCredits = Object.values(appState.selectedCourses)
        .reduce((sum, course) => sum + course.creditos, 0);
    
    document.getElementById('total-credits').textContent = totalCredits;
}

function updateCoursesCounter() {
    const count = Object.keys(appState.selectedCourses).length;
    document.getElementById('selected-courses-count').textContent = count;
}

// ===== PESTAÑA 2: CONFIGURACIÓN DE HORARIOS =====
function updateCourseSelect() {
    const select = document.getElementById('course-select');
    select.innerHTML = '<option value="">-- Selecciona un curso --</option>';
    
    Object.entries(appState.selectedCourses).forEach(([code, course]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${course.nombre}`;
        select.appendChild(option);
    });
}

function loadCourseSchedule() {
    const select = document.getElementById('course-select');
    const courseCode = select.value;
    const editor = document.getElementById('schedule-editor');
    
    if (!courseCode) {
        editor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚙️</div>
                <p>Selecciona un curso para configurar sus horarios</p>
            </div>
        `;
        return;
    }
    
    const courseName = appState.selectedCourses[courseCode].nombre;
    
    // Inicializar estructura de horarios si no existe
    if (!appState.courseSchedules[courseCode]) {
        appState.courseSchedules[courseCode] = {};
    }
    
    editor.innerHTML = `
        <div class="course-schedule-header">
            <h3>Configurando: ${courseName}</h3>
        </div>
        <div class="groups-container" id="groups-container-${courseCode}">
            ${GROUPS.map(group => createGroupCard(courseCode, group)).join('')}
        </div>
        <div style="margin-top: 1.5rem; text-align: center;">
            <button class="btn btn-primary" onclick="saveCourseSchedule('${courseCode}')">
                💾 Guardar Configuración
            </button>
        </div>
    `;
}

function createGroupCard(courseCode, group) {
    const schedules = appState.courseSchedules[courseCode][group]?.schedules || [];
    const isEnabled = appState.courseSchedules[courseCode][group] ? true : false;
    
    return `
        <div class="group-card">
            <div class="group-header">
                <input type="checkbox" id="group-${courseCode}-${group}" 
                       ${isEnabled ? 'checked' : ''}
                       onchange="toggleGroup('${courseCode}', '${group}')">
                <label for="group-${courseCode}-${group}">Grupo ${group}</label>
            </div>
            <div class="group-schedules" id="schedules-${courseCode}-${group}">
                ${schedules.map((schedule, index) => 
                    createScheduleItem(courseCode, group, index, schedule)
                ).join('')}
            </div>
            <button class="add-schedule-btn" onclick="addSchedule('${courseCode}', '${group}')">
                ➕ Agregar Horario
            </button>
        </div>
    `;
}

function createScheduleItem(courseCode, group, index, schedule = {}) {
    return `
        <div class="schedule-item" id="schedule-${courseCode}-${group}-${index}">
            <select onchange="updateSchedule('${courseCode}', '${group}', ${index}, 'day', this.value)">
                <option value="">Día</option>
                ${DAYS.map(day => `
                    <option value="${day}" ${schedule.day === day ? 'selected' : ''}>${day}</option>
                `).join('')}
            </select>
            <select onchange="updateSchedule('${courseCode}', '${group}', ${index}, 'start', this.value)">
                <option value="">Inicio</option>
                ${TIME_SLOTS.map(slot => `
                    <option value="${slot.start}" ${schedule.start === slot.start ? 'selected' : ''}>${slot.start}</option>
                `).join('')}
            </select>
            <select onchange="updateSchedule('${courseCode}', '${group}', ${index}, 'end', this.value)">
                <option value="">Fin</option>
                ${TIME_SLOTS.map(slot => `
                    <option value="${slot.end}" ${schedule.end === slot.end ? 'selected' : ''}>${slot.end}</option>
                `).join('')}
            </select>
            <button class="remove-schedule-btn" onclick="removeSchedule('${courseCode}', '${group}', ${index})">
                🗑️
            </button>
        </div>
    `;
}

function toggleGroup(courseCode, group) {
    const checkbox = document.getElementById(`group-${courseCode}-${group}`);
    
    if (checkbox.checked) {
        if (!appState.courseSchedules[courseCode][group]) {
            appState.courseSchedules[courseCode][group] = {
                group: group,
                schedules: []
            };
        }
    } else {
        delete appState.courseSchedules[courseCode][group];
    }
}

function addSchedule(courseCode, group) {
    if (!appState.courseSchedules[courseCode][group]) {
        appState.courseSchedules[courseCode][group] = {
            group: group,
            schedules: []
        };
    }
    
    appState.courseSchedules[courseCode][group].schedules.push({
        day: '',
        start: '',
        end: ''
    });
    
    const container = document.getElementById(`schedules-${courseCode}-${group}`);
    const index = appState.courseSchedules[courseCode][group].schedules.length - 1;
    container.insertAdjacentHTML('beforeend', createScheduleItem(courseCode, group, index));
}

function removeSchedule(courseCode, group, index) {
    if (appState.courseSchedules[courseCode][group]) {
        appState.courseSchedules[courseCode][group].schedules.splice(index, 1);
        
        // Re-renderizar los horarios del grupo
        const container = document.getElementById(`schedules-${courseCode}-${group}`);
        container.innerHTML = appState.courseSchedules[courseCode][group].schedules
            .map((schedule, idx) => createScheduleItem(courseCode, group, idx, schedule))
            .join('');
    }
}

function updateSchedule(courseCode, group, index, field, value) {
    if (appState.courseSchedules[courseCode][group] && 
        appState.courseSchedules[courseCode][group].schedules[index]) {
        appState.courseSchedules[courseCode][group].schedules[index][field] = value;
    }
}

function saveCourseSchedule(courseCode) {
    // Validar que los horarios estén completos
    let hasIncompleteSchedules = false;
    
    Object.entries(appState.courseSchedules[courseCode]).forEach(([group, data]) => {
        data.schedules = data.schedules.filter(schedule => {
            if (!schedule.day || !schedule.start || !schedule.end) {
                hasIncompleteSchedules = true;
                return false;
            }
            return true;
        });
        
        // Eliminar grupos sin horarios
        if (data.schedules.length === 0) {
            delete appState.courseSchedules[courseCode][group];
        }
    });
    
    if (hasIncompleteSchedules) {
        showToast('Se eliminaron horarios incompletos', 'warning');
    }
    
    renderCurrentConfiguration();
    showToast('Configuración guardada exitosamente');
}

function renderCurrentConfiguration() {
    const container = document.getElementById('current-config');
    
    if (Object.keys(appState.courseSchedules).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No hay configuraciones guardadas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(appState.courseSchedules).forEach(([courseCode, groups]) => {
        const courseName = appState.selectedCourses[courseCode]?.nombre || courseCode;
        
        Object.entries(groups).forEach(([group, data]) => {
            const scheduleText = data.schedules.map(s => 
                `${s.day} ${s.start}-${s.end}`
            ).join(', ');
            
            const configDiv = document.createElement('div');
            configDiv.className = 'config-item';
            configDiv.innerHTML = `
                <div class="config-course">${courseName}</div>
                <div class="config-group">Grupo ${group}</div>
                <div class="config-schedules">${scheduleText}</div>
            `;
            container.appendChild(configDiv);
        });
    });
}

// ===== PESTAÑA 3: GENERAR HORARIOS =====
function generateSchedules() {
    // Validar que todos los cursos seleccionados tengan horarios configurados
    const coursesWithoutSchedules = [];
    Object.keys(appState.selectedCourses).forEach(courseCode => {
        if (!appState.courseSchedules[courseCode] || 
            Object.keys(appState.courseSchedules[courseCode]).length === 0) {
            coursesWithoutSchedules.push(appState.selectedCourses[courseCode].nombre);
        }
    });
    
    if (coursesWithoutSchedules.length > 0) {
        showToast('Los siguientes cursos no tienen horarios configurados: ' + 
                 coursesWithoutSchedules.join(', '), 'error');
        return;
    }
    
    // Generar todas las combinaciones válidas
    const combinations = generateValidCombinations();
    appState.generatedCombinations = combinations;
    
    if (combinations.length === 0) {
        showToast('No se encontraron combinaciones válidas sin choques de horario', 'warning');
        renderCombinationsList();
        return;
    }
    
    renderCombinationsList();
    showToast(`Se encontraron ${combinations.length} combinaciones válidas`);
}

function generateValidCombinations() {
    // Obtener todos los grupos de cada curso
    const courseGroups = [];
    Object.entries(appState.courseSchedules).forEach(([courseCode, groups]) => {
        const groupList = Object.values(groups).map(group => ({
            ...group,
            courseCode: courseCode,
            courseName: appState.selectedCourses[courseCode].nombre
        }));
        courseGroups.push(groupList);
    });
    
    if (courseGroups.length === 0) return [];
    
    // Generar producto cartesiano de todas las combinaciones
    const allCombinations = cartesianProduct(courseGroups);
    
    // Filtrar combinaciones válidas (sin choques)
    return allCombinations.filter(combination => isValidCombination(combination));
}

function cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(item => [item]);
    
    const result = [];
    const firstArray = arrays[0];
    const restProduct = cartesianProduct(arrays.slice(1));
    
    firstArray.forEach(item => {
        restProduct.forEach(restCombination => {
            result.push([item, ...restCombination]);
        });
    });
    
    return result;
}

function isValidCombination(combination) {
    for (let i = 0; i < combination.length; i++) {
        for (let j = i + 1; j < combination.length; j++) {
            if (schedulesConflict(combination[i].schedules, combination[j].schedules)) {
                return false;
            }
        }
    }
    return true;
}

function schedulesConflict(schedules1, schedules2) {
    for (const s1 of schedules1) {
        for (const s2 of schedules2) {
            if (s1.day === s2.day) {
                const start1 = timeToMinutes(s1.start);
                const end1 = timeToMinutes(s1.end);
                const start2 = timeToMinutes(s2.start);
                const end2 = timeToMinutes(s2.end);
                
                // Verificar solapamiento
                if (!(end1 <= start2 || end2 <= start1)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function renderCombinationsList() {
    const container = document.getElementById('combinations-list');
    
    if (appState.generatedCombinations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <p>Genera horarios para ver las combinaciones</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    appState.generatedCombinations.forEach((combination, index) => {
        const combinationDiv = document.createElement('div');
        combinationDiv.className = 'combination-item';
        combinationDiv.innerHTML = `
            <div class="combination-checkbox">
                <input type="checkbox" id="comb-${index}" onchange="handleCombinationSelection()">
                <label for="comb-${index}">Combinación ${index + 1}</label>
            </div>
            <button class="view-btn" onclick="previewCombination(${index})">Ver</button>
        `;
        container.appendChild(combinationDiv);
    });
}

function selectAllCombinations() {
    document.querySelectorAll('#combinations-list input[type="checkbox"]')
        .forEach(checkbox => checkbox.checked = true);
}

function clearAllCombinations() {
    document.querySelectorAll('#combinations-list input[type="checkbox"]')
        .forEach(checkbox => checkbox.checked = false);
}

function handleCombinationSelection() {
    // Esta función se puede usar para manejar la selección de combinaciones
    // Por ahora solo es necesaria para el evento onchange
}

function previewCombination(index) {
    if (index < 0 || index >= appState.generatedCombinations.length) return;
    
    const combination = appState.generatedCombinations[index];
    appState.currentPreview = { combination, index };
    
    renderSchedulePreview(combination, index + 1);
    
    // Marcar como seleccionada visualmente
    document.querySelectorAll('.combination-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelectorAll('.combination-item')[index].classList.add('selected');
}

function renderSchedulePreview(combination, combinationNumber) {
    const gridContainer = document.getElementById('schedule-grid');
    const summaryContainer = document.getElementById('schedule-summary');
    const previewInfo = document.getElementById('preview-info');
    
    // Actualizar información de la vista previa
    previewInfo.textContent = `Combinación ${combinationNumber}`;
    
    // Crear tabla de horarios
    gridContainer.innerHTML = createScheduleTable(combination);
    
    // Crear resumen
    summaryContainer.innerHTML = createScheduleSummary(combination);
}

function createScheduleTable(combination) {
    // Crear matriz de horarios
    const schedule = Array(TIME_SLOTS.length).fill(null).map(() => 
        Array(DAYS.length).fill(null)
    );
    
    const courseColors = {};
    let colorIndex = 0;
    
    // Asignar colores a los cursos
    combination.forEach(group => {
        if (!courseColors[group.courseCode]) {
            courseColors[group.courseCode] = colorIndex + 1;
            colorIndex = (colorIndex + 1) % 10;
        }
    });
    
    // Llenar la matriz con los horarios
    combination.forEach(group => {
        group.schedules.forEach(scheduleItem => {
            const dayIndex = DAYS.indexOf(scheduleItem.day);
            const startIndex = getTimeSlotIndex(scheduleItem.start);
            const endIndex = getTimeSlotIndex(scheduleItem.end);
            
            if (dayIndex !== -1 && startIndex !== -1 && endIndex !== -1) {
                const colorClass = `color-${courseColors[group.courseCode]}`;
                const blockData = {
                    courseName: formatCourseName(group.courseName),
                    group: group.group,
                    colorClass: colorClass,
                    height: endIndex - startIndex
                };
                
                for (let i = startIndex; i < endIndex; i++) {
                    schedule[i][dayIndex] = i === startIndex ? blockData : 'occupied';
                }
            }
        });
    });
    
    // Generar HTML de la tabla
    let tableHTML = `
        <table class="schedule-table">
            <thead>
                <tr>
                    <th>Hora</th>
                    ${DAYS.map(day => `<th>${day}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    TIME_SLOTS.forEach((timeSlot, timeIndex) => {
        tableHTML += `
            <tr>
                <td class="time-slot">${timeSlot.start}<br>${timeSlot.end}</td>
        `;
        
        DAYS.forEach((day, dayIndex) => {
            const cell = schedule[timeIndex][dayIndex];
            
            if (cell === 'occupied') {
                // Celda ocupada por un bloque que empezó antes
                tableHTML += '<td style="border: none;"></td>';
            } else if (cell && typeof cell === 'object') {
                // Inicio de un bloque de curso
                tableHTML += `
                    <td style="padding: 0; position: relative; height: ${cell.height * 40}px; border: none;">
                        <div class="schedule-block ${cell.colorClass}" 
                             style="height: ${cell.height * 38}px; top: 1px;">
                            <div class="course-name">${cell.courseName}</div>
                            <div class="group-info">Grupo ${cell.group}</div>
                        </div>
                    </td>
                `;
            } else {
                // Celda vacía
                tableHTML += '<td></td>';
            }
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

function createScheduleSummary(combination) {
    const totalCredits = combination.reduce((sum, group) => {
        return sum + appState.selectedCourses[group.courseCode].creditos;
    }, 0);
    
    const courseColors = {};
    let colorIndex = 0;
    
    return `
        <div class="summary-header">
            <h4>Resumen del Horario</h4>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${totalCredits}</div>
                    <div class="stat-label">Créditos Totales</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${combination.length}</div>
                    <div class="stat-label">Cursos</div>
                </div>
            </div>
        </div>
        <div class="courses-legend">
            ${combination.map(group => {
                if (!courseColors[group.courseCode]) {
                    courseColors[group.courseCode] = colorIndex + 1;
                    colorIndex = (colorIndex + 1) % 10;
                }
                
                const scheduleText = group.schedules.map(s => 
                    `${s.day} ${s.start}-${s.end}`
                ).join(', ');
                
                return `
                    <div class="legend-item">
                        <div class="legend-color color-${courseColors[group.courseCode]}" 
                             style="background: var(--course-color-${courseColors[group.courseCode]});"></div>
                        <div class="legend-info">
                            <div class="legend-name">${group.courseName}</div>
                            <div class="legend-details">
                                <span class="legend-group">Grupo ${group.group}</span>
                                <span class="legend-credits">${appState.selectedCourses[group.courseCode].creditos} créditos</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ===== EXPORTAR E IMPORTAR CONFIGURACIÓN =====
function exportarConfiguracion() {
    const config = {
        selectedSemesters: appState.selectedSemesters,
        selectedCourses: appState.selectedCourses,
        courseSchedules: appState.courseSchedules
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'configuracion-horarios.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Configuración exportada exitosamente');
}

function importarConfiguracion() {
    document.getElementById('file-input').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            // Validar estructura básica
            if (!config.selectedSemesters || !config.selectedCourses || !config.courseSchedules) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Cargar configuración
            appState.selectedSemesters = config.selectedSemesters;
            appState.selectedCourses = config.selectedCourses;
            appState.courseSchedules = config.courseSchedules;
            
            // Actualizar interfaz
            renderSemesters();
            renderCourses();
            updateCreditsCounter();
            updateCoursesCounter();
            updateCourseSelect();
            renderCurrentConfiguration();
            
            showToast('Configuración importada exitosamente');
            
        } catch (error) {
            showToast('Error al importar la configuración: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Limpiar el input
}

// ===== EXPORTAR PDF Y PNG =====
function exportSelectedPDF() {
    const selectedIndexes = getSelectedCombinations();
    
    if (selectedIndexes.length === 0) {
        showToast('Selecciona al menos una combinación para exportar', 'warning');
        return;
    }
    
    showToast('Generando PDF...', 'warning');
    
    // Usar jsPDF para generar el PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4'); // landscape, milímetros, A4
    
    selectedIndexes.forEach((index, pageIndex) => {
        if (pageIndex > 0) pdf.addPage();
        
        const combination = appState.generatedCombinations[index];
        
        // Crear un elemento temporal para el horario
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '1200px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.padding = '20px';
        
        tempDiv.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #1e293b;">Combinación ${index + 1} - Horario de Clases</h1>
                <p style="margin: 10px 0; color: #64748b;">Ingeniería Industrial</p>
            </div>
            ${createScheduleTable(combination)}
            ${createScheduleSummary(combination)}
        `;
        
        document.body.appendChild(tempDiv);
        
        html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 297; // A4 width in mm (landscape)
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            document.body.removeChild(tempDiv);
            
            // Si es la última página, guardar el PDF
            if (pageIndex === selectedIndexes.length - 1) {
                pdf.save('horarios-combinaciones.pdf');
                showToast('PDF generado exitosamente');
            }
        }).catch(error => {
            document.body.removeChild(tempDiv);
            showToast('Error al generar PDF: ' + error.message, 'error');
        });
    });
}

function exportSelectedPNG() {
    const selectedIndexes = getSelectedCombinations();
    
    if (selectedIndexes.length === 0) {
        showToast('Selecciona al menos una combinación para exportar', 'warning');
        return;
    }
    
    if (!appState.currentPreview) {
        showToast('Primero visualiza una combinación', 'warning');
        return;
    }
    
    showToast('Generando imagen...', 'warning');
    
    const previewElement = document.querySelector('.schedule-preview');
    
    html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `horario-combinacion-${appState.currentPreview.index + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast('Imagen exportada exitosamente');
    }).catch(error => {
        showToast('Error al generar imagen: ' + error.message, 'error');
    });
}

function getSelectedCombinations() {
    const selected = [];
    document.querySelectorAll('#combinations-list input[type="checkbox"]:checked')
        .forEach((checkbox, index) => {
            const combinationIndex = parseInt(checkbox.id.split('-')[1]);
            selected.push(combinationIndex);
        });
    return selected;
}