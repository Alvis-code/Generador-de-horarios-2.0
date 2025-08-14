
// script.js - Versión corregida y robusta
// Cambios principales:
// - getTimeSlotIndex mejorado para mapear horas que no coinciden exactamente con TIME_SLOTS
// - validación estricta antes de generar combinaciones: todas las materias seleccionadas deben tener al menos un grupo con horarios válidos
// - generateValidCombinations construye courseGroups en el orden de selectedCourses (para consistencia)
// - createScheduleTable/render maneja correctamente bloques que empiezan/terminan en límites y muestra todos los días
// - más mensajes de consola para debug en caso de datos inesperados

// --- Estado de la aplicación ---
let appState = {
    selectedSemesters: [],
    selectedCourses: {},
    courseSchedules: {}, // { courseCode: { A: { group:'A', schedules:[{day,start,end},...] }, B: {...} } }
    generatedCombinations: [],
    currentPreview: null
};

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
    if (!name) return '';
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
    if (!timeStr || typeof timeStr !== 'string') return NaN;
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return NaN;
    const [hours, minutes] = parts;
    return hours * 60 + minutes;
}

// Mejor getTimeSlotIndex: intenta coincidencia exacta por inicio;
// si no hay inicio exacto, busca el slot cuyo rango contenga el tiempo.
// Para empates con el límite (ej: tiempo == slot.end) preferimos que
// primero se detecte exacto con start si existe; si no, se acepta <= end.
function getTimeSlotIndex(time) {
    if (!time) return -1;
    // Si TIME_SLOTS no está definido (por si falta data.js), evitar crash
    if (typeof TIME_SLOTS === 'undefined' || !Array.isArray(TIME_SLOTS) || TIME_SLOTS.length === 0) {
        console.warn('TIME_SLOTS no definido o vacío. Asegúrate de cargar data.js');
        return -1;
    }
    // búsqueda exacta por start
    const exact = TIME_SLOTS.findIndex(slot => slot.start === time);
    if (exact !== -1) return exact;

    const target = timeToMinutes(time);
    if (Number.isNaN(target)) return -1;

    for (let i = 0; i < TIME_SLOTS.length; i++) {
        const s = timeToMinutes(TIME_SLOTS[i].start);
        const e = timeToMinutes(TIME_SLOTS[i].end);
        // si el tiempo cae estrictamente dentro del slot lo asignamos
        if (target > s && target <= e) {
            return i;
        }
    }
    return -1;
}

// ===== NAVEGACIÓN DE PESTAÑAS =====
function switchTab(tabName, evt) {
    // evt puede ser undefined si se llama programáticamente
    if (evt && evt.target) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        evt.target.classList.add('active');
    }
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabEl = document.getElementById(`${tabName}-tab`);
    if (tabEl) tabEl.classList.add('active');

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
    if (!container) return;
    container.innerHTML = '';
    Object.keys(PLAN_ESTUDIOS || {}).forEach(semester => {
        const semesterDiv = document.createElement('div');
        semesterDiv.className = 'semester-item';
        const safeId = 'sem-' + semester.replace(/\s+/g, '_');
        semesterDiv.innerHTML = `
            <div class="semester-checkbox">
                <input type="checkbox" id="${safeId}" 
                       onchange="handleSemesterChange('${semester}')"
                       ${appState.selectedSemesters.includes(semester) ? 'checked' : ''}>
                <label for="${safeId}">${semester}</label>
            </div>
        `;
        if (appState.selectedSemesters.includes(semester)) {
            semesterDiv.classList.add('selected');
        }
        container.appendChild(semesterDiv);
    });
}

function handleSemesterChange(semester) {
    const safeId = 'sem-' + semester.replace(/\s+/g, '_');
    const checkbox = document.getElementById(safeId);
    if (!checkbox) return;
    const semesterDiv = checkbox.closest('.semester-item');

    if (checkbox.checked) {
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
        if (semesterDiv) semesterDiv.classList.add('selected');
    } else {
        appState.selectedSemesters = appState.selectedSemesters.filter(s => s !== semester);
        if (semesterDiv) semesterDiv.classList.remove('selected');
        // eliminar cursos relacionados
        Object.keys(PLAN_ESTUDIOS[semester] || {}).forEach(courseCode => {
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
    if (!container) return;

    if (!appState.selectedSemesters || appState.selectedSemesters.length === 0) {
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

        Object.entries(PLAN_ESTUDIOS[semester] || {}).forEach(([code, course]) => {
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
    if (!checkbox) return;
    const courseDiv = checkbox.closest('.course-item');

    if (checkbox.checked) {
        let courseInfo = null;
        for (const semester of appState.selectedSemesters) {
            if (PLAN_ESTUDIOS[semester] && PLAN_ESTUDIOS[semester][courseCode]) {
                courseInfo = PLAN_ESTUDIOS[semester][courseCode];
                break;
            }
        }
        if (courseInfo) {
            appState.selectedCourses[courseCode] = courseInfo;
            // inicializar estructura de horarios si no existe (evita que un curso desaparezca)
            if (!appState.courseSchedules[courseCode]) appState.courseSchedules[courseCode] = {};
            if (courseDiv) courseDiv.classList.add('selected');
        }
    } else {
        delete appState.selectedCourses[courseCode];
        delete appState.courseSchedules[courseCode];
        if (courseDiv) courseDiv.classList.remove('selected');
    }
    updateCreditsCounter();
    updateCoursesCounter();
}

function updateCreditsCounter() {
    const totalCredits = Object.values(appState.selectedCourses)
        .reduce((sum, course) => sum + (course.creditos || 0), 0);
    const el = document.getElementById('total-credits');
    if (el) el.textContent = totalCredits;
}

function updateCoursesCounter() {
    const count = Object.keys(appState.selectedCourses).length;
    const el = document.getElementById('selected-courses-count');
    if (el) el.textContent = count;
}

// ===== PESTAÑA 2: CONFIGURACIÓN DE HORARIOS =====
function updateCourseSelect() {
    const select = document.getElementById('course-select');
    if (!select) return;
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
    const editor = document.getElementById('schedule-editor');
    if (!editor) return;

    const courseCode = select ? select.value : '';
    if (!courseCode) {
        editor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚙️</div>
                <p>Selecciona un curso para configurar sus horarios</p>
            </div>
        `;
        return;
    }

    const courseName = appState.selectedCourses[courseCode]?.nombre || courseCode;
    if (!appState.courseSchedules[courseCode]) appState.courseSchedules[courseCode] = {};

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
    const schedules = appState.courseSchedules[courseCode] && appState.courseSchedules[courseCode][group]
        ? appState.courseSchedules[courseCode][group].schedules
        : [];
    const isEnabled = !!(appState.courseSchedules[courseCode] && appState.courseSchedules[courseCode][group]);

    return `
        <div class="group-card">
            <div class="group-header">
                <input type="checkbox" id="group-${courseCode}-${group}" 
                       ${isEnabled ? 'checked' : ''}
                       onchange="toggleGroup('${courseCode}', '${group}')">
                <label for="group-${courseCode}-${group}">Grupo ${group}</label>
            </div>
            <div class="group-schedules" id="schedules-${courseCode}-${group}">
                ${schedules.map((schedule, index) => createScheduleItem(courseCode, group, index, schedule)).join('')}
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
                ${DAYS.map(day => `<option value="${day}" ${schedule.day === day ? 'selected' : ''}>${day}</option>`).join('')}
            </select>
            <select onchange="updateSchedule('${courseCode}', '${group}', ${index}, 'start', this.value)">
                <option value="">Inicio</option>
                ${TIME_SLOTS.map(slot => `<option value="${slot.start}" ${schedule.start === slot.start ? 'selected' : ''}>${slot.start}</option>`).join('')}
            </select>
            <select onchange="updateSchedule('${courseCode}', '${group}', ${index}, 'end', this.value)">
                <option value="">Fin</option>
                ${TIME_SLOTS.map(slot => `<option value="${slot.end}" ${schedule.end === slot.end ? 'selected' : ''}>${slot.end}</option>`).join('')}
            </select>
            <button class="remove-schedule-btn" onclick="removeSchedule('${courseCode}', '${group}', ${index})">🗑️</button>
        </div>
    `;
}

function toggleGroup(courseCode, group) {
    if (!appState.courseSchedules[courseCode]) appState.courseSchedules[courseCode] = {};
    const checkbox = document.getElementById(`group-${courseCode}-${group}`);
    if (!checkbox) return;
    if (checkbox.checked) {
        if (!appState.courseSchedules[courseCode][group]) {
            appState.courseSchedules[courseCode][group] = { group: group, schedules: [] };
        }
    } else {
        delete appState.courseSchedules[courseCode][group];
    }
}

function addSchedule(courseCode, group) {
    if (!appState.courseSchedules[courseCode]) appState.courseSchedules[courseCode] = {};
    if (!appState.courseSchedules[courseCode][group]) {
        appState.courseSchedules[courseCode][group] = { group: group, schedules: [] };
    }
    appState.courseSchedules[courseCode][group].schedules.push({ day: '', start: '', end: '' });
    const container = document.getElementById(`schedules-${courseCode}-${group}`);
    const index = appState.courseSchedules[courseCode][group].schedules.length - 1;
    if (container) container.insertAdjacentHTML('beforeend', createScheduleItem(courseCode, group, index));
}

function removeSchedule(courseCode, group, index) {
    if (!appState.courseSchedules[courseCode] || !appState.courseSchedules[courseCode][group]) return;
    appState.courseSchedules[courseCode][group].schedules.splice(index, 1);
    const container = document.getElementById(`schedules-${courseCode}-${group}`);
    if (container) {
        const html = appState.courseSchedules[courseCode][group].schedules
            .map((schedule, idx) => createScheduleItem(courseCode, group, idx, schedule))
            .join('');
        container.innerHTML = html;
    }
}

function updateSchedule(courseCode, group, index, field, value) {
    if (!appState.courseSchedules[courseCode] ||
        !appState.courseSchedules[courseCode][group] ||
        !appState.courseSchedules[courseCode][group].schedules[index]) return;
    appState.courseSchedules[courseCode][group].schedules[index][field] = value;
}

function saveCourseSchedule(courseCode) {
    if (!appState.courseSchedules[courseCode]) appState.courseSchedules[courseCode] = {};

    let hasIncompleteSchedules = false;

    Object.entries(appState.courseSchedules[courseCode]).forEach(([group, data]) => {
        // Filtrar y limpiar horarios incompletos
        data.schedules = data.schedules.filter(schedule => {
            if (!schedule.day || !schedule.start || !schedule.end) {
                hasIncompleteSchedules = true;
                return false;
            }
            return true;
        });

        // Si no hay horarios válidos para el grupo, eliminar el grupo
        if (data.schedules.length === 0) {
            delete appState.courseSchedules[courseCode][group];
        }
    });

    // Si luego de todo no hay grupos, eliminar courseSchedules entry por completo
    if (!appState.courseSchedules[courseCode] || Object.keys(appState.courseSchedules[courseCode]).length === 0) {
        delete appState.courseSchedules[courseCode];
    }

    renderCurrentConfiguration();
    if (hasIncompleteSchedules) showToast('Se eliminaron horarios incompletos', 'warning');
    else showToast('Configuración guardada exitosamente');
}

function renderCurrentConfiguration() {
    const container = document.getElementById('current-config');
    if (!container) return;

    if (!appState.courseSchedules || Object.keys(appState.courseSchedules).length === 0) {
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
            const scheduleText = data.schedules.map(s => `${s.day} ${s.start}-${s.end}`).join(', ');
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
    // Validar que todos los cursos seleccionados tengan al menos un grupo con horarios válidos
    const missing = [];
    Object.keys(appState.selectedCourses).forEach(code => {
        const hasGroups = appState.courseSchedules[code] && Object.keys(appState.courseSchedules[code]).length > 0;
        if (!hasGroups) missing.push(appState.selectedCourses[code].nombre || code);
    });

    if (missing.length > 0) {
        showToast('Los siguientes cursos no tienen horarios configurados: ' + missing.join(', '), 'error');
        return;
    }

    // Generar combinaciones válidas
    const combinations = generateValidCombinations();
    appState.generatedCombinations = combinations;

    if (!combinations || combinations.length === 0) {
        showToast('No se encontraron combinaciones válidas sin choques de horario', 'warning');
        renderCombinationsList();
        return;
    }

    renderCombinationsList();
    showToast(`Se encontraron ${combinations.length} combinaciones válidas`);
}

// Construye courseGroups en el orden de selectedCourses para evitar inconsistencias
function generateValidCombinations() {
    const courseGroups = [];
    const missingCourses = [];

    Object.keys(appState.selectedCourses).forEach(courseCode => {
        const groupsObj = appState.courseSchedules[courseCode];
        if (!groupsObj || Object.keys(groupsObj).length === 0) {
            missingCourses.push(courseCode);
            courseGroups.push([]); // mantener índice para detectar más tarde
            return;
        }
        const groupList = Object.values(groupsObj).map(g => ({
            ...g,
            courseCode,
            courseName: appState.selectedCourses[courseCode]?.nombre || courseCode
        }));
        courseGroups.push(groupList);
    });

    // Si hay al menos una materia sin grupos, no generamos combinaciones
    if (missingCourses.length > 0) {
        console.warn('generateValidCombinations: faltan grupos para courses:', missingCourses);
        return [];
    }

    // Producto cartesiano (cartesianProduct) sobre courseGroups
    const allCombinations = cartesianProduct(courseGroups);
    // Filtrar combinaciones válidas (sin choques)
    return allCombinations.filter(combination => isValidCombination(combination));
}

function cartesianProduct(arrays) {
    if (!arrays || arrays.length === 0) return [];
    // iterativo
    return arrays.reduce((acc, curr) => {
        const res = [];
        acc.forEach(a => {
            curr.forEach(c => {
                res.push(a.concat([c]));
            });
        });
        return res;
    }, [[]]);
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
            if (!s1 || !s2) continue;
            if (s1.day === s2.day) {
                const start1 = timeToMinutes(s1.start);
                const end1 = timeToMinutes(s1.end);
                const start2 = timeToMinutes(s2.start);
                const end2 = timeToMinutes(s2.end);
                if (Number.isNaN(start1) || Number.isNaN(end1) || Number.isNaN(start2) || Number.isNaN(end2)) {
                    // Datos inválidos — considerar conflicto para mayor seguridad
                    return true;
                }
                // Verificar solapamiento (permitir que uno termine exactamente cuando empieza otro)
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
    if (!container) return;

    if (!appState.generatedCombinations || appState.generatedCombinations.length === 0) {
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
    document.querySelectorAll('#combinations-list input[type="checkbox"]').forEach(checkbox => checkbox.checked = true);
}
function clearAllCombinations() {
    document.querySelectorAll('#combinations-list input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
}
function handleCombinationSelection() { /* placeholder */ }

function previewCombination(index) {
    if (!appState.generatedCombinations || index < 0 || index >= appState.generatedCombinations.length) return;
    const combination = appState.generatedCombinations[index];
    appState.currentPreview = { combination, index };
    renderSchedulePreview(combination, index + 1);
    document.querySelectorAll('.combination-item').forEach(item => item.classList.remove('selected'));
    const items = document.querySelectorAll('.combination-item');
    if (items[index]) items[index].classList.add('selected');
}

// Render de previsualización y resumen
function renderSchedulePreview(combination, combinationNumber) {
    const gridContainer = document.getElementById('schedule-grid');
    const summaryContainer = document.getElementById('schedule-summary');
    const previewInfo = document.getElementById('preview-info');
    if (previewInfo) previewInfo.textContent = `Combinación ${combinationNumber}`;
    if (gridContainer) gridContainer.innerHTML = createScheduleTable(combination);
    if (summaryContainer) summaryContainer.innerHTML = createScheduleSummary(combination);
}

// Crear tabla de horarios a partir de una combinación completa
function createScheduleTable(combination) {
    // Validaciones rápidas
    if (!Array.isArray(DAYS) || !Array.isArray(TIME_SLOTS)) {
        console.warn('DAYS o TIME_SLOTS no definidos correctamente.');
        return `<div class="empty-state"><p>Configuración de días/horarios inválida.</p></div>`;
    }
    // Matriz [timeIndex][dayIndex]
    const rows = TIME_SLOTS.length;
    const cols = DAYS.length;
    const schedule = Array.from({length: rows}, () => Array.from({length: cols}, () => null));

    const courseColors = {};
    let colorIndex = 0;

    // Asignar colores y rellenar matriz
    combination.forEach(group => {
        if (!group || !Array.isArray(group.schedules)) return;
        if (!courseColors[group.courseCode]) {
            courseColors[group.courseCode] = colorIndex + 1;
            colorIndex = (colorIndex + 1) % 10;
        }
        group.schedules.forEach(scheduleItem => {
            const dayIndex = DAYS.indexOf(scheduleItem.day);
            const startIndex = getTimeSlotIndex(scheduleItem.start);
            const endIndex = getTimeSlotIndex(scheduleItem.end);
            // Debug: si cualquiera -1, emitir advertencia y continuar
            if (dayIndex === -1 || startIndex === -1 || endIndex === -1) {
                console.warn('createScheduleTable: horario ignorado por índice inválido', {
                    course: group.courseCode,
                    group: group.group,
                    scheduleItem, dayIndex, startIndex, endIndex
                });
                return;
            }
            // En algunos casos endIndex puede ser igual a startIndex (si ambos caen en el mismo slot),
            // en ese caso al menos ocupamos 1 slot visualmente: usar Math.max(1, endIndex - startIndex)
            let height = endIndex - startIndex;
            if (height <= 0) {
                // si endIndex === startIndex => probablemente el end cae dentro del mismo slot
                // entonces ocupamos 1 slot visual
                height = 1;
            }
            const colorClass = `color-${courseColors[group.courseCode]}`;
            const blockData = {
                courseName: formatCourseName(group.courseName),
                group: group.group,
                colorClass,
                height
            };
            for (let i = startIndex; i < startIndex + height && i < rows; i++) {
                schedule[i][dayIndex] = (i === startIndex) ? blockData : 'occupied';
            }
        });
    });

    // Generar HTML de tabla
    let tableHTML = `
        <div class="schedule-preview">
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
        tableHTML += `<tr><td class="time-slot">${timeSlot.start}<br>${timeSlot.end}</td>`;
        for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex++) {
            const cell = schedule[timeIndex][dayIndex];
            if (cell === 'occupied') {
                tableHTML += '<td style="border:none;"></td>';
            } else if (cell && typeof cell === 'object') {
                // alto visual (multiplicador 38px por slot, igual que tu diseño original)
                const heightPx = cell.height * 38;
                tableHTML += `
                    <td style="padding:0; position:relative; height:${heightPx + 2}px; border:none;">
                        <div class="schedule-block ${cell.colorClass}" style="height:${heightPx}px; top:1px;">
                            <div class="course-name">${cell.courseName}</div>
                            <div class="group-info">Grupo ${cell.group}</div>
                        </div>
                    </td>
                `;
            } else {
                tableHTML += '<td></td>';
            }
        }
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table></div>';
    return tableHTML;
}

function createScheduleSummary(combination) {
    const totalCredits = combination.reduce((sum, group) => {
        return sum + (appState.selectedCourses[group.courseCode]?.creditos || 0);
    }, 0);

    const courseColors = {};
    let colorIndex = 0;

    const legendHTML = combination.map(group => {
        if (!courseColors[group.courseCode]) {
            courseColors[group.courseCode] = colorIndex + 1;
            colorIndex = (colorIndex + 1) % 10;
        }
        const scheduleText = group.schedules.map(s => `${s.day} ${s.start}-${s.end}`).join(', ');
        return `
            <div class="legend-item">
                <div class="legend-color color-${courseColors[group.courseCode]}" style="background: var(--course-color-${courseColors[group.courseCode]});"></div>
                <div class="legend-info">
                    <div class="legend-name">${group.courseName}</div>
                    <div class="legend-details">
                        <span class="legend-group">Grupo ${group.group}</span>
                        <span class="legend-credits">${appState.selectedCourses[group.courseCode]?.creditos || 0} créditos</span>
                    </div>
                    <div class="legend-schedules">${scheduleText}</div>
                </div>
            </div>
        `;
    }).join('');

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
        <div class="courses-legend">${legendHTML}</div>
    `;
}

// ===== EXPORT / IMPORT =====
function exportarConfiguracion() {
    const config = {
        selectedSemesters: appState.selectedSemesters,
        selectedCourses: appState.selectedCourses,
        courseSchedules: appState.courseSchedules
    };
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'configuracion-horarios.json');
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    showToast('Configuración exportada exitosamente');
}

function importarConfiguracion() {
    const input = document.getElementById('file-input');
    if (input) input.click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            if (!config.selectedSemesters || !config.selectedCourses || !config.courseSchedules) throw new Error('Formato inválido');
            appState.selectedSemesters = config.selectedSemesters;
            appState.selectedCourses = config.selectedCourses;
            appState.courseSchedules = config.courseSchedules;
            renderSemesters();
            renderCourses();
            updateCreditsCounter();
            updateCoursesCounter();
            updateCourseSelect();
            renderCurrentConfiguration();
            showToast('Configuración importada exitosamente');
        } catch (error) {
            showToast('Error al importar configuración: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ===== EXPORT PDF / PNG (sin cambios lógicos importantes) =====
function exportSelectedPDF() {
    const selectedIndexes = getSelectedCombinations();
    if (selectedIndexes.length === 0) {
        showToast('Selecciona al menos una combinación para exportar', 'warning');
        return;
    }
    showToast('Generando PDF...', 'warning');
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        showToast('jsPDF no está cargado', 'error');
        return;
    }
    const pdf = new jsPDF('l', 'mm', 'a4');
    selectedIndexes.forEach((index, pageIndex) => {
        if (pageIndex > 0) pdf.addPage();
        const combination = appState.generatedCombinations[index];
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '1200px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.padding = '20px';
        tempDiv.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="margin:0; color:#1e293b;">Combinación ${index + 1} - Horario de Clases</h1>
                <p style="margin:10px 0; color:#64748b;">Ingeniería Industrial</p>
            </div>
            ${createScheduleTable(combination)}
            ${createScheduleSummary(combination)}
        `;
        document.body.appendChild(tempDiv);
        html2canvas(tempDiv, { scale: 2, useCORS: true, allowTaint: false }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            document.body.removeChild(tempDiv);
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
    if (!previewElement) {
        showToast('No hay previsualización disponible', 'error');
        return;
    }
    html2canvas(previewElement, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' }).then(canvas => {
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
    document.querySelectorAll('#combinations-list input[type="checkbox"]:checked').forEach(checkbox => {
        const id = checkbox.id || '';
        const parts = id.split('-');
        const idx = parseInt(parts[1]);
        if (!Number.isNaN(idx)) selected.push(idx);
    });
    return selected;
}
