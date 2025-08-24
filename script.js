// script.js (complete) - Renderizado por minutos (pixel-perfect) y combinaciones robustas
// Reemplaza tu script.js con este archivo.
// Requisitos (debes tener en data.js): PLAN_ESTUDIOS, DAYS, TIME_SLOTS, GROUPS
// Si faltan, el script crea valores por defecto mínimos.
// Autor: ChatGPT (GPT-5 Thinking mini) - Versión: minute-precise

// ------------------------------
// Estado de la aplicación
// ------------------------------
let appState = {
    selectedSemesters: [],
    selectedCourses: {},
    courseSchedules: {}, // {courseCode: {A: {group:'A', schedules:[{day,start,end},...]}, ...}}
    generatedCombinations: [],
    currentPreview: null
};

// ------------------------------
// Inicialización
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Si faltan constantes definidas en data.js, usar valores por defecto apropiados:
    if (typeof DAYS === 'undefined') {
        console.warn('DAYS no definido: usando valores por defecto Lunes-Viernes');
        window.DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
    }
    if (typeof TIME_SLOTS === 'undefined') {
        console.warn('TIME_SLOTS no definido: usando slots por defecto (07:00-21:00).');
        const defaultSlots = [
            ['07:00','07:50'], ['07:50','08:40'], ['08:50','09:40'], ['09:40','10:30'],
            ['10:40','11:30'], ['11:30','12:20'], ['12:20','13:10'], ['13:10','14:00'],
            ['14:00','14:50'], ['14:50','15:40'], ['15:50','16:40'], ['16:40','17:30'],
            ['17:40','18:30'], ['18:30','19:20'], ['19:20','20:10'], ['20:10','21:00']
        ];
        window.TIME_SLOTS = defaultSlots.map(s => ({start: s[0], end: s[1]}));
    }
    if (typeof GROUPS === 'undefined') {
        window.GROUPS = ['A','B','C','D','E','F'];
    }
    initializeApp();
});

// ------------------------------
// Utilidades
// ------------------------------
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.style.zIndex = 9999;
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.bottom = '20px';
    toast.style.background = type === 'error' ? '#fee2e2' : (type === 'warning' ? '#fff7ed' : '#ecfccb');
    toast.style.border = '1px solid rgba(0,0,0,0.06)';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 8px 20px rgba(2,6,23,0.08)';
    toast.innerHTML = `<strong style="display:block;margin-bottom:4px;">${type.toUpperCase()}</strong><div style="font-size:13px;">${message}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { try { document.body.removeChild(toast); } catch(e){} }, 400);
    }, 3000);
}

function timeToMinutes(t) {
    if (!t || typeof t !== 'string') return NaN;
    const parts = t.split(':').map(x => parseInt(x, 10));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return NaN;
    return parts[0] * 60 + parts[1];
}

function minutesToTime(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Función corregida equivalente al hora_a_index de Python
function timeToIndex(time) {
    // Primero buscar coincidencia exacta con el inicio de algún slot
    for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
        if (time === TIME_SLOTS[idx].start) {
            return idx;
        }
    }
    
    // Si no hay coincidencia exacta, buscar el slot que contiene esta hora
    const timeMinutes = timeToMinutes(time);
    if (isNaN(timeMinutes)) return null;
    
    for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
        const startMinutes = timeToMinutes(TIME_SLOTS[idx].start);
        const endMinutes = timeToMinutes(TIME_SLOTS[idx].end);
        
        if (timeMinutes >= startMinutes && timeMinutes <= endMinutes) {
            return idx;
        }
    }
    
    return null;
}

// Función para encontrar el índice donde termina una clase
function findEndIndex(endTime) {
    // Buscar el slot donde esta hora de fin coincide con el final del slot
    for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
        if (endTime === TIME_SLOTS[idx].end) {
            return idx + 1; // +1 porque necesitamos el índice después del slot
        }
    }
    
    // Si no hay coincidencia exacta, buscar el slot que contiene esta hora de fin
    const timeMinutes = timeToMinutes(endTime);
    if (isNaN(timeMinutes)) return null;
    
    for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
        const startMinutes = timeToMinutes(TIME_SLOTS[idx].start);
        const endMinutes = timeToMinutes(TIME_SLOTS[idx].end);
        
        if (timeMinutes > startMinutes && timeMinutes <= endMinutes) {
            return idx + 1;
        }
    }
    
    return null;
}

// ------------------------------
// Inicializar app (UI bindings)
// ------------------------------
function initializeApp() {
    try {
        renderSemesters();
        updateCreditsCounter();
        updateCoursesCounter();
        const select = document.getElementById('course-select');
        if (select) select.addEventListener('change', loadCourseSchedule);
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.addEventListener('change', handleFileImport);
    } catch (e) {
        console.error('initializeApp error:', e);
    }
}

// ------------------------------
// Semestres y cursos
// ------------------------------
function renderSemesters() {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    container.innerHTML = '';
    const keys = typeof PLAN_ESTUDIOS !== 'undefined' ? Object.keys(PLAN_ESTUDIOS) : [];
    keys.forEach(sem => {
        const id = 'sem-' + sem.replace(/\s+/g,'_');
        const div = document.createElement('div');
        div.className = 'semester-item';
        div.innerHTML = `<div class="semester-checkbox"><input type="checkbox" id="${id}" onchange="handleSemesterChange('${sem}')"><label for="${id}">${sem}</label></div>`;
        container.appendChild(div);
    });
}

function handleSemesterChange(semester) {
    const id = 'sem-' + semester.replace(/\s+/g,'_');
    const cb = document.getElementById(id);
    if (!cb) return;
    if (cb.checked) {
        if (appState.selectedSemesters.length > 0) {
            const curr = appState.selectedSemesters[0].includes('Primer Semestre') ? 'impar' : 'par';
            const neu = semester.includes('Primer Semestre') ? 'impar' : 'par';
            if (curr !== neu) {
                showToast('No puedes mezclar semestres pares e impares', 'warning');
                cb.checked = false;
                return;
            }
        }
        appState.selectedSemesters.push(semester);
    } else {
        appState.selectedSemesters = appState.selectedSemesters.filter(s => s !== semester);
        if (typeof PLAN_ESTUDIOS !== 'undefined' && PLAN_ESTUDIOS[semester]) {
            Object.keys(PLAN_ESTUDIOS[semester]).forEach(code => {
                delete appState.selectedCourses[code];
                delete appState.courseSchedules[code];
            });
        }
    }
    renderCourses();
    updateCreditsCounter();
    updateCoursesCounter();
}

function renderCourses() {
    const container = document.getElementById('courses-container');
    if (!container) return;
    container.innerHTML = '';
    if (!appState.selectedSemesters || appState.selectedSemesters.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>Selecciona un semestre</p></div>`;
        return;
    }
    appState.selectedSemesters.forEach(sem => {
        const section = document.createElement('div'); section.className = 'semester-section';
        const title = document.createElement('div'); title.className = 'semester-title'; title.textContent = sem;
        section.appendChild(title);
        const grid = document.createElement('div'); grid.className = 'courses-grid';
        const cursos = (typeof PLAN_ESTUDIOS !== 'undefined' && PLAN_ESTUDIOS[sem]) ? PLAN_ESTUDIOS[sem] : {};
        Object.entries(cursos).forEach(([code, info]) => {
            const item = document.createElement('div'); item.className = 'course-item';
            item.innerHTML = `<div class="course-checkbox">
                <input type="checkbox" id="course-${code}" onchange="handleCourseChange('${code}')">
                <div class="course-info"><h3>${info.nombre}</h3><div class="course-meta"><span>${code}</span> - <span>${info.creditos} créditos</span></div></div>
            </div>`;
            grid.appendChild(item);
        });
        section.appendChild(grid); container.appendChild(section);
    });
}

function handleCourseChange(code) {
    const cb = document.getElementById(`course-${code}`);
    if (!cb) return;
    if (cb.checked) {
        let found = null;
        if (typeof PLAN_ESTUDIOS !== 'undefined') {
            for (const sem of Object.keys(PLAN_ESTUDIOS)) {
                if (PLAN_ESTUDIOS[sem][code]) { found = PLAN_ESTUDIOS[sem][code]; break; }
            }
        }
        if (found) { appState.selectedCourses[code] = found; if (!appState.courseSchedules[code]) appState.courseSchedules[code] = {}; }
    } else {
        delete appState.selectedCourses[code];
        delete appState.courseSchedules[code];
    }
    updateCreditsCounter(); updateCoursesCounter(); updateCourseSelect();
}

function updateCreditsCounter() {
    const total = Object.values(appState.selectedCourses).reduce((s,c)=> s + (c.creditos||0), 0);
    const el = document.getElementById('total-credits'); if (el) el.textContent = total;
}

function updateCoursesCounter() {
    const el = document.getElementById('selected-courses-count'); if (el) el.textContent = Object.keys(appState.selectedCourses).length;
}

// ------------------------------
// Editor de horarios
// ------------------------------
function updateCourseSelect() {
    const sel = document.getElementById('course-select'); if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona un curso --</option>';
    Object.entries(appState.selectedCourses).forEach(([code, info]) => {
        const o = document.createElement('option'); o.value = code; o.textContent = `${code} - ${info.nombre}`; sel.appendChild(o);
    });
}

function loadCourseSchedule() {
    const sel = document.getElementById('course-select'); const editor = document.getElementById('schedule-editor');
    if (!editor) return;
    const code = sel ? sel.value : '';
    if (!code) { editor.innerHTML = `<div class="empty-state"><p>Selecciona un curso</p></div>`; return; }
    if (!appState.courseSchedules[code]) appState.courseSchedules[code] = {};
    const nombre = appState.selectedCourses[code]?.nombre || code;
    editor.innerHTML = `<div class="course-schedule-header"><h3>${nombre}</h3></div>
        <div id="groups-container-${code}" class="groups-container">${GROUPS.map(g => createGroupCard(code,g)).join('')}</div>
        <div style="text-align:center;margin-top:1rem;"><button class="btn" onclick="saveCourseSchedule('${code}')">💾 Guardar Configuración</button></div>`;
}

function createGroupCard(courseCode, group) {
    const schedules = (appState.courseSchedules[courseCode] && appState.courseSchedules[courseCode][group]) ? appState.courseSchedules[courseCode][group].schedules : [];
    const enabled = !!(appState.courseSchedules[courseCode] && appState.courseSchedules[courseCode][group]);
    return `<div class="group-card">
        <div class="group-header"><input type="checkbox" id="group-${courseCode}-${group}" ${enabled ? 'checked' : ''} onchange="toggleGroup('${courseCode}','${group}')"><label for="group-${courseCode}-${group}">Grupo ${group}</label></div>
        <div id="schedules-${courseCode}-${group}" class="group-schedules">${schedules.map((s,i)=> createScheduleItem(courseCode,group,i,s)).join('')}</div>
        <button class="add-schedule-btn" onclick="addSchedule('${courseCode}','${group}')">➕ Agregar Horario</button>
    </div>`;
}

function createScheduleItem(code, group, index, s = {}) {
    return `<div class="schedule-item" id="schedule-${code}-${group}-${index}">
        <select onchange="updateSchedule('${code}','${group}',${index},'day',this.value)">${['','Lunes','Martes','Miércoles','Jueves','Viernes'].map(d=>`<option value="${d}" ${s.day===d?'selected':''}>${d}</option>`).join('')}</select>
        <input type="time" onchange="updateSchedule('${code}','${group}',${index},'start',this.value)" value="${s.start||''}">
        <input type="time" onchange="updateSchedule('${code}','${group}',${index},'end',this.value)" value="${s.end||''}">
        <button onclick="removeSchedule('${code}','${group}',${index})">🗑️</button>
    </div>`;
}

function toggleGroup(code, group) {
    if (!appState.courseSchedules[code]) appState.courseSchedules[code] = {};
    const cb = document.getElementById(`group-${code}-${group}`); if (!cb) return;
    if (cb.checked) { if (!appState.courseSchedules[code][group]) appState.courseSchedules[code][group] = {group, schedules: []}; }
    else delete appState.courseSchedules[code][group];
    loadCourseSchedule();
}

function addSchedule(code, group) {
    if (!appState.courseSchedules[code]) appState.courseSchedules[code] = {};
    if (!appState.courseSchedules[code][group]) appState.courseSchedules[code][group] = {group, schedules: []};
    appState.courseSchedules[code][group].schedules.push({day:'', start:'', end:''});
    loadCourseSchedule();
}

function removeSchedule(code, group, index) {
    if (!appState.courseSchedules[code] || !appState.courseSchedules[code][group]) return;
    appState.courseSchedules[code][group].schedules.splice(index,1);
    loadCourseSchedule();
}

function updateSchedule(code, group, index, field, value) {
    if (!appState.courseSchedules[code] || !appState.courseSchedules[code][group]) return;
    const arr = appState.courseSchedules[code][group].schedules;
    if (!arr[index]) return;
    arr[index][field] = value;
}

// Eliminar horarios incompletos al guardar
function saveCourseSchedule(code) {
    if (!appState.courseSchedules[code]) return;
    Object.entries(appState.courseSchedules[code]).forEach(([g,data]) => {
        data.schedules = data.schedules.filter(s => s.day && s.start && s.end);
        if (data.schedules.length === 0) delete appState.courseSchedules[code][g];
    });
    if (!appState.courseSchedules[code] || Object.keys(appState.courseSchedules[code]).length === 0) delete appState.courseSchedules[code];
    loadCourseSchedule(); renderCurrentConfiguration(); showToast('Configuración guardada');
}

function renderCurrentConfiguration() {
    const container = document.getElementById('current-config'); if (!container) return;
    container.innerHTML = '';
    if (!appState.courseSchedules || Object.keys(appState.courseSchedules).length===0) {
        container.innerHTML = `<div class="empty-state"><p>No hay configuraciones</p></div>`; return;
    }
    Object.entries(appState.courseSchedules).forEach(([code, groups]) => {
        const nombre = appState.selectedCourses[code]?.nombre || code;
        Object.entries(groups).forEach(([g,data]) => {
            const txt = data.schedules.map(s => `${s.day} ${s.start}-${s.end}`).join(', ');
            const div = document.createElement('div'); div.className = 'config-item';
            div.innerHTML = `<div class="config-course">${nombre}</div><div class="config-group">Grupo ${g}</div><div class="config-schedules">${txt}</div>`;
            container.appendChild(div);
        });
    });
}

// ------------------------------
// Generación de combinaciones
// ------------------------------
function generateCombinations() {
    const courses = Object.keys(appState.courseSchedules);
    if (courses.length === 0) {
        showToast('No hay cursos configurados', 'warning');
        return;
    }

    // Validar que todos los cursos tengan al menos un grupo
    for (const code of courses) {
        const groups = Object.keys(appState.courseSchedules[code]);
        if (groups.length === 0) {
            showToast(`El curso ${code} no tiene grupos configurados`, 'error');
            return;
        }
    }

    const combinations = [];
    
    // Generar todas las combinaciones posibles
    function generateCombinationsRecursive(courseIndex, currentCombination) {
        if (courseIndex === courses.length) {
            // Validar la combinación actual
            if (isValidCombination(currentCombination)) {
                combinations.push([...currentCombination]);
            }
            return;
        }

        const currentCourse = courses[courseIndex];
        const groups = Object.keys(appState.courseSchedules[currentCourse]);
        
        for (const group of groups) {
            const groupData = {
                course: currentCourse,
                group: group,
                schedules: appState.courseSchedules[currentCourse][group].schedules
            };
            
            currentCombination.push(groupData);
            generateCombinationsRecursive(courseIndex + 1, currentCombination);
            currentCombination.pop();
        }
    }

    generateCombinationsRecursive(0, []);
    
    appState.generatedCombinations = combinations;
    
    if (combinations.length === 0) {
        showToast('No se encontraron combinaciones válidas', 'warning');
        document.getElementById('schedule-display').innerHTML = '<div class="no-combinations">No hay combinaciones válidas</div>';
    } else {
        showToast(`Se generaron ${combinations.length} combinaciones`, 'success');
        appState.currentPreview = 0;
        displayCombination(0);
        updateCombinationNavigation();
    }
}

function isValidCombination(combination) {
    // Verificar que no hay choques de horarios
    for (let i = 0; i < combination.length; i++) {
        for (let j = i + 1; j < combination.length; j++) {
            if (schedulesOverlap(combination[i].schedules, combination[j].schedules)) {
                return false;
            }
        }
    }
    return true;
}

function schedulesOverlap(schedules1, schedules2) {
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

function displayCombination(index) {
    if (!appState.generatedCombinations || appState.generatedCombinations.length === 0) return;
    
    const combination = appState.generatedCombinations[index];
    const container = document.getElementById('schedule-display');
    if (!container) return;

    // Crear la grilla del horario
    let html = '<div class="schedule-grid">';
    
    // Header con los días
    html += '<div class="grid-header">';
    html += '<div class="grid-cell">Hora</div>';
    for (const day of DAYS) {
        html += `<div class="grid-cell">${day}</div>`;
    }
    html += '</div>';

    // Cuerpo de la grilla
    html += '<div class="grid-body">';
    
    // Columna de tiempo
    html += '<div class="time-column">';
    for (const slot of TIME_SLOTS) {
        html += `<div class="time-slot">${slot.start}-${slot.end}</div>`;
    }
    html += '</div>';

    // Columnas para cada día
    for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex++) {
        html += `<div class="day-column" id="day-${dayIndex}">`;
        // Los slots se llenan con JavaScript después de crear el HTML
        for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex++) {
            html += `<div class="slot-row" style="height: 50px;"></div>`;
        }
        html += '</div>';
    }
    
    html += '</div></div>';

    // Agregar leyenda
    html += '<div class="legend"><h4>Leyenda:</h4>';
    combination.forEach((item, idx) => {
        const courseName = appState.selectedCourses[item.course]?.nombre || item.course;
        const color = getColorForCourse(idx);
        html += `<div class="legend-item">
            <div class="legend-color" style="background-color: ${color};"></div>
            <div class="legend-text">${courseName} - Grupo ${item.group}</div>
        </div>`;
    });
    html += '</div>';

    // Información de créditos
    const totalCredits = combination.reduce((sum, item) => {
        return sum + (appState.selectedCourses[item.course]?.creditos || 0);
    }, 0);
    html += `<div class="credits-info">
        <h4>Total de Créditos: ${totalCredits}</h4>
    </div>`;

    container.innerHTML = html;

    // Ahora agregar los bloques de clases usando posición absoluta
    setTimeout(() => {
        combination.forEach((item, courseIndex) => {
            const courseName = appState.selectedCourses[item.course]?.nombre || item.course;
            const color = getColorForCourse(courseIndex);
            
            item.schedules.forEach(schedule => {
                const dayIndex = DAYS.indexOf(schedule.day);
                if (dayIndex === -1) return;
                
                const startIndex = timeToIndex(schedule.start);
                const endIndex = findEndIndex(schedule.end);
                
                if (startIndex !== null && endIndex !== null && endIndex > startIndex) {
                    const dayColumn = document.getElementById(`day-${dayIndex}`);
                    if (dayColumn) {
                        // Calcular la posición y altura del bloque
                        const slotHeight = 50; // Altura de cada slot en pixels
                        const top = startIndex * slotHeight;
                        const height = (endIndex - startIndex) * slotHeight;
                        
                        const classBlock = document.createElement('div');
                        classBlock.className = 'class-block';
                        classBlock.style.top = `${top}px`;
                        classBlock.style.height = `${height}px`;
                        classBlock.style.backgroundColor = color;
                        classBlock.style.border = '2px solid #333';
                        
                        // Texto del bloque
                        let displayName = courseName;
                        if (displayName.length > 25) {
                            const words = displayName.split(' ');
                            const midPoint = Math.ceil(words.length / 2);
                            displayName = words.slice(0, midPoint).join(' ') + '\n' + words.slice(midPoint).join(' ');
                        }
                        
                        classBlock.innerHTML = `
                            <div style="font-size: ${Math.min(12, Math.max(8, height / 6))}px; line-height: 1.2;">
                                ${displayName}<br>
                                <strong>Grupo ${item.group}</strong>
                            </div>
                        `;
                        
                        dayColumn.appendChild(classBlock);
                    }
                }
            });
        });
    }, 100);
}

function getColorForCourse(index) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        '#6C5CE7', '#A29BFE', '#FD79A8', '#E17055', '#00B894'
    ];
    return colors[index % colors.length];
}

function updateCombinationNavigation() {
    const info = document.getElementById('combination-info');
    const prevBtn = document.getElementById('prev-combination');
    const nextBtn = document.getElementById('next-combination');
    
    if (info) {
        info.textContent = `Combinación ${(appState.currentPreview || 0) + 1} de ${appState.generatedCombinations.length}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = (appState.currentPreview || 0) === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = (appState.currentPreview || 0) === appState.generatedCombinations.length - 1;
    }
}

function previousCombination() {
    if (appState.currentPreview > 0) {
        appState.currentPreview--;
        displayCombination(appState.currentPreview);
        updateCombinationNavigation();
    }
}

function nextCombination() {
    if (appState.currentPreview < appState.generatedCombinations.length - 1) {
        appState.currentPreview++;
        displayCombination(appState.currentPreview);
        updateCombinationNavigation();
    }
}

// ------------------------------
// Importación/Exportación
// ------------------------------
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.courseSchedules) {
                appState.courseSchedules = data.courseSchedules;
                showToast('Configuración importada exitosamente');
                renderCurrentConfiguration();
                updateCourseSelect();
            } else {
                showToast('Archivo inválido', 'error');
            }
        } catch (err) {
            showToast('Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
}

function exportConfiguration() {
    const data = {
        courseSchedules: appState.courseSchedules,
        selectedCourses: appState.selectedCourses,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horarios_configuracion.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Configuración exportada exitosamente');
}

function exportToPDF() {
    if (!appState.generatedCombinations || appState.generatedCombinations.length === 0) {
        showToast('No hay combinaciones para exportar', 'warning');
        return;
    }
    
    // Esta función requiere jsPDF para funcionar completamente
    // Por ahora, mostramos un mensaje
    showToast('Función de exportación PDF en desarrollo', 'info');
}

// ------------------------------
// Funciones auxiliares adicionales
// ------------------------------
function clearAllData() {
    if (confirm('¿Estás seguro de que quieres limpiar todos los datos?')) {
        appState.selectedSemesters = [];
        appState.selectedCourses = {};
        appState.courseSchedules = {};
        appState.generatedCombinations = [];
        appState.currentPreview = null;
        
        // Limpiar checkboxes de semestres
        document.querySelectorAll('input[id^="sem-"]').forEach(cb => cb.checked = false);
        
        // Limpiar checkboxes de cursos
        document.querySelectorAll('input[id^="course-"]').forEach(cb => cb.checked = false);
        
        renderCourses();
        updateCreditsCounter();
        updateCoursesCounter();
        updateCourseSelect();
        renderCurrentConfiguration();
        
        const scheduleDisplay = document.getElementById('schedule-display');
        if (scheduleDisplay) {
            scheduleDisplay.innerHTML = '<div class="loading">📅 Aquí aparecerán los horarios generados.<br>Agrega algunos cursos y presiona "Generar Horarios" para comenzar.</div>';
        }
        
        showToast('Todos los datos han sido limpiados');
    }
}

function validateScheduleInput(courseCode, group, schedules) {
    for (const schedule of schedules) {
        if (!schedule.day || !schedule.start || !schedule.end) {
            return { valid: false, message: `Horario incompleto en ${courseCode} grupo ${group}` };
        }
        
        const startMinutes = timeToMinutes(schedule.start);
        const endMinutes = timeToMinutes(schedule.end);
        
        if (isNaN(startMinutes) || isNaN(endMinutes)) {
            return { valid: false, message: `Horario inválido en ${courseCode} grupo ${group}` };
        }
        
        if (startMinutes >= endMinutes) {
            return { valid: false, message: `La hora de inicio debe ser anterior a la de fin en ${courseCode} grupo ${group}` };
        }
    }
    
    return { valid: true };
}

function getScheduleStats() {
    const totalCourses = Object.keys(appState.selectedCourses).length;
    const configuredCourses = Object.keys(appState.courseSchedules).length;
    const totalGroups = Object.values(appState.courseSchedules).reduce((sum, course) => {
        return sum + Object.keys(course).length;
    }, 0);
    
    return {
        totalCourses,
        configuredCourses,
        totalGroups,
        completionPercentage: totalCourses > 0 ? Math.round((configuredCourses / totalCourses) * 100) : 0
    };
}

function updateProgressIndicator() {
    const stats = getScheduleStats();
    const indicator = document.getElementById('progress-indicator');
    if (indicator) {
        indicator.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.completionPercentage}%"></div>
            </div>
            <div class="progress-text">
                ${stats.configuredCourses}/${stats.totalCourses} cursos configurados (${stats.totalGroups} grupos)
            </div>
        `;
    }
}

// Función para detectar conflictos potenciales antes de generar combinaciones
function detectPotentialConflicts() {
    const conflicts = [];
    const coursesList = Object.keys(appState.courseSchedules);
    
    for (let i = 0; i < coursesList.length; i++) {
        for (let j = i + 1; j < coursesList.length; j++) {
            const course1 = coursesList[i];
            const course2 = coursesList[j];
            
            const groups1 = Object.values(appState.courseSchedules[course1]);
            const groups2 = Object.values(appState.courseSchedules[course2]);
            
            let hasValidCombination = false;
            
            for (const group1 of groups1) {
                for (const group2 of groups2) {
                    if (!schedulesOverlap(group1.schedules, group2.schedules)) {
                        hasValidCombination = true;
                        break;
                    }
                }
                if (hasValidCombination) break;
            }
            
            if (!hasValidCombination) {
                conflicts.push({
                    course1: appState.selectedCourses[course1]?.nombre || course1,
                    course2: appState.selectedCourses[course2]?.nombre || course2
                });
            }
        }
    }
    
    return conflicts;
}

// Función para mostrar advertencias antes de generar combinaciones
function showConflictWarnings() {
    const conflicts = detectPotentialConflicts();
    
    if (conflicts.length > 0) {
        let message = 'Se detectaron conflictos potenciales entre los siguientes cursos:\n\n';
        conflicts.forEach(conflict => {
            message += `• ${conflict.course1} y ${conflict.course2}\n`;
        });
        message += '\nEstos cursos pueden no tener combinaciones válidas.';
        
        return confirm(message + '\n\n¿Deseas continuar de todos modos?');
    }
    
    return true;
}

// Función mejorada para generar combinaciones con validación previa
function generateCombinationsWithValidation() {
    const stats = getScheduleStats();
    
    if (stats.configuredCourses === 0) {
        showToast('No hay cursos configurados', 'warning');
        return;
    }
    
    if (stats.configuredCourses < stats.totalCourses) {
        if (!confirm(`Solo tienes ${stats.configuredCourses} de ${stats.totalCourses} cursos configurados. ¿Deseas continuar?`)) {
            return;
        }
    }
    
    // Validar todos los horarios antes de generar
    for (const [courseCode, groups] of Object.entries(appState.courseSchedules)) {
        for (const [groupKey, groupData] of Object.entries(groups)) {
            const validation = validateScheduleInput(courseCode, groupKey, groupData.schedules);
            if (!validation.valid) {
                showToast(validation.message, 'error');
                return;
            }
        }
    }
    
    // Mostrar advertencias de conflictos
    if (!showConflictWarnings()) {
        return;
    }
    
    // Mostrar indicador de carga
    const scheduleDisplay = document.getElementById('schedule-display');
    if (scheduleDisplay) {
        scheduleDisplay.innerHTML = '<div class="loading">⏳ Generando combinaciones...</div>';
    }
    
    // Generar combinaciones con un pequeño delay para mostrar el loading
    setTimeout(() => {
        generateCombinations();
    }, 100);
}

// Función para buscar combinaciones por criterios
function filterCombinations(criteria) {
    if (!appState.generatedCombinations || appState.generatedCombinations.length === 0) {
        showToast('No hay combinaciones generadas', 'warning');
        return;
    }
    
    let filtered = [...appState.generatedCombinations];
    
    if (criteria.minCredits || criteria.maxCredits) {
        filtered = filtered.filter(combination => {
            const totalCredits = combination.reduce((sum, item) => {
                return sum + (appState.selectedCourses[item.course]?.creditos || 0);
            }, 0);
            
            const meetsMin = !criteria.minCredits || totalCredits >= criteria.minCredits;
            const meetsMax = !criteria.maxCredits || totalCredits <= criteria.maxCredits;
            
            return meetsMin && meetsMax;
        });
    }
    
    if (criteria.avoidTimeSlots && criteria.avoidTimeSlots.length > 0) {
        filtered = filtered.filter(combination => {
            return !combination.some(item => {
                return item.schedules.some(schedule => {
                    const startMinutes = timeToMinutes(schedule.start);
                    const endMinutes = timeToMinutes(schedule.end);
                    
                    return criteria.avoidTimeSlots.some(avoidSlot => {
                        const avoidStart = timeToMinutes(avoidSlot.start);
                        const avoidEnd = timeToMinutes(avoidSlot.end);
                        
                        return !(endMinutes <= avoidStart || startMinutes >= avoidEnd);
                    });
                });
            });
        });
    }
    
    if (filtered.length === 0) {
        showToast('No se encontraron combinaciones que cumplan los criterios', 'info');
        return;
    }
    
    appState.generatedCombinations = filtered;
    appState.currentPreview = 0;
    displayCombination(0);
    updateCombinationNavigation();
    
    showToast(`${filtered.length} combinaciones cumplen los criterios`);
}

// Función para exportar combinación actual a PDF mejorada
function exportCurrentCombinationToPDF() {
    if (!appState.generatedCombinations || appState.currentPreview === null) {
        showToast('No hay combinación para exportar', 'warning');
        return;
    }
    
    const combination = appState.generatedCombinations[appState.currentPreview];
    const combinationNumber = appState.currentPreview + 1;
    
    try {
        // Verificar si jsPDF está disponible
        if (typeof window.jsPDF === 'undefined') {
            showToast('jsPDF no está cargado. Verifica que el script esté incluido.', 'error');
            return;
        }
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(18);
        doc.text(`Combinación ${combinationNumber} - Horario de Clases`, 20, 20);
        
        // Información de créditos
        const totalCredits = combination.reduce((sum, item) => {
            return sum + (appState.selectedCourses[item.course]?.creditos || 0);
        }, 0);
        
        doc.setFontSize(12);
        doc.text(`Total de Créditos: ${totalCredits}`, 20, 30);
        
        // Tabla de horarios (simplificada para PDF)
        let yPosition = 50;
        
        doc.setFontSize(14);
        doc.text('Horarios:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        combination.forEach((item, index) => {
            const courseName = appState.selectedCourses[item.course]?.nombre || item.course;
            doc.text(`${courseName} - Grupo ${item.group}`, 20, yPosition);
            yPosition += 8;
            
            item.schedules.forEach(schedule => {
                doc.text(`   ${schedule.day}: ${schedule.start} - ${schedule.end}`, 25, yPosition);
                yPosition += 6;
            });
            
            yPosition += 5; // Espaciado entre cursos
        });
        
        // Guardar el PDF
        doc.save(`horario_combinacion_${combinationNumber}.pdf`);
        showToast('PDF exportado exitosamente');
        
    } catch (error) {
        console.error('Error exportando PDF:', error);
        showToast('Error al exportar PDF', 'error');
    }
}

// Funciones de utilidad para el DOM
function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Función para debugging - mostrar estado actual
function debugAppState() {
    console.log('=== Estado actual de la aplicación ===');
    console.log('Semestres seleccionados:', appState.selectedSemesters);
    console.log('Cursos seleccionados:', appState.selectedCourses);
    console.log('Horarios configurados:', appState.courseSchedules);
    console.log('Combinaciones generadas:', appState.generatedCombinations.length);
    console.log('Vista previa actual:', appState.currentPreview);
    
    const stats = getScheduleStats();
    console.log('Estadísticas:', stats);
}

// Exponer funciones globales necesarias
window.handleSemesterChange = handleSemesterChange;
window.handleCourseChange = handleCourseChange;
window.loadCourseSchedule = loadCourseSchedule;
window.toggleGroup = toggleGroup;
window.addSchedule = addSchedule;
window.removeSchedule = removeSchedule;
window.updateSchedule = updateSchedule;
window.saveCourseSchedule = saveCourseSchedule;
window.generateCombinations = generateCombinationsWithValidation;
window.previousCombination = previousCombination;
window.nextCombination = nextCombination;
window.exportConfiguration = exportConfiguration;
window.exportToPDF = exportCurrentCombinationToPDF;
window.clearAllData = clearAllData;
window.debugAppState = debugAppState;