// script.js (completo) - Renderizado por minutos (pixel-perfect) y combinaciones robustas
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
function generateSchedules() {
    const missing = [];
    Object.keys(appState.selectedCourses).forEach(code => {
        if (!appState.courseSchedules[code] || Object.keys(appState.courseSchedules[code]).length === 0) {
            missing.push(appState.selectedCourses[code]?.nombre || code);
        }
    });
    if (missing.length > 0) { showToast('Faltan horarios para: ' + missing.join(', '), 'error'); return; }
    const combos = generateValidCombinations();
    appState.generatedCombinations = combos;
    renderCombinationsList();
    showToast(`Se encontraron ${combos.length} combinaciones válidas`);
}

function generateValidCombinations() {
    const courseCodes = Object.keys(appState.selectedCourses);
    const courseGroups = [];
    for (const code of courseCodes) {
        const groupsObj = appState.courseSchedules[code];
        if (!groupsObj || Object.keys(groupsObj).length === 0) {
            console.warn('Faltan grupos para', code); return [];
        }
        const list = Object.values(groupsObj).map(g => ({...g, courseCode: code, courseName: appState.selectedCourses[code]?.nombre || code}));
        courseGroups.push(list);
    }
    // producto cartesiano
    const all = cartesianProduct(courseGroups);
    return all.filter(isValidCombination);
}

function cartesianProduct(arrays) {
    return arrays.reduce((acc, cur) => acc.flatMap(a => cur.map(c => [...a, c])), [[]]);
}

function isValidCombination(comb) {
    for (let i=0;i<comb.length;i++){
        for (let j=i+1;j<comb.length;j++){
            if (schedulesConflict(comb[i].schedules, comb[j].schedules)) return false;
        }
    }
    return true;
}

function schedulesConflict(s1, s2) {
    for (const a of s1) {
        for (const b of s2) {
            if (a.day === b.day) {
                const a1 = timeToMinutes(a.start), a2 = timeToMinutes(a.end), b1 = timeToMinutes(b.start), b2 = timeToMinutes(b.end);
                if (isNaN(a1)||isNaN(a2)||isNaN(b1)||isNaN(b2)) return true;
                if (!(a2 <= b1 || b2 <= a1)) return true;
            }
        }
    }
    return false;
}

// ------------------------------
// Previsualización - Pixel-perfect por minutos
// ------------------------------
function previewCombination(index) {
    if (!appState.generatedCombinations || index<0 || index>=appState.generatedCombinations.length) return;
    const combination = appState.generatedCombinations[index];
    appState.currentPreview = { combination, index };
    renderSchedulePreview(combination, index+1);
}

function renderSchedulePreview(combination, number) {
    const grid = document.getElementById('schedule-grid');
    const summary = document.getElementById('schedule-summary');
    const info = document.getElementById('preview-info');
    if (info) info.textContent = `Combinación ${number}`;
    if (grid) grid.innerHTML = createMinutePreciseScheduleHTML(combination);
    if (summary) summary.innerHTML = createScheduleSummary(combination);
}

function createMinutePreciseScheduleHTML(combination) {
    // calcular límites (minStart, maxEnd)
    let minStart = Infinity, maxEnd = -Infinity;
    if (Array.isArray(TIME_SLOTS) && TIME_SLOTS.length>0) {
        const s = timeToMinutes(TIME_SLOTS[0].start);
        const e = timeToMinutes(TIME_SLOTS[TIME_SLOTS.length-1].end);
        if (!isNaN(s) && !isNaN(e)) { minStart = Math.min(minStart, s); maxEnd = Math.max(maxEnd, e); }
    }
    combination.forEach(g => {
        (g.schedules || []).forEach(s => {
            const a = timeToMinutes(s.start), b = timeToMinutes(s.end);
            if (!isNaN(a) && !isNaN(b)) { minStart = Math.min(minStart, a); maxEnd = Math.max(maxEnd, b); }
        });
    });
    if (!isFinite(minStart) || !isFinite(maxEnd) || maxEnd <= minStart) { minStart = 7*60; maxEnd = 21*60; }

    const totalMinutes = maxEnd - minStart;
    const MIN_PX = 400, MAX_PX = 1400;
    // referencia visual basada en TIME_SLOTS length
    let refPx = (Array.isArray(TIME_SLOTS) && TIME_SLOTS.length>0) ? TIME_SLOTS.length * 40 : 640;
    refPx = Math.max(MIN_PX, Math.min(MAX_PX, refPx));
    const perMinutePx = refPx / totalMinutes;
    const gridHeightPx = Math.ceil(totalMinutes * perMinutePx);

    // palette
    const palette = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#0ea5a0','#ef6c00'];
    const colorMap = {}; let colorIdx = 0;

    // Build HTML: container with time column and days columns; blocks positioned absolutely
    let html = `<div class="minute-schedule-wrapper" style="width:100%;position:relative;">`;
    html += `<div style="display:flex; gap:12px; align-items:flex-start;">`;

    // time column
    html += `<div class="time-column" style="width:92px; position:relative; height:${gridHeightPx}px;">`;
    if (Array.isArray(TIME_SLOTS) && TIME_SLOTS.length>0) {
        TIME_SLOTS.forEach(slot => {
            const top = Math.round((timeToMinutes(slot.start) - minStart) * perMinutePx);
            html += `<div style="position:absolute; left:8px; top:${top}px; font-size:12px; color:#0f172a;">${slot.start}</div>`;
        });
    } else {
        for (let t = Math.ceil(minStart/60)*60; t<=maxEnd; t+=60) {
            const top = Math.round((t - minStart) * perMinutePx);
            html += `<div style="position:absolute; left:8px; top:${top}px; font-size:12px; color:#0f172a;">${minutesToTime(t)}</div>`;
        }
    }
    html += `</div>`; // end time column

    // days area (columns)
    html += `<div class="days-area" style="flex:1; position:relative; height:${gridHeightPx}px; display:flex; gap:12px;">`;
    DAYS.forEach(day => {
        html += `<div class="day-col" data-day="${day}" style="flex:1; position:relative;"></div>`;
    });
    // overlay with horizontal slot lines
    html += `<div style="position:absolute; left:0; right:0; top:0; height:${gridHeightPx}px; pointer-events:none;">`;
    if (Array.isArray(TIME_SLOTS) && TIME_SLOTS.length>0) {
        TIME_SLOTS.forEach(slot => {
            const top = Math.round((timeToMinutes(slot.start) - minStart) * perMinutePx);
            const h = Math.max(1, Math.round((timeToMinutes(slot.end) - timeToMinutes(slot.start)) * perMinutePx));
            html += `<div style="position:absolute; left:0; right:0; top:${top}px; height:${h}px; border-bottom:1px solid rgba(15,23,42,0.04);"></div>`;
        });
    }
    html += `</div>`; // overlay

    // blocks container (absolute overlay positioned on top of day columns)
    html += `<div class="blocks-overlay" style="position:absolute; left:104px; right:0; top:0; height:${gridHeightPx}px; pointer-events:auto;">`;
    // left offset of overlay is approx time column width + gap (92 + 12)
    // calculate each block absolute left in percent relative to overlay width
    combination.forEach(g => {
        if (!colorMap[g.courseCode]) { colorMap[g.courseCode] = palette[colorIdx % palette.length]; colorIdx++; }
    });
    combination.forEach(g => {
        const colIndexBase = DAYS.reduce((acc,d,i) => { if (d === d) return acc; return acc; }, 0); // placeholder
        (g.schedules || []).forEach(s => {
            const dIdx = DAYS.indexOf(s.day);
            if (dIdx === -1) { console.warn('día desconocido', s); return; }
            const sMin = timeToMinutes(s.start), eMin = timeToMinutes(s.end);
            if (isNaN(sMin) || isNaN(eMin) || eMin <= sMin) { console.warn('horario inválido', s); return; }
            const top = Math.round((sMin - minStart) * perMinutePx);
            const height = Math.max(6, Math.round((eMin - sMin) * perMinutePx));
            const leftPercent = (dIdx / DAYS.length) * 100;
            const widthPercent = (1 / DAYS.length) * 100;
            const bgcolor = colorMap[g.courseCode];
            const safeName = (g.courseName || g.courseCode || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            html += `<div class="schedule-block" style="
                position:absolute;
                left:${leftPercent}%;
                width:${widthPercent}%;
                top:${top}px;
                height:${height}px;
                padding:6px;
                box-sizing:border-box;
                transform:translateX(${(100/DAYS.length)*0.02}%);
            ">
                <div style="background:${bgcolor};color:white;border-radius:8px;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4px;font-weight:700;overflow:hidden;">
                    <div style="font-size:12px;line-height:1.05;">${safeName}</div>
                    <div style="font-size:11px;opacity:0.95;margin-top:4px;">Grupo ${g.group}</div>
                </div>
            </div>`;
        });
    });
    html += `</div>`; // blocks overlay

    html += `</div>`; // end days-area
    html += `</div>`; // end row
    html += `</div>`; // wrapper

    return html;
}

// ------------------------------
// Resumen / leyenda
// ------------------------------
function createScheduleSummary(combination) {
    const totalCredits = combination.reduce((s,g)=> s + (appState.selectedCourses[g.courseCode]?.creditos || 0), 0);
    const items = combination.map(g => {
        const schedules = (g.schedules || []).map(s => `${s.day} ${s.start}-${s.end}`).join(', ');
        return `<div class="legend-item" style="background:#fff;padding:12px;border-radius:10px;margin-bottom:10px;">
            <div style="font-weight:800;">${g.courseName}</div>
            <div style="font-size:13px;color:#0f172a99;">Grupo ${g.group} • ${appState.selectedCourses[g.courseCode]?.creditos || 0} créditos</div>
            <div style="margin-top:6px;color:#334155;">${schedules}</div>
        </div>`;
    }).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h4>Resumen del Horario</h4>
        <div style="text-align:right">
            <div style="font-size:18px;font-weight:900">${totalCredits}</div>
            <div style="font-size:12px;color:#64748b">Créditos Totales</div>
        </div>
    </div><div>${items}</div>`;
}

// ------------------------------
// Combinaciones UI
// ------------------------------
function renderCombinationsList() {
    const container = document.getElementById('combinations-list'); if (!container) return;
    container.innerHTML = '';
    if (!appState.generatedCombinations || appState.generatedCombinations.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Genera las combinaciones</p></div>`; return;
    }
    appState.generatedCombinations.forEach((c,i) => {
        const wrap = document.createElement('div'); wrap.className = 'combination-item';
        wrap.innerHTML = `<label style="margin-right:8px;"><input type="checkbox" id="comb-${i}"> Combinación ${i+1}</label> <button class="btn" onclick="previewCombination(${i})">Ver</button>`;
        container.appendChild(wrap);
    });
}

function getSelectedCombinations() {
    const res = [];
    document.querySelectorAll('#combinations-list input[type="checkbox"]:checked').forEach(cb => {
        const id = cb.id || ''; const parts = id.split('-'); const idx = parseInt(parts[1]);
        if (!isNaN(idx)) res.push(idx);
    });
    return res;
}

// ------------------------------
// Export / Import (JSON) y export PNG
// ------------------------------
function exportarConfiguracion() {
    const cfg = { selectedSemesters: appState.selectedSemesters, selectedCourses: appState.selectedCourses, courseSchedules: appState.courseSchedules };
    const dataStr = JSON.stringify(cfg, null, 2);
    const link = document.createElement('a'); link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr); link.download = 'configuracion-horarios.json'; link.click();
    showToast('Configuración exportada');
}
function importarConfiguracion() {
    const input = document.getElementById('file-input');
    if (!input) {
        const fake = document.createElement('input'); fake.type = 'file'; fake.accept='application/json'; fake.onchange = handleFileImport; fake.click(); return;
    }
    input.click();
}
function handleFileImport(e) {
    const file = e.target.files ? e.target.files[0] : null; if (!file) return;
    const reader = new FileReader(); reader.onload = ev => {
        try {
            const cfg = JSON.parse(ev.target.result);
            if (!cfg.selectedSemesters || !cfg.selectedCourses || !cfg.courseSchedules) throw new Error('Formato inválido');
            appState.selectedSemesters = cfg.selectedSemesters;
            appState.selectedCourses = cfg.selectedCourses;
            appState.courseSchedules = cfg.courseSchedules;
            renderSemesters(); renderCourses(); updateCreditsCounter(); updateCoursesCounter(); updateCourseSelect(); renderCurrentConfiguration();
            showToast('Configuración importada');
        } catch (err) { showToast('Error importando: ' + err.message, 'error'); }
    }; reader.readAsText(file);
}

// Generar PNG de la vista actual (requiere html2canvas cargado)
function exportSelectedPNG() {
    if (!appState.currentPreview) { showToast('Visualiza una combinación primero', 'warning'); return; }
    const wrapper = document.querySelector('.minute-schedule-wrapper') || document.getElementById('schedule-grid');
    if (!wrapper) { showToast('No hay previsualización', 'error'); return; }
    if (typeof html2canvas === 'undefined') { showToast('html2canvas no cargado', 'error'); return; }
    html2canvas(wrapper, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `horario-${appState.currentPreview.index+1}.png`; link.click();
        showToast('PNG generado');
    }).catch(e => showToast('Error generando PNG: ' + e.message, 'error'));
}

// ------------------------------
// Init log
// ------------------------------
console.log('script.js minute-precise cargado.');
