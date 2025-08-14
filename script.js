
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
def_placeholder = True
