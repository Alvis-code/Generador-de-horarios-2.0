// script.js - Corregido (renderizado por slots, inclusivo en slot final) 
// Este archivo genera combinaciones, valida, y dibuja la tabla por SLOTS (no por minutos) 
// de forma equivalente al ejemplo Python. Corrige el problema de que bloques que van
// de e.g. 08:50 a 10:30 ocupen tanto 08:50-09:40 como 09:40-10:30.
// Guardar como script.js y reemplazar el actual.

// Estado global
let appState = {
    selectedSemesters: [],
    selectedCourses: {}, // {code: {nombre, creditos}}
    courseSchedules: {}, // {code: { A: {group:'A', schedules:[{día, inicio, fin}]}, ... } }
    generatedCombinations: [],
    currentPreview: null
};

// Requisitos: DATA en data.js -> PLAN_ESTUDIOS, DAYS, TIME_SLOTS, GROUPS
document.addEventListener('DOMContentLoaded', () => {
    if (typeof DAYS === 'undefined') {
        console.warn('DAYS no definido, usando Lunes-Viernes por defecto');
        window.DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
    }
    if (typeof TIME_SLOTS === 'undefined') {
        console.warn('TIME_SLOTS no definido: usando slots por defecto');
        const defaultSlots = [
            ['07:00','07:50'], ['07:50','08:40'], ['08:50','09:40'], ['09:40','10:30'],
            ['10:40','11:30'], ['11:30','12:20'], ['12:20','13:10'], ['13:10','14:00'],
            ['14:00','14:50'], ['14:50','15:40'], ['15:50','16:40'], ['16:40','17:30'],
            ['17:40','18:30'], ['18:30','19:20'], ['19:20','20:10'], ['20:10','21:00']
        ];
        window.TIME_SLOTS = defaultSlots.map(s => ({start: s[0], end: s[1]}));
    }
    if (typeof GROUPS === 'undefined') window.GROUPS = ['A','B','C','D','E','F'];
    initializeApp();
});

// ---------------- Utilities ----------------
function timeToMinutes(t) {
    if (!t) return NaN;
    const parts = t.split(':').map(x => parseInt(x,10));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return NaN;
    return parts[0]*60 + parts[1];
}

function showToast(msg, type='info') {
    console.log(type.toUpperCase(), msg);
    // minimal visual toast
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.position = 'fixed';
    div.style.right = '20px';
    div.style.bottom = '20px';
    div.style.background = type==='error' ? '#fee2e2' : (type==='warning' ? '#fff7ed' : '#eef2ff');
    div.style.border = '1px solid rgba(0,0,0,0.06)';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '8px';
    document.body.appendChild(div);
    setTimeout(()=> { div.style.opacity = '0'; setTimeout(()=>div.remove(),300); }, 2500);
}

// ---------------- Initialization & UI bindings ----------------
function initializeApp() {
    renderSemesters();
    updateCreditsCounter();
    updateCoursesCounter();
    const sel = document.getElementById('course-select');
    if (sel) sel.addEventListener('change', loadCourseSchedule);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.addEventListener('change', handleFileImport);
}

// ---------------- Semesters & Courses ----------------
function renderSemesters() {
    const container = document.getElementById('semesters-grid');
    if (!container) return;
    container.innerHTML = '';
    const keys = typeof PLAN_ESTUDIOS !== 'undefined' ? Object.keys(PLAN_ESTUDIOS) : [];
    keys.forEach(sem => {
        const id = 'sem-' + sem.replace(/\s+/g,'_');
        const div = document.createElement('div');
        div.className = 'semester-item';
        div.innerHTML = `<label><input type="checkbox" id="${id}" onchange="handleSemesterChange('${sem}')"> ${sem}</label>`;
        container.appendChild(div);
    });
}

function handleSemesterChange(semester) {
    const id = 'sem-' + semester.replace(/\s+/g,'_');
    const cb = document.getElementById(id);
    if (!cb) return;
    if (cb.checked) {
        if (appState.selectedSemesters.length>0) {
            const curr = appState.selectedSemesters[0].includes('Primer Semestre') ? 'impar' : 'par';
            const neu = semester.includes('Primer Semestre') ? 'impar' : 'par';
            if (curr !== neu) { showToast('No puedes mezclar semestres pares e impares','warning'); cb.checked=false; return; }
        }
        appState.selectedSemesters.push(semester);
    } else {
        appState.selectedSemesters = appState.selectedSemesters.filter(s=>s!==semester);
        if (typeof PLAN_ESTUDIOS!=='undefined' && PLAN_ESTUDIOS[semester]) {
            Object.keys(PLAN_ESTUDIOS[semester]).forEach(code => { delete appState.selectedCourses[code]; delete appState.courseSchedules[code]; });
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
    if (!appState.selectedSemesters || appState.selectedSemesters.length===0) {
        container.innerHTML = `<div class="empty-state">Selecciona un semestre</div>`;
        return;
    }
    appState.selectedSemesters.forEach(sem => {
        const sec = document.createElement('div'); sec.className='semester-section';
        const title = document.createElement('h4'); title.textContent = sem; sec.appendChild(title);
        const grid = document.createElement('div'); grid.className='courses-grid';
        const cursos = (typeof PLAN_ESTUDIOS!=='undefined' && PLAN_ESTUDIOS[sem]) ? PLAN_ESTUDIOS[sem] : {};
        Object.entries(cursos).forEach(([code,info])=>{
            const item = document.createElement('div'); item.className='course-item';
            item.innerHTML = `<label><input type="checkbox" id="course-${code}" onchange="handleCourseChange('${code}')"> <strong>${info.nombre}</strong> <span>(${info.creditos}cr)</span></label>`;
            grid.appendChild(item);
        });
        sec.appendChild(grid); container.appendChild(sec);
    });
}

function handleCourseChange(code) {
    const cb = document.getElementById(`course-${code}`);
    if (!cb) return;
    if (cb.checked) {
        let found = null;
        if (typeof PLAN_ESTUDIOS!=='undefined') {
            for (const sem of Object.keys(PLAN_ESTUDIOS)) {
                if (PLAN_ESTUDIOS[sem][code]) { found = PLAN_ESTUDIOS[sem][code]; break; }
            }
        }
        if (found) { appState.selectedCourses[code]=found; if (!appState.courseSchedules[code]) appState.courseSchedules[code]={}; }
    } else {
        delete appState.selectedCourses[code]; delete appState.courseSchedules[code];
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

// ---------------- Schedule editor ----------------
function updateCourseSelect() {
    const sel = document.getElementById('course-select'); if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona curso --</option>';
    Object.entries(appState.selectedCourses).forEach(([code,info])=>{
        const o = document.createElement('option'); o.value = code; o.textContent = `${code} - ${info.nombre}`; sel.appendChild(o);
    });
}

function loadCourseSchedule() {
    const sel = document.getElementById('course-select'); const editor = document.getElementById('schedule-editor');
    if (!editor) return;
    const code = sel ? sel.value : '';
    if (!code) { editor.innerHTML = `<div class="empty-state">Selecciona curso</div>`; return; }
    if (!appState.courseSchedules[code]) appState.courseSchedules[code] = {};
    const nombre = appState.selectedCourses[code]?.nombre || code;
    editor.innerHTML = `<h3>${nombre}</h3><div id="groups-${code}">${GROUPS.map(g=>createGroupCard(code,g)).join('')}</div><div style="margin-top:10px"><button onclick="saveCourseSchedule('${code}')">Guardar</button></div>`;
}

function createGroupCard(code, group) {
    const schedules = (appState.courseSchedules[code] && appState.courseSchedules[code][group]) ? appState.courseSchedules[code][group].schedules : [];
    const enabled = !!(appState.courseSchedules[code] && appState.courseSchedules[code][group]);
    return `<div class="group-card"><label><input type="checkbox" id="group-${code}-${group}" ${enabled ? 'checked' : ''} onchange="toggleGroup('${code}','${group}')"> Grupo ${group}</label>
        <div id="schedules-${code}-${group}">${schedules.map((s,i)=>createScheduleRow(code,group,i,s)).join('')}</div>
        <button onclick="addSchedule('${code}','${group}')">+ Agregar horario</button></div>`;
}

function createScheduleRow(code, group, idx, s={}) {
    return `<div class="schedule-row" id="sch-${code}-${group}-${idx}">
        <select onchange="updateSchedule('${code}','${group}',${idx},'día',this.value)">${['','Lunes','Martes','Miércoles','Jueves','Viernes'].map(d=>`<option value="${d}" ${s['día']===d?'selected':''}>${d}</option>`).join('')}</select>
        <input type="time" onchange="updateSchedule('${code}','${group}',${idx},'inicio',this.value)" value="${s['inicio']||''}">
        <input type="time" onchange="updateSchedule('${code}','${group}',${idx},'fin',this.value)" value="${s['fin']||''}">
        <button onclick="removeSchedule('${code}','${group}',${idx})">Eliminar</button>
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
    appState.courseSchedules[code][group].schedules.push({'día':'','inicio':'','fin':''});
    loadCourseSchedule();
}

function removeSchedule(code, group, idx) {
    if (!appState.courseSchedules[code] || !appState.courseSchedules[code][group]) return;
    appState.courseSchedules[code][group].schedules.splice(idx,1); loadCourseSchedule();
}

function updateSchedule(code, group, idx, field, val) {
    if (!appState.courseSchedules[code] || !appState.courseSchedules[code][group]) return;
    const arr = appState.courseSchedules[code][group].schedules;
    if (!arr[idx]) return; arr[idx][field] = val;
}

function saveCourseSchedule(code) {
    if (!appState.courseSchedules[code]) return;
    let incomplete=false;
    Object.entries(appState.courseSchedules[code]).forEach(([g,data])=>{
        data.schedules = data.schedules.filter(s => s['día'] && s['inicio'] && s['fin']);
        if (data.schedules.length===0) delete appState.courseSchedules[code][g];
    });
    if (!appState.courseSchedules[code] || Object.keys(appState.courseSchedules[code]).length===0) delete appState.courseSchedules[code];
    loadCourseSchedule(); renderCurrentConfiguration(); if (incomplete) showToast('Se eliminaron horarios incompletos','warning'); else showToast('Guardado');
}

function renderCurrentConfiguration() {
    const c = document.getElementById('current-config'); if (!c) return; c.innerHTML='';
    if (!appState.courseSchedules || Object.keys(appState.courseSchedules).length===0) { c.innerHTML='<div>No hay configuraciones</div>'; return; }
    Object.entries(appState.courseSchedules).forEach(([code,groups])=>{
        const name = appState.selectedCourses[code]?.nombre || code;
        Object.entries(groups).forEach(([g,data])=>{
            const txt = data.schedules.map(s=>`${s['día']} ${s['inicio']}-${s['fin']}`).join(', ');
            const el = document.createElement('div'); el.className='config-item'; el.innerHTML=`<strong>${name}</strong> - Grupo ${g} <div>${txt}</div>`; c.appendChild(el);
        });
    });
}

// ---------------- Combinaciones ----------------
function generateSchedules() {
    // validar que todos los cursos seleccionados tengan al menos un grupo con horarios
    const missing = [];
    Object.keys(appState.selectedCourses).forEach(code => {
        if (!appState.courseSchedules[code] || Object.keys(appState.courseSchedules[code]).length===0) missing.push(appState.selectedCourses[code]?.nombre || code);
    });
    if (missing.length>0) { showToast('Los siguientes cursos no tienen horarios: ' + missing.join(', '), 'error'); return; }
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
        if (!groupsObj || Object.keys(groupsObj).length===0) { console.warn('Faltan grupos para', code); return []; }
        const list = Object.values(groupsObj).map(g=> ({...g, courseCode: code, courseName: appState.selectedCourses[code]?.nombre || code}));
        courseGroups.push(list);
    }
    const all = cartesianProduct(courseGroups);
    return all.filter(isValidCombination);
}

function cartesianProduct(arrays) {
    return arrays.reduce((acc,cur) => acc.flatMap(a => cur.map(c => [...a, c])), [[]]);
}

function isValidCombination(comb) {
    for (let i=0;i<comb.length;i++) for (let j=i+1;j<comb.length;j++) if (schedulesConflict(comb[i].schedules, comb[j].schedules)) return false;
    return true;
}

function schedulesConflict(s1,s2) {
    for (const a of s1) for (const b of s2) {
        if (a['día'] === b['día']) {
            const a1 = timeToMinutes(a['inicio']), a2 = timeToMinutes(a['fin']), b1 = timeToMinutes(b['inicio']), b2 = timeToMinutes(b['fin']);
            if (isNaN(a1)||isNaN(a2)||isNaN(b1)||isNaN(b2)) return true;
            if (!(a2 <= b1 || b2 <= a1)) return true;
        }
    }
    return false;
}

// ---------------- Drawing: Slot-grid with inclusive end ----------------
// hora_a_index equivalent: devuelve índice del slot que contiene la hora.
// Si hora coincide exactamente con slot.start -> devuelve ese índice.
// Si hora está dentro del rango (slot.start < hora <= slot.end) devuelve índice (inclusive del end).
function horaAIndex(horaStr) {
    if (!horaStr) return null;
    const target = timeToMinutes(horaStr);
    if (isNaN(target)) return null;
    for (let idx=0; idx<TIME_SLOTS.length; idx++) {
        const slot = TIME_SLOTS[idx];
        const s = timeToMinutes(slot.start);
        const e = timeToMinutes(slot.end);
        if (target === s) return idx;
        // include if strictly greater than start and less or equal than end (inclusive)
        if (target > s && target <= e) return idx;
    }
    return null;
}

// Genera tabla HTML con <table>, usando rowspan para bloques que ocupan varios slots.
function createScheduleTable(combination) {
    const dias = DAYS;
    const slots = TIME_SLOTS;
    const nRows = slots.length;
    const nCols = dias.length;

    // matrix de nRows x nCols inicializada a null
    const mat = Array.from({length: nRows}, () => Array(nCols).fill(null));

    // mapear colores por curso
    const courseNames = Object.keys(appState.selectedCourses).map(c=>appState.selectedCourses[c].nombre);
    const palette = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#0ea5a0','#ef6c00'];
    const colorMap = {};
    let colorIdx = 0;

    // para cada grupo en la combinación, llenar la matrix con objetos y marcar ocupados
    combination.forEach(group => {
        const courseCode = group.courseCode;
        if (!colorMap[courseCode]) colorMap[courseCode] = palette[colorIdx++ % palette.length];
        const color = colorMap[courseCode];
        const cname = group.courseName || courseCode;
        for (const sch of group.schedules) {
            const dayIdx = dias.indexOf(sch['día']);
            const startIdx = horaAIndex(sch['inicio']);
            const endIdx = horaAIndex(sch['fin']);
            if (dayIdx === -1 || startIdx === null || endIdx === null) {
                console.warn('Horario ignorado por índices inválidos', sch, {dayIdx, startIdx, endIdx});
                continue;
            }
            // inclusive end: si start=2 and end=3, occupy rows 2 and 3 => height = endIdx - startIdx + 1
            let height = endIdx - startIdx + 1;
            if (height <= 0) height = 1;
            // set mat[startIdx][dayIdx] = block object, and mark subsequent rows as 'occ'
            mat[startIdx][dayIdx] = { courseCode, cname, group: group.group, color, height };
            for (let r = startIdx+1; r < startIdx + height && r < nRows; r++) mat[r][dayIdx] = 'occ';
        }
    });

    // construir tabla HTML
    let html = `<div class="schedule-preview"><table class="schedule-table" style="border-collapse:collapse;width:100%;">`;
    // header
    html += '<thead><tr><th style="background:#f8fafc;border:1px solid #e6edf5;padding:8px">Hora</th>';
    for (const d of dias) html += `<th style="background:#5b21b6;color:#fff;padding:10px;text-align:center">${d}</th>`;
    html += '</tr></thead><tbody>';

    for (let r = 0; r < nRows; r++) {
        const slot = slots[r];
        html += `<tr>`;
        html += `<td style="border:1px solid #eef2f6;padding:8px;width:110px">${slot.start}<br><small>${slot.end}</small></td>`;
        for (let c = 0; c < nCols; c++) {
            const cell = mat[r][c];
            if (cell === 'occ') {
                // esta celda está cubierta por un rowspan previo -> no renderizar <td>
                continue;
            }
            if (cell === null) {
                html += `<td style="border:1px solid #eef2f6;padding:4px;height:48px"></td>`;
            } else {
                // objeto bloque
                const rowspan = cell.height || 1;
                const bg = cell.color || '#3b82f6';
                const title = (cell.cname || cell.courseCode).replace(/</g,'&lt;').replace(/>/g,'&gt;');
                html += `<td rowspan="${rowspan}" style="border:1px solid #e6eef6;padding:6px;vertical-align:top;background:${bg};color:#fff;min-width:120px">`;
                html += `<div style="font-weight:800;font-size:12px">${title}</div>`;
                html += `<div style="font-size:11px;margin-top:6px">Grupo ${cell.group}</div>`;
                html += `</td>`;
            }
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

// ---------------- Preview & UI ----------------
function renderCombinationsList() {
    const cont = document.getElementById('combinations-list'); if (!cont) return;
    cont.innerHTML = '';
    if (!appState.generatedCombinations || appState.generatedCombinations.length===0) {
        cont.innerHTML = '<div>No hay combinaciones</div>'; return;
    }
    appState.generatedCombinations.forEach((comb, i)=>{
        const div = document.createElement('div'); div.className='comb-item';
        div.innerHTML = `<label><input type="checkbox" id="comb-${i}"> Combinación ${i+1}</label> <button onclick="previewCombination(${i})">Ver</button>`;
        cont.appendChild(div);
    });
}

function previewCombination(index) {
    if (!appState.generatedCombinations || index < 0 || index >= appState.generatedCombinations.length) return;
    const comb = appState.generatedCombinations[index];
    appState.currentPreview = { combination: comb, index };
    const grid = document.getElementById('schedule-grid');
    const summary = document.getElementById('schedule-summary');
    if (grid) grid.innerHTML = createScheduleTable(comb);
    if (summary) summary.innerHTML = createScheduleSummary(comb);
    // mark selected
    document.querySelectorAll('.comb-item').forEach((el, idx)=> el.classList.toggle('selected', idx===index));
}

function createScheduleSummary(combination) {
    const totalCredits = combination.reduce((s,g)=> s + (appState.selectedCourses[g.courseCode]?.creditos || 0), 0);
    const items = combination.map(g => {
        const text = (g.schedules||[]).map(s=>`${s['día']} ${s['inicio']}-${s['fin']}`).join(', ');
        return `<div style="background:#fff;border-radius:8px;padding:10px;margin-bottom:8px"><strong>${g.courseName}</strong><div>Grupo ${g.group} • ${appState.selectedCourses[g.courseCode]?.creditos||0} créditos</div><div style="margin-top:6px">${text}</div></div>`;
    }).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:center"><h4>Resumen del Horario</h4><div style="text-align:right"><div style="font-weight:900">${totalCredits}</div><div>Créditos</div></div></div><div style="margin-top:10px">${items}</div>`;
}

// ---------------- UI auxiliares ----------------
function renderCurrentConfiguration() {
    const c = document.getElementById('current-config'); if (!c) return; c.innerHTML='';
    if (!appState.courseSchedules || Object.keys(appState.courseSchedules).length===0) { c.innerHTML='<div>No hay configuraciones</div>'; return; }
    Object.entries(appState.courseSchedules).forEach(([code,groups])=>{
        const name = appState.selectedCourses[code]?.nombre || code;
        Object.entries(groups).forEach(([g,data])=>{
            const txt = data.schedules.map(s=>`${s['día']} ${s['inicio']}-${s['fin']}`).join(', ');
            const el = document.createElement('div'); el.className='config-item'; el.innerHTML=`<strong>${name}</strong> - Grupo ${g}<div>${txt}</div>`; c.appendChild(el);
        });
    });
}

// ---------------- Export/Import JSON ----------------
function exportConfig() {
    const cfg = { selectedSemesters: appState.selectedSemesters, selectedCourses: appState.selectedCourses, courseSchedules: appState.courseSchedules };
    const dataStr = JSON.stringify(cfg, null, 2);
    const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr); a.download='config.json'; a.click();
}

function importarConfig(input) {
    const file = input.files ? input.files[0] : null; if (!file) return;
    const reader = new FileReader(); reader.onload = e => {
        try {
            const cfg = JSON.parse(e.target.result);
            if (!cfg.selectedCourses) throw new Error('Formato inválido');
            appState.selectedSemesters = cfg.selectedSemesters || [];
            appState.selectedCourses = cfg.selectedCourses || {};
            appState.courseSchedules = cfg.courseSchedules || {};
            renderSemesters(); renderCourses(); updateCreditsCounter(); updateCoursesCounter(); updateCourseSelect(); renderCurrentConfiguration();
            showToast('Configuración importada','success');
        } catch (err) { showToast('Error importando: ' + err.message, 'error'); }
    }; reader.readAsText(file);
}

// ---------------- Export PNG / PDF helpers (simple) ----------------
function exportPreviewPNG() {
    const wrapper = document.querySelector('.schedule-preview');
    if (!wrapper) { showToast('No hay previsualización','warning'); return; }
    if (typeof html2canvas === 'undefined') { showToast('html2canvas no cargado','error'); return; }
    html2canvas(wrapper, {scale:2}).then(canvas => {
        const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'horario.png'; link.click();
        showToast('PNG generado','success');
    }).catch(e=>showToast('Error: '+e.message,'error'));
}

// ---------------- Console helpers para debug ----------------
function debugState() {
    console.log('selectedCourses', appState.selectedCourses);
    console.log('courseSchedules', appState.courseSchedules);
    console.log('generatedCombinations count', appState.generatedCombinations.length);
    console.log('currentPreview', appState.currentPreview);
}

console.log('script.js corregido (slot-grid, inclusivo) cargado');