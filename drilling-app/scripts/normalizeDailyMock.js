const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const wellsPath = path.join(appRoot, 'data', 'wells.json');
const catalogsPath = path.join(appRoot, 'data', 'wellPlanningCatalogs.json');

const data = JSON.parse(fs.readFileSync(wellsPath, 'utf8'));
const catalogs = JSON.parse(fs.readFileSync(catalogsPath, 'utf8'));

const exists = {
    phase: code => catalogs.cat_fase.some(item => item.codigo_fase === code),
    activity: code => catalogs.cat_actividad.some(item => item.codigo_actividad === code),
    operation: code => catalogs.cat_operacion.some(item => item.codigo_operacion === code),
    timeType: code => catalogs.cat_tipo_tiempo.some(item => item.codigo_tiempo === code),
    npt: code => catalogs.cat_npt.some(item => item.codigo_npt === code)
};

function pick(type, candidates, fallback = '') {
    return candidates.find(code => exists[type](code)) || fallback;
}

function phaseFor(day, op) {
    const code = String(op.code || '');
    if (code === 'RIG_UP') return pick('phase', ['PH-PERF-MONTAJE', 'PH-WO-DESM', 'PH-PERF-RIGUP']);
    if (code === 'CASING') return pick('phase', ['PH-PERF-CASING-INT', 'PH-PERF-CASING-SUP', 'PH-PERF-CASING-PROD']);
    if (code === 'CEMENT') return pick('phase', ['PH-PERF-CEM-INT', 'PH-PERF-CEM-SUP', 'PH-PERF-CEM-PROD']);
    if (code === 'BOP') return pick('phase', ['PH-PERF-BOP', 'PH-PERF-RIGUP']);
    if (code.startsWith('NPT')) return pick('phase', ['PH-PERF-DTM', 'PH-PERF-INT', 'PH-WO-DESM']);

    const phase = String(day.phase || '').toUpperCase();
    if (phase.includes('GU')) return pick('phase', ['PH-PERF-SUP', 'PH-PERF-CASING-SUP']);
    if (phase.includes('INTER')) return pick('phase', ['PH-PERF-INT', 'PH-PERF-CASING-INT']);
    if (phase.includes('OPEN')) return pick('phase', ['PH-PERF-PROD', 'PH-PERF-HORIZ', 'PH-PERF-INT']);
    return pick('phase', ['PH-PERF-PROD', 'PH-PERF-INT']);
}

function categoryFor(op) {
    const code = String(op.code || '');
    const map = {
        DRILL: ['ACT-DRILL', 'OP-ROTA', 'TC-OP', ''],
        CONN: ['ACT-DRILL', 'OP-MIDE-OBSERVA', 'TC-OP', ''],
        CIRC: ['ACT-CIRCULAR', 'OP-BOMB-INY-CIRC-DESP', 'TC-OP', ''],
        TRIP: ['ACT-SACAR-INST', 'OP-VIAJE', 'TC-OP', ''],
        CASING: ['ACT-BAJAR-CASING', 'OP-BAJA-CSG-TBG-VB', 'TC-OP', ''],
        CEMENT: ['ACT-CEMENTAR', 'OP-CEMENTA', 'TC-OP', ''],
        BOP: ['ACT-HERMETICIDAD', 'OP-PRUEBA-HERM', 'TC-OP', ''],
        RIG_UP: ['ACT-DTM', 'OP-MONTA', 'TC-DTM', ''],
        NPT_M: ['ACT-MANT-CORR', 'OP-EQ-PARADO', 'TC-NPT', 'NPT-EQ'],
        NPT_D: ['ACT-DRILL', 'OP-EQ-PARADO', 'TC-NPT', 'NPT-POZO'],
        NPT_W: ['ACT-DRILL', 'OP-EQ-PARADO', 'TC-WTH', 'NPT-CLIMA'],
        NPT_L: ['ACT-LOGGING', 'OP-CABLE', 'TC-LOG', 'NPT-LOG'],
        NPT_O: ['ACT-DRILL', 'OP-EQ-PARADO', 'TC-NPT', 'NPT-PROG'],
        NPT_E: ['ACT-DRILL', 'OP-EQ-PARADO', 'TC-NPT', 'NPT-TERCERO']
    };
    const [activity, operation, timeType, npt] = map[code] || ['ACT-DRILL', 'OP-MIDE-OBSERVA', 'TC-OP', ''];
    return {
        activityCode: pick('activity', [activity]),
        operationCode: pick('operation', [operation]),
        timeTypeCode: pick('timeType', [timeType], timeType),
        nptCategoryCode: npt ? pick('npt', [npt]) : ''
    };
}

let updated = 0;
for (const well of data.wells || []) {
    for (const day of well.days || []) {
        for (const op of day.operations || []) {
            const category = categoryFor(op);
            Object.assign(op, {
                phaseCode: phaseFor(day, op),
                activityCode: category.activityCode,
                operationCode: category.operationCode,
                timeTypeCode: category.timeTypeCode,
                nptCategoryCode: category.nptCategoryCode
            });
            updated += 1;
        }
    }
}

fs.writeFileSync(wellsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Normalized ${updated} daily operations in ${wellsPath}`);
