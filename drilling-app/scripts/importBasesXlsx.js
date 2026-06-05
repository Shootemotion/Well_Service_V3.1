const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const appRoot = path.resolve(__dirname, '..');
const workbookPath = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads', 'Bases.xlsx');
const planningPath = path.join(appRoot, 'data', 'wellPlanningCatalogs.json');
const dictionaryPath = path.join(appRoot, 'data', 'dataModelDictionary.json');

function readRows(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

function clean(value) {
    return String(value ?? '').trim();
}

function numberOrString(value) {
    const text = clean(value);
    if (text === '') return '';
    const n = Number(text);
    return Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(text) ? n : text;
}

function normalizeToken(value) {
    return clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function findHeaderRowIndex(rows) {
    const markers = new Set([
        'tabla / categoria',
        'tabla / categorÃ­a',
        'campo',
        'codigo_evento',
        'codigo_fase',
        'codigo_estado',
        'codigo_tiempo',
        'codigo_actividad',
        'codigo_operacion',
        'codigo_npt'
    ]);
    const index = rows.findIndex(row =>
        row.filter(cell => clean(cell) !== '').length >= 2 &&
        row.some(cell => markers.has(clean(cell).toLowerCase()))
    );
    return index >= 0 ? index : 0;
}

function tableFromHeaderRow(rows, headerRowIndex = null) {
    const resolvedHeaderRowIndex = headerRowIndex == null ? findHeaderRowIndex(rows) : headerRowIndex;
    const headers = (rows[resolvedHeaderRowIndex] || []).map(clean);
    return rows.slice(resolvedHeaderRowIndex + 1)
        .filter(row => row.some(cell => clean(cell) !== ''))
        .map(row => {
            const item = {};
            headers.forEach((header, index) => {
                if (!header) return;
                item[header] = numberOrString(row[index]);
            });
            return item;
        });
}

function normalizeRequired(value) {
    const text = clean(value);
    if (!text) return 'No';
    const token = normalizeToken(text);
    return token === 'SI' ? 'Si' : text;
}

function findByCodeOrName(rows, codeKey, nameKey, value) {
    const token = normalizeToken(value);
    if (!token) return null;
    return rows.find(row =>
        normalizeToken(row[codeKey]) === token ||
        normalizeToken(row[nameKey]) === token
    ) || null;
}

function uniqueRelations(relations, leftKey, rightKey) {
    const seen = new Set();
    return relations.filter(rel => {
        const key = `${rel[leftKey]}|${rel[rightKey]}`;
        if (!rel[leftKey] || !rel[rightKey] || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function addRelation(relations, leftKey, rightKey, left, right) {
    if (!left || !right) return;
    relations.push({ [leftKey]: left, [rightKey]: right });
}

function buildRelations(existing, catalogs) {
    const phaseCodes = new Set(catalogs.cat_fase.map(item => item.codigo_fase));
    const activityCodes = new Set(catalogs.cat_actividad.map(item => item.codigo_actividad));
    const operationCodes = new Set(catalogs.cat_operacion.map(item => item.codigo_operacion));
    const hasActivity = code => activityCodes.has(code) ? code : '';
    const hasOperation = code => operationCodes.has(code) ? code : '';

    const relPhaseActivity = (existing.rel_fase_actividad || [])
        .filter(rel => phaseCodes.has(rel.fase) && activityCodes.has(rel.actividad));
    const relActivityOperation = (existing.rel_actividad_operacion || [])
        .filter(rel => activityCodes.has(rel.actividad) && operationCodes.has(rel.operacion));

    catalogs.cat_fase.forEach(phase => {
        const text = normalizeToken(`${phase.codigo_fase} ${phase.fase_desc}`);
        const add = activity => addRelation(relPhaseActivity, 'fase', 'actividad', phase.codigo_fase, hasActivity(activity));

        if (text.includes('DTM') || text.includes('MONTAJE') || text.includes('RIG_UP') || text.includes('DESMONTAJE')) add('ACT-DTM');
        if (text.includes('SACAR')) ['ACT-SACAR-INST', 'ACT-SACAR-TUBING', 'ACT-SACAR-BOMBA'].forEach(add);
        if (text.includes('BAJAR')) ['ACT-BAJAR-INST', 'ACT-BAJAR-TUBING', 'ACT-BAJAR-BOMBA', 'ACT-BAJAR-CASING'].forEach(add);
        if (text.includes('PUNZAR')) add('ACT-PUNZAR');
        if (text.includes('ESTIMULAR')) add('ACT-ESTIMULAR');
        if (text.includes('ENSAYAR')) ['ACT-ENSAYO', 'ACT-HERMETICIDAD', 'ACT-ADMISION'].forEach(add);
        if (text.includes('CEMENT')) add('ACT-CEMENTAR');
        if (text.includes('PESCA')) add('ACT-PESCA');
        if (text.includes('PERFOR')) ['ACT-DRILL', 'ACT-CIRCULAR', 'ACT-LIMPIEZA'].forEach(add);
        if (text.includes('CASING')) add('ACT-BAJAR-CASING');
        if (text.includes('CORONA') || text.includes('LOG')) add('ACT-LOGGING');
        if (text.includes('ACONDICIONA')) add('ACT-SUPERFICIE');
        if (text.includes('MANT')) ['ACT-MANT-PREV', 'ACT-MANT-CORR'].forEach(add);
        if (text.includes('ABANDONO') || text.includes('TAPON')) add('ACT-TAP-ABN');
    });

    const addOps = (activity, ops) => ops.forEach(op =>
        addRelation(relActivityOperation, 'actividad', 'operacion', hasActivity(activity), hasOperation(op))
    );
    addOps('ACT-DTM', ['OP-DESMONTA', 'OP-TRANSPORTA', 'OP-MONTA']);
    addOps('ACT-SACAR-INST', ['OP-SACA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-SACAR-TUBING', ['OP-SACA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-SACAR-BOMBA', ['OP-SACA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-BAJAR-INST', ['OP-BAJA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-BAJAR-TUBING', ['OP-BAJA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-BAJAR-BOMBA', ['OP-BAJA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-BAJAR-CASING', ['OP-BAJA-CSG-TBG-VB', 'OP-VIAJE']);
    addOps('ACT-PUNZAR', ['OP-PUNZA-NO-WL', 'OP-CABLE']);
    addOps('ACT-ESTIMULAR', ['OP-ESTIMULA', 'OP-FLUIDOS']);
    addOps('ACT-ENSAYO', ['OP-ENSAYA', 'OP-PRUEBA-HERM', 'OP-PRUEBA-ADM-CIRC']);
    addOps('ACT-HERMETICIDAD', ['OP-PRUEBA-HERM']);
    addOps('ACT-ADMISION', ['OP-PRUEBA-ADM-CIRC']);
    addOps('ACT-CEMENTAR', ['OP-CEMENTA']);
    addOps('ACT-PESCA', ['OP-VIAJE', 'OP-MIDE-OBSERVA']);
    addOps('ACT-DRILL', ['OP-ROTA', 'OP-MIDE-OBSERVA']);
    addOps('ACT-CIRCULAR', ['OP-BOMB-INY-CIRC-DESP', 'OP-FLUIDOS']);
    addOps('ACT-LIMPIEZA', ['OP-BOMB-INY-CIRC-DESP', 'OP-FLUIDOS']);
    addOps('ACT-LOGGING', ['OP-CABLE', 'OP-MIDE-OBSERVA']);
    addOps('ACT-SUPERFICIE', ['OP-TRAB-SUP', 'OP-ACOND-LOCACION']);
    addOps('ACT-MANT-PREV', ['OP-MANT-PREV', 'OP-EQ-PARADO']);
    addOps('ACT-MANT-CORR', ['OP-EQ-PARADO']);
    addOps('ACT-SEGURIDAD', ['OP-REUNION-SEG']);
    addOps('ACT-LECTURA', ['OP-LECTURA-ALERTAS']);
    addOps('ACT-TAP-ABN', ['OP-CEMENTA', 'OP-DESMONTA']);

    return {
        rel_fase_actividad: uniqueRelations(relPhaseActivity, 'fase', 'actividad'),
        rel_actividad_operacion: uniqueRelations(relActivityOperation, 'actividad', 'operacion')
    };
}

function readExistingPlanning() {
    try {
        return JSON.parse(fs.readFileSync(planningPath, 'utf8'));
    } catch {
        return {};
    }
}

function buildSamplePlanSteps(exampleRows, catalogs) {
    const dataRows = exampleRows.slice(2).filter(row => clean(row[0]) && clean(row[1]) && clean(row[2]));
    return dataRows.map(row => {
        const phase = findByCodeOrName(catalogs.cat_fase, 'codigo_fase', 'fase_desc', row[2]);
        let activity = findByCodeOrName(catalogs.cat_actividad, 'codigo_actividad', 'actividad', row[3]);
        let operation = findByCodeOrName(catalogs.cat_operacion, 'codigo_operacion', 'operacion', row[4]);
        const timeType = findByCodeOrName(catalogs.cat_tipo_tiempo, 'codigo_tiempo', 'nombre', row[5]) ||
            catalogs.cat_tipo_tiempo.find(t => clean(t.codigo_tiempo).endsWith(clean(row[5])));
        const nptValue = normalizeToken(row[6]);
        const npt = nptValue && nptValue !== '—'
            ? findByCodeOrName(catalogs.cat_npt, 'codigo_npt', 'categoria', row[6])
            : null;
        const operationToken = normalizeToken(row[4]);

        if (!operation && operationToken.includes('SACA') && operationToken.includes('TBG')) {
            operation = findByCodeOrName(catalogs.cat_operacion, 'codigo_operacion', 'operacion', 'OP-SACA-CSG-TBG-VB');
        }
        if (!operation && operationToken.includes('CIRCULA')) {
            operation = findByCodeOrName(catalogs.cat_operacion, 'codigo_operacion', 'operacion', 'OP-BOMB-INY-CIRC-DESP');
        }
        if (!operation && operationToken.includes('PUNZA')) {
            operation = findByCodeOrName(catalogs.cat_operacion, 'codigo_operacion', 'operacion', 'OP-PUNZA-NO-WL');
        }
        if (!operation && operationToken.includes('ESPERA')) {
            operation = findByCodeOrName(catalogs.cat_operacion, 'codigo_operacion', 'operacion', 'OP-CABLE');
        }

        if (!activity && operation) {
            const rel = catalogs.rel_actividad_operacion.find(item => item.operacion === operation.codigo_operacion);
            activity = catalogs.cat_actividad.find(item => item.codigo_actividad === rel?.actividad) || null;
        }
        if (!activity && phase) {
            const rel = catalogs.rel_fase_actividad.find(item => item.fase === phase.codigo_fase);
            activity = catalogs.cat_actividad.find(item => item.codigo_actividad === rel?.actividad) || null;
        }

        return {
            desde: clean(row[0]),
            hasta: clean(row[1]),
            fase: phase?.codigo_fase || clean(row[2]),
            actividad: activity?.codigo_actividad || clean(row[3]),
            operacion: operation?.codigo_operacion || clean(row[4]),
            tipo_tiempo: timeType?.codigo_tiempo || clean(row[5]),
            npt: npt?.codigo_npt || '',
            descripcion: clean(row[7])
        };
    });
}

function buildDictionary(guiaRows, catPozoRows) {
    const guia = tableFromHeaderRow(guiaRows).map(row => ({
        tabla_categoria: row['Tabla / CategorÃ­a'] || row['Tabla / Categoria'],
        para_que_sirve: row['Para quÃ© sirve'] || row['Para que sirve'],
        informacion_suministra: row['QuÃ© informaciÃ³n suministra'] || row['Que informacion suministra']
    }));

    const catPozo = tableFromHeaderRow(catPozoRows).map(row => ({
        campo: row.Campo,
        tipo_sugerido: row['Tipo sugerido'],
        obligatorio: normalizeRequired(row.Obligatorio),
        ejemplo: row.Ejemplo,
        para_que_sirve: row['Para quÃ© sirve'] || row['Para que sirve']
    }));

    return {
        source_file: workbookPath,
        generated_at: new Date().toISOString(),
        groups: [
            {
                group_code: 'guia',
                group_name: 'Guia del modelo',
                tables: [
                    {
                        table_code: 'guia_modelo',
                        table_name: 'Guia_Modelo',
                        description: 'Resumen funcional de las tablas y categorias del sistema.',
                        columns: guia
                    }
                ]
            },
            {
                group_code: 'estructura',
                group_name: 'Estructura del sistema',
                tables: [
                    {
                        table_code: 'well',
                        table_name: 'Estructura_Categoria_Pozo',
                        description: 'Campos base que identifican y clasifican un pozo.',
                        columns: catPozo
                    }
                ]
            }
        ]
    };
}

function main() {
    if (!fs.existsSync(workbookPath)) {
        throw new Error(`No existe el archivo Excel: ${workbookPath}`);
    }

    const existing = readExistingPlanning();
    const workbook = XLSX.readFile(workbookPath);
    const catalogs = {
        version: '0.3.0',
        source_file: workbookPath,
        generated_at: new Date().toISOString(),
        description: 'Catalogos importados desde Bases.xlsx con relaciones locales para el mock estatico.',
        cat_evento: tableFromHeaderRow(readRows(workbook, 'Cat_Evento')),
        cat_fase: tableFromHeaderRow(readRows(workbook, 'Cat_Fase')),
        cat_estado: tableFromHeaderRow(readRows(workbook, 'Cat_Estado')),
        cat_tipo_tiempo: tableFromHeaderRow(readRows(workbook, 'Cat_Tipo_Tiempo')),
        cat_actividad: tableFromHeaderRow(readRows(workbook, 'Cat_Actividad')),
        cat_operacion: tableFromHeaderRow(readRows(workbook, 'Cat_Operacion')),
        cat_npt: tableFromHeaderRow(readRows(workbook, 'Cat_Npt')),
        rel_fase_actividad: [],
        rel_actividad_operacion: []
    };

    const relations = buildRelations(existing, catalogs);
    catalogs.rel_fase_actividad = relations.rel_fase_actividad;
    catalogs.rel_actividad_operacion = relations.rel_actividad_operacion;
    catalogs.sample_plan_steps = buildSamplePlanSteps(readRows(workbook, 'Ejemplo'), catalogs);

    const dictionary = buildDictionary(readRows(workbook, 'Guia'), readRows(workbook, 'Cat_Pozo'));

    fs.writeFileSync(planningPath, `${JSON.stringify(catalogs, null, 2)}\n`, 'utf8');
    fs.writeFileSync(dictionaryPath, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');

    console.log(`Imported ${workbookPath}`);
    console.log(`- ${planningPath}`);
    console.log(`- ${dictionaryPath}`);
    console.log(`Catalog counts: eventos=${catalogs.cat_evento.length}, fases=${catalogs.cat_fase.length}, actividades=${catalogs.cat_actividad.length}, operaciones=${catalogs.cat_operacion.length}`);
    console.log(`Relations: fase_actividad=${catalogs.rel_fase_actividad.length}, actividad_operacion=${catalogs.rel_actividad_operacion.length}`);
}

main();
