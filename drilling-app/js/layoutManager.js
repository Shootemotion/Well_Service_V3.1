// ============================================
// LAYOUT MANAGER - Dashboard configurable (mostrar/ocultar y dimensionar paneles)
// ============================================

class LayoutManager {
    constructor() {
        this.storageKey = 'drillingAppLayout';
        this.panels = [
            { key: 'ddr',       label: 'Diario (DDR)', sel: '.ddr-panel',       defSize: '50' },
            { key: 'chart',     label: 'Gráfico',      sel: '.chart-panel',     defSize: '25' },
            { key: 'schematic', label: 'Esquemático',  sel: '.schematic-panel', defSize: '25' },
            { key: 'bha',       label: 'BHA',          sel: '.bha-panel',       defSize: '33' },
            { key: 'mud',       label: 'Lodo',         sel: '.mud-panel',       defSize: '33' },
            { key: 'npt',       label: 'NPT',          sel: '.npt-panel',       defSize: '33' },
            { key: 'sensors',   label: 'Sensores',     sel: '.sensors-wrap',    defSize: '100' }
        ];
        this.sizes = ['25', '33', '50', '66', '100'];
        this.sizeLabels = {
            '25': '¼ (25%)', '33': '⅓ (33%)', '50': '½ (50%)', '66': '⅔ (66%)', '100': 'Completo'
        };
        this.state = {};
        this.elements = {};
    }

    init() {
        this.elements = {
            toggleBtn: document.getElementById('togglePanelsBtn'),
            sidebar: document.getElementById('panelsSidebar'),
            backdrop: document.getElementById('panelsBackdrop'),
            closeBtn: document.getElementById('closePanelsBtn'),
            resetBtn: document.getElementById('resetPanelsBtn'),
            list: document.getElementById('panelsList')
        };
        this.loadState();
        this.bind();
        this.renderList();
        this.apply();
    }

    defaults() {
        const s = {};
        this.panels.forEach(p => { s[p.key] = { visible: true, size: p.defSize }; });
        return s;
    }

    loadState() {
        const def = this.defaults();
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch {
            saved = {};
        }
        this.state = {};
        this.panels.forEach(p => {
            const sv = saved[p.key] || {};
            this.state[p.key] = {
                visible: typeof sv.visible === 'boolean' ? sv.visible : def[p.key].visible,
                size: this.sizes.includes(sv.size) ? sv.size : def[p.key].size
            };
        });
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.warn('No se pudo guardar el layout:', error);
        }
    }

    bind() {
        this.elements.toggleBtn?.addEventListener('click', () => this.open());
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.backdrop?.addEventListener('click', () => this.close());
        this.elements.resetBtn?.addEventListener('click', () => this.reset());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isOpen()) this.close();
        });
    }

    open() {
        this.elements.sidebar?.classList.add('open');
        this.elements.backdrop?.classList.remove('hidden');
    }

    close() {
        this.elements.sidebar?.classList.remove('open');
        this.elements.backdrop?.classList.add('hidden');
    }

    isOpen() {
        return this.elements.sidebar?.classList.contains('open');
    }

    reset() {
        this.state = this.defaults();
        this.save();
        this.renderList();
        this.apply();
    }

    apply() {
        this.panels.forEach(p => {
            const el = document.querySelector(p.sel);
            if (!el) return;
            const st = this.state[p.key];
            el.classList.toggle('panel-hidden', !st.visible);
            this.sizes.forEach(sz => el.classList.remove(`size-${sz}`));
            el.classList.add(`size-${st.size}`);
        });
        // Avisar a Chart.js (y demás) que el contenedor pudo cambiar de tamaño
        window.dispatchEvent(new Event('resize'));
    }

    renderList() {
        const list = this.elements.list;
        if (!list) return;
        list.innerHTML = this.panels.map(p => {
            const st = this.state[p.key];
            const opts = this.sizes
                .map(sz => `<option value="${sz}" ${sz === st.size ? 'selected' : ''}>${this.sizeLabels[sz]}</option>`)
                .join('');
            return `
                <div class="panel-row ${st.visible ? 'is-visible' : 'is-hidden'}" data-key="${p.key}">
                    <button class="panel-row-eye" data-key="${p.key}" type="button" title="Mostrar / ocultar">${st.visible ? '👁' : '∅'}</button>
                    <span class="panel-row-name">${p.label}</span>
                    <select class="panel-row-size" data-key="${p.key}" title="Ancho del panel">${opts}</select>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.panel-row-eye').forEach(btn => {
            btn.addEventListener('click', () => this.toggleVisible(btn.dataset.key));
        });
        list.querySelectorAll('.panel-row-size').forEach(sel => {
            sel.addEventListener('change', () => this.setSize(sel.dataset.key, sel.value));
        });
    }

    toggleVisible(key) {
        if (!this.state[key]) return;
        this.state[key].visible = !this.state[key].visible;
        this.save();
        this.renderList();
        this.apply();
    }

    setSize(key, size) {
        if (!this.state[key]) return;
        this.state[key].size = size;
        this.save();
        this.apply();
    }
}

window.LayoutManager = LayoutManager;
