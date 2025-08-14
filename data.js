// Datos del plan de estudios 2017 - Ingeniería Industrial
const PLAN_ESTUDIOS = {
    "Primer Año - Primer Semestre": {
        "1701102": { "nombre": "RAZONAMIENTO LOGICO MATEMATICO", "creditos": 3 },
        "1701103": { "nombre": "MATEMATICA BASICA", "creditos": 4 },
        "1701104": { "nombre": "CALCULO 1", "creditos": 5 },
        "1701105": { "nombre": "QUIMICA GENERAL", "creditos": 4 },
        "1701106": { "nombre": "DIBUJO EN INGENIERIA", "creditos": 3 },
        "1701121": { "nombre": "METODOLOGIA DEL TRABAJO INTELECTUAL UNIVERSITARIO", "creditos": 2 },
        "1701122": { "nombre": "INTRODUCCION A LA INGENIERIA INDUSTRIAL", "creditos": 3 }
    },
    "Primer Año - Segundo Semestre": {
        "1701208": { "nombre": "REALIDAD NACIONAL", "creditos": 2 },
        "1701210": { "nombre": "CALCULO 2", "creditos": 5 },
        "1701211": { "nombre": "FISICA 1", "creditos": 4 },
        "1701212": { "nombre": "QUIMICA ORGANICA", "creditos": 4 },
        "1701213": { "nombre": "GEOMETRIA DESCRIPTIVA", "creditos": 3 },
        "1701223": { "nombre": "COMUNICACION INTEGRAL", "creditos": 3 }
    },
    "Segundo Año - Primer Semestre": {
        "1702114": { "nombre": "CIUDADANIA E INTERCULTURALIDAD", "creditos": 2 },
        "1702115": { "nombre": "ECONOMIA EN INGENIERIA", "creditos": 3 },
        "1702116": { "nombre": "FISICOQUIMICA", "creditos": 3 },
        "1702117": { "nombre": "FISICA 2", "creditos": 4 },
        "1702118": { "nombre": "ECUACIONES DIFERENCIALES", "creditos": 4 },
        "1702119": { "nombre": "ESTATICA Y RESISTENCIA DE MATERIALES", "creditos": 3 },
        "1702120": { "nombre": "PROGRAMACION Y METODOS NUMERICOS", "creditos": 3 }
    },
    "Segundo Año - Segundo Semestre": {
        "1702224": { "nombre": "INGLES", "creditos": 3 },
        "1702225": { "nombre": "PSICOLOGIA ORGANIZACIONAL", "creditos": 4 },
        "1702226": { "nombre": "ECOLOGIA Y CONSERVACION AMBIENTAL", "creditos": 2 },
        "1702227": { "nombre": "ANALISIS DE DATOS 1", "creditos": 4 },
        "1702228": { "nombre": "TERMODINAMICA", "creditos": 4 },
        "1702229": { "nombre": "ELECTRICIDAD Y ELECTRONICA INDUSTRIAL", "creditos": 3 },
        "1702230": { "nombre": "INGENIERIA FINANCIERA 1", "creditos": 4 }
    },
    "Tercer Año - Primer Semestre": {
        "1703131": { "nombre": "INTRODUCCION A LA METODOLOGIA DE LA INVESTIGACION CIENTIFICA", "creditos": 3 },
        "1703132": { "nombre": "ANALISIS DE DATOS 2", "creditos": 3 },
        "1703133": { "nombre": "INGENIERIA ECONOMICA", "creditos": 3 },
        "1703134": { "nombre": "INGENIERIA DE METODOS 1", "creditos": 4 },
        "1703135": { "nombre": "CONTROL DE PROCESOS", "creditos": 3 },
        "1703136": { "nombre": "INGENIERIA DE COSTOS Y PRESUPUESTOS", "creditos": 4 },
        "1703137": { "nombre": "OPERACIONES UNITARIAS", "creditos": 4 }
    },
    "Tercer Año - Segundo Semestre": {
        "1703238": { "nombre": "INVESTIGACION OPERATIVA 1", "creditos": 4 },
        "1703239": { "nombre": "INGENIERIA DE METODOS 2", "creditos": 4 },
        "1703240": { "nombre": "PROCESOS DE MANUFACTURA", "creditos": 4 },
        "1703241": { "nombre": "INGENIERIA DE SEGURIDAD", "creditos": 4 },
        "1703242": { "nombre": "INGENIERIA DE PRODUCCION", "creditos": 4 },
        "1703243": { "nombre": "INGENIERIA FINANCIERA 2", "creditos": 4 },
        "1703244": { "nombre": "INGENIERIA DE MATERIALES (E)", "creditos": 3 },
        "1703245": { "nombre": "DISENO INDUSTRIAL (E)", "creditos": 3 }
    },
    "Cuarto Año - Primer Semestre": {
        "1704146": { "nombre": "GESTION DEL TALENTO HUMANO", "creditos": 3 },
        "1704147": { "nombre": "ANALISIS E INVESTIGACION DE MERCADO", "creditos": 4 },
        "1704148": { "nombre": "INVESTIGACION OPERATIVA 2", "creditos": 4 },
        "1704149": { "nombre": "SISTEMAS DE INFORMACION", "creditos": 4 },
        "1704150": { "nombre": "EMPRENDIMIENTO E INNOVACION (E)", "creditos": 3 },
        "1704151": { "nombre": "INGENIERIA ERGONOMICA (E)", "creditos": 3 },
        "1704152": { "nombre": "GESTION DE OPERACIONES (E)", "creditos": 3 },
        "1704173": { "nombre": "ETICA GENERAL Y PROFESIONAL", "creditos": 2 }
    },
    "Cuarto Año - Segundo Semestre": {
        "1704253": { "nombre": "FORMULACION Y EVALUACION DE PROYECTOS", "creditos": 4 },
        "1704254": { "nombre": "AUTOMATIZACION INDUSTRIAL", "creditos": 4 },
        "1704255": { "nombre": "GERENCIA DE MARKETING", "creditos": 4 },
        "1704256": { "nombre": "INGENIERIA DE MANTENIMIENTO", "creditos": 4 },
        "1704257": { "nombre": "SISTEMAS DE GESTION DE LA CALIDAD (E)", "creditos": 3 },
        "1704258": { "nombre": "LEGISLACION LABORAL Y TRIBUTARIA (E)", "creditos": 3 },
        "1704259": { "nombre": "GESTION AMBIENTAL (E)", "creditos": 2 }
    },
    "Quinto Año - Primer Semestre": {
        "1705160": { "nombre": "ADMINISTRACION ESTRATEGICA", "creditos": 4 },
        "1705161": { "nombre": "INGENIERIA DEL PRODUCTO", "creditos": 4 },
        "1705162": { "nombre": "LOGISTICA INDUSTRIAL", "creditos": 4 },
        "1705163": { "nombre": "SIMULACION DE SISTEMAS", "creditos": 3 },
        "1705165": { "nombre": "GESTION DE PROYECTOS (E)", "creditos": 2 },
        "1705166": { "nombre": "SISTEMAS INTELIGENTES (E)", "creditos": 2 }
    },
    "Quinto Año - Segundo Semestre": {
        "1705267": { "nombre": "SEMINARIO DE TESIS", "creditos": 5 },
        "1705268": { "nombre": "PRACTICAS PRE PROFESIONALES", "creditos": 6 },
        "1705269": { "nombre": "INDUSTRIA TEXTIL Y CONFECCIONES (E)", "creditos": 2 },
        "1705270": { "nombre": "COMERCIO INTERNACIONAL (E)", "creditos": 2 },
        "1705271": { "nombre": "PROYECTOS DE INVERSION PUBLICA (E)", "creditos": 2 },
        "1705272": { "nombre": "AGRONEGOCIOS (E)", "creditos": 2 }
    }
};

// Horarios disponibles
const TIME_SLOTS = [
    { start: "07:00", end: "07:50" },
    { start: "07:50", end: "08:40" },
    { start: "08:50", end: "09:40" },
    { start: "09:40", end: "10:30" },
    { start: "10:40", end: "11:30" },
    { start: "11:30", end: "12:20" },
    { start: "12:20", end: "13:10" },
    { start: "13:10", end: "14:00" },
    { start: "14:00", end: "14:50" },
    { start: "14:50", end: "15:40" },
    { start: "15:50", end: "16:40" },
    { start: "16:40", end: "17:30" },
    { start: "17:40", end: "18:30" },
    { start: "18:30", end: "19:20" },
    { start: "19:20", end: "20:10" },
    { start: "20:10", end: "21:00" }
];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const GROUPS = ["A", "B", "C", "D", "E", "F"];

// Colores para los cursos (inspirados en líneas de metro)
const COURSE_COLORS = [
    'var(--course-color-1)',
    'var(--course-color-2)',
    'var(--course-color-3)',
    'var(--course-color-4)',
    'var(--course-color-5)',
    'var(--course-color-6)',
    'var(--course-color-7)',
    'var(--course-color-8)',
    'var(--course-color-9)',
    'var(--course-color-10)'
];