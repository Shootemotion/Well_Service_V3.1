// ============================================
// DATA MANAGER - Gestión de datos de pozos
// ============================================

class DataManager {
    constructor() {
        this.wells = [];
        this.nptCategories = {};
        this.upcomingLocations = [];
        this.currentWell = null;
        this.currentDay = null;
        this.localDrafts = {};
        this.storageKey = 'drillingAppDailyDrafts';
        this.catalogs = null;
        this.catalogIndex = {};
        this.casingsStore = {};
        this.casingsStorageKey = 'drillingAppCasings';
    }

    // ===== Catálogos (nombres legibles de las categorías) =====
    async loadCatalogs() {
        try {
            const response = await fetch('./data/wellPlanningCatalogs.json');
            this.catalogs = await response.json();
            this.buildCatalogIndex();
        } catch (error) {
            console.warn('No se pudieron cargar los catálogos:', error);
            this.catalogs = null;
        }
        return this.catalogs;
    }

    buildCatalogIndex() {
        const c = this.catalogs || {};
        const index = (arr, key) => {
            const map = {};
            (arr || []).forEach(row => { map[row[key]] = row; });
            return map;
        };
        this.catalogIndex = {
            fase: index(c.cat_fase, 'codigo_fase'),
            actividad: index(c.cat_actividad, 'codigo_actividad'),
            operacion: index(c.cat_operacion, 'codigo_operacion'),
            tiempo: index(c.cat_tipo_tiempo, 'codigo_tiempo'),
            npt: index(c.cat_npt, 'codigo_npt'),
            evento: index(c.cat_evento, 'codigo_evento')
        };
    }

    getCatalogs() { return this.catalogs; }

    // Convierte CODIGO_CON_GUIONES a texto más legible
    humanize(value) {
        return String(value ?? '').replace(/_/g, ' ');
    }

    labelPhase(code)     { return this.humanize(this.catalogIndex.fase?.[code]?.fase_desc || code || '—'); }
    labelActivity(code)  { return this.humanize(this.catalogIndex.actividad?.[code]?.actividad || code || '—'); }
    labelOperation(code) { return this.humanize(this.catalogIndex.operacion?.[code]?.operacion || code || '—'); }
    labelTimeType(code)  { return this.humanize(this.catalogIndex.tiempo?.[code]?.nombre || code || '—'); }
    labelNpt(code)       { return this.humanize(this.catalogIndex.npt?.[code]?.categoria || code || '—'); }

    async loadWells() {
        try {
            const response = await fetch('./data/wells.json');
            const data = await response.json();
            this.wells = data.wells || [];
            this.nptCategories = data.nptCategories || {};
            this.upcomingLocations = data.upcomingLocations || [];
            this.ensureOperationIds();
            this.loadDrafts();
            this.applyDrafts();
            this.loadCasingsStore();
            this.applyCasings();
            return this.wells;
        } catch (error) {
            console.error('Error loading wells:', error);
            return [];
        }
    }

    ensureOperationIds() {
        for (const well of this.wells) {
            for (const day of well.days || []) {
                (day.operations || []).forEach((op, index) => {
                    if (!op._uid) {
                        op._uid = `${well.id}-D${day.dayNumber}-BASE-${index + 1}`;
                    }
                });
            }
        }
    }

    loadDrafts() {
        try {
            const raw = localStorage.getItem(this.storageKey) || '{}';
            this.localDrafts = JSON.parse(raw);
        } catch (error) {
            this.localDrafts = {};
            console.warn('No se pudo cargar borradores locales:', error);
        }
    }

    saveDrafts() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.localDrafts));
        } catch (error) {
            console.warn('No se pudo guardar el borrador local:', error);
        }
    }

    applyDrafts() {
        for (const wellId of Object.keys(this.localDrafts)) {
            const well = this.getWellById(wellId);
            if (!well) continue;
            const dayDrafts = this.localDrafts[wellId];
            for (const dayNumber of Object.keys(dayDrafts)) {
                const day = well.days.find(d => d.dayNumber === Number(dayNumber));
                if (!day) continue;
                const dayDraft = dayDrafts[dayNumber];

                // 1) Aplicar ediciones a las operaciones base
                const edits = dayDraft.edits || {};
                day.operations = (day.operations || []).map(op => edits[op._uid] ? { ...op, ...edits[op._uid] } : op);

                // 2) Agregar operaciones cargadas localmente
                if (Array.isArray(dayDraft.operations)) {
                    const localOps = dayDraft.operations.map((op, index) => ({
                        ...op,
                        _uid: op._uid || `${wellId}-D${dayNumber}-LOCAL-${index + 1}`
                    }));
                    dayDraft.operations = localOps;
                    day.operations = [...day.operations, ...localOps];
                }

                // 3) Quitar las líneas eliminadas
                const deleted = dayDraft.deleted || [];
                if (deleted.length) {
                    day.operations = day.operations.filter(op => !deleted.includes(op._uid));
                }

                this.sortOperations(day.operations);
            }
        }
    }

    saveDayDraft(wellId, dayNumber, operation) {
        if (!this.localDrafts[wellId]) this.localDrafts[wellId] = {};
        if (!this.localDrafts[wellId][dayNumber]) this.localDrafts[wellId][dayNumber] = { operations: [] };
        operation._uid = operation._uid || `${wellId}-D${dayNumber}-LOCAL-${Date.now()}`;
        this.localDrafts[wellId][dayNumber].operations.push(operation);
        this.sortOperations(this.localDrafts[wellId][dayNumber].operations);
        this.saveDrafts();
        const well = this.getWellById(wellId);
        if (!well) return;
        const day = well.days.find(d => d.dayNumber === Number(dayNumber));
        if (!day) return;
        day.operations.push(operation);
        this.sortOperations(day.operations);
    }

    updateDayOperation(wellId, dayNumber, operationUid, updatedOperation) {
        if (!operationUid) return;
        const well = this.getWellById(wellId);
        if (!well) return;
        const day = well.days.find(d => d.dayNumber === Number(dayNumber));
        if (!day) return;

        updatedOperation._uid = operationUid;
        const opIndex = day.operations.findIndex(op => op._uid === operationUid);
        if (opIndex >= 0) {
            day.operations[opIndex] = { ...day.operations[opIndex], ...updatedOperation };
            this.sortOperations(day.operations);
        }

        if (!this.localDrafts[wellId]) this.localDrafts[wellId] = {};
        if (!this.localDrafts[wellId][dayNumber]) this.localDrafts[wellId][dayNumber] = { operations: [] };
        const dayDraft = this.localDrafts[wellId][dayNumber];
        if (!Array.isArray(dayDraft.operations)) dayDraft.operations = [];
        const localIndex = dayDraft.operations.findIndex(op => op._uid === operationUid);
        if (localIndex >= 0) {
            dayDraft.operations[localIndex] = { ...dayDraft.operations[localIndex], ...updatedOperation };
        } else {
            if (!dayDraft.edits) dayDraft.edits = {};
            // Merge para no perder ediciones previas de otras celdas de la misma fila
            dayDraft.edits[operationUid] = { ...(dayDraft.edits[operationUid] || {}), ...updatedOperation };
        }
        this.saveDrafts();
    }

    deleteDayOperation(wellId, dayNumber, operationUid) {
        if (!operationUid) return;
        const well = this.getWellById(wellId);
        if (!well) return;
        const day = well.days.find(d => d.dayNumber === Number(dayNumber));
        if (!day) return;

        day.operations = (day.operations || []).filter(op => op._uid !== operationUid);

        if (!this.localDrafts[wellId]) this.localDrafts[wellId] = {};
        if (!this.localDrafts[wellId][dayNumber]) this.localDrafts[wellId][dayNumber] = { operations: [] };
        const dayDraft = this.localDrafts[wellId][dayNumber];
        if (Array.isArray(dayDraft.operations)) {
            dayDraft.operations = dayDraft.operations.filter(op => op._uid !== operationUid);
        }
        if (dayDraft.edits) delete dayDraft.edits[operationUid];
        if (!Array.isArray(dayDraft.deleted)) dayDraft.deleted = [];
        if (!dayDraft.deleted.includes(operationUid)) dayDraft.deleted.push(operationUid);
        this.saveDrafts();
    }

    // ===== Cañerías (casing) — alimentan el wellbore schematic =====
    loadCasingsStore() {
        try {
            this.casingsStore = JSON.parse(localStorage.getItem(this.casingsStorageKey) || '{}');
        } catch (error) {
            this.casingsStore = {};
        }
    }

    applyCasings() {
        for (const wellId of Object.keys(this.casingsStore)) {
            const well = this.getWellById(wellId);
            if (well && Array.isArray(this.casingsStore[wellId])) {
                well.casings = this.casingsStore[wellId];
            }
        }
    }

    updateWellCasings(wellId, casings) {
        const well = this.getWellById(wellId);
        if (well) well.casings = casings;
        this.casingsStore[wellId] = casings;
        try {
            localStorage.setItem(this.casingsStorageKey, JSON.stringify(this.casingsStore));
        } catch (error) {
            console.warn('No se pudieron guardar las cañerías:', error);
        }
    }

    getDayLoggedMinutes(day) {
        if (!day || !Array.isArray(day.operations)) return 0;
        return day.operations.reduce((total, op) => total + (Number(op.duration) || 0), 0);
    }

    sortOperations(operations) {
        if (!Array.isArray(operations)) return;
        operations.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
    }

    timeToMinutes(value) {
        const [hours, minutes] = String(value || '00:00').split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    getWellById(wellId) {
        return this.wells.find(well => well.id === wellId);
    }

    getAllWells() {
        return this.wells;
    }

    setCurrentWell(wellId) {
        this.currentWell = this.getWellById(wellId);
        this.currentDay = null;
        return this.currentWell;
    }

    setCurrentDay(dayNumber) {
        if (!this.currentWell) return null;
        this.currentDay = this.currentWell.days.find(d => d.dayNumber === dayNumber);
        return this.currentDay;
    }

    getCurrentWell() { return this.currentWell; }
    getCurrentDay()  { return this.currentDay; }
    getCategories()  { return this.nptCategories; }

    // ===== NPT helpers =====

    isNPTOperation(op) {
        return typeof op.code === 'string' && op.code.startsWith('NPT_');
    }

    // NPT acumulado del pozo (en minutos), agrupado por código
    getWellNPTByCategory(well) {
        const totals = {};
        if (!well) return totals;

        for (const day of well.days) {
            for (const op of day.operations) {
                if (this.isNPTOperation(op)) {
                    totals[op.code] = (totals[op.code] || 0) + op.duration;
                }
            }
        }
        return totals;
    }

    // NPT total del pozo (en minutos) hasta un día específico (o todos)
    getWellNPTTotal(well, uptoDayNumber = null) {
        if (!well) return 0;
        let total = 0;
        for (const day of well.days) {
            if (uptoDayNumber !== null && day.dayNumber > uptoDayNumber) break;
            for (const op of day.operations) {
                if (this.isNPTOperation(op)) total += op.duration;
            }
        }
        return total;
    }

    getDayNPTMinutes(day) {
        if (!day) return 0;
        return day.operations
            .filter(op => this.isNPTOperation(op))
            .reduce((s, op) => s + op.duration, 0);
    }

    // ===== Depth helpers =====

    // Devuelve array de [day, actualMD, planMD] para todos los días del pozo
    getDepthSeries(well) {
        if (!well) return { labels: [], actual: [], plan: [] };
        const labels = well.days.map(d => `D${d.dayNumber}`);
        const actual = well.days.map(d => d.actualMD ?? null);
        const plan   = well.days.map(d => d.planMD ?? null);
        return { labels, actual, plan };
    }

    // Profundidad máxima alcanzada (último día con datos)
    getCurrentMaxDepth(well) {
        if (!well || !well.days.length) return 0;
        const last = well.days[well.days.length - 1];
        return last.actualMD || 0;
    }

    // Avance porcentual sobre TD plan
    getProgress(well) {
        if (!well || !well.plannedTD) return 0;
        return Math.min(100, (this.getCurrentMaxDepth(well) / well.plannedTD) * 100);
    }

    // ===== Cost helpers =====

    // Serie de costo ACUMULADO (USD) por día: { labels, plan, actual }
    getCostSeries(well) {
        if (!well) return { labels: [], plan: [], actual: [] };
        const labels = [];
        const plan = [];
        const actual = [];
        let cumPlan = 0;
        let cumActual = 0;
        for (const d of well.days) {
            cumPlan   += d.planCost   || 0;
            cumActual += d.actualCost || 0;
            labels.push(`D${d.dayNumber}`);
            plan.push(cumPlan);
            actual.push(cumActual);
        }
        return { labels, plan, actual };
    }

    // Costo real acumulado hasta un día (inclusive)
    getActualCostUpTo(well, dayNumber) {
        if (!well) return 0;
        let total = 0;
        for (const d of well.days) {
            total += d.actualCost || 0;
            if (d.dayNumber === dayNumber) break;
        }
        return total;
    }

    // % del AFE consumido (real acumulado / AFE)
    getAFEConsumed(well, dayNumber) {
        if (!well || !well.afe) return 0;
        return (this.getActualCostUpTo(well, dayNumber) / well.afe) * 100;
    }

    // Formatea USD de forma compacta: 3570000 -> "US$ 3.57M"
    formatUSD(value) {
        if (value == null) return '—';
        if (Math.abs(value) >= 1e6) return `US$ ${(value / 1e6).toFixed(2)}M`;
        if (Math.abs(value) >= 1e3) return `US$ ${(value / 1e3).toFixed(0)}k`;
        return `US$ ${value.toFixed(0)}`;
    }

    // ===== Upcoming locations helpers =====

    // Orden de los gates y sus etiquetas (para render consistente)
    getGateDefs() {
        return [
            { key: 'locacion', label: 'Locación lista',   icon: '🏗️' },
            { key: 'programa', label: 'Programa asignado', icon: '📋' },
            { key: 'afe',      label: 'AFE aprobado',      icon: '💰' },
            { key: 'permisos', label: 'Permisos ingreso',  icon: '🔑' }
        ];
    }

    // Locaciones ordenadas por spud estimado (más próximas primero)
    getUpcomingLocations() {
        return [...this.upcomingLocations].sort((a, b) => {
            const da = a.estimatedSpud || '9999';
            const db = b.estimatedSpud || '9999';
            return da < db ? -1 : da > db ? 1 : 0;
        });
    }

    // Resumen de avance de gates: { done, total, pct, ready }
    getLocationReadiness(loc) {
        const defs = this.getGateDefs();
        const total = defs.length;
        let done = 0;
        defs.forEach(d => {
            const g = (loc.gates || {})[d.key];
            if (g && g.status === 'done') done++;
        });
        return {
            done,
            total,
            pct: total ? Math.round((done / total) * 100) : 0,
            ready: done === total
        };
    }

    // Etiqueta de estado general de la locación
    getLocationStage(loc) {
        const { done, ready } = this.getLocationReadiness(loc);
        if (ready) return { label: 'Listo para DTM', tone: 'green' };
        if (done === 0) return { label: 'Por iniciar',   tone: 'slate' };
        return { label: 'En preparación', tone: 'yellow' };
    }

    // Días desde hoy hasta el spud estimado (negativo = atrasado)
    daysUntil(dateString) {
        if (!dateString) return null;
        const target = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(target.getTime())) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.round((target - now) / 86400000);
    }

    // ===== Util =====

    formatDate(dateString) {
        if (!dateString) return '—';
        const d = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('es-AR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDateLong(dateString) {
        if (!dateString) return '—';
        const d = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('es-AR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    formatHours(minutes) {
        if (!minutes) return '0.0';
        return (minutes / 60).toFixed(1);
    }
}

window.DataManager = DataManager;
