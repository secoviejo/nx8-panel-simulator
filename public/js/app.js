/**
 * NX-8 Panel Simulator — Dashboard App
 * Vanilla JS application for monitoring and controlling the NX-8 simulator.
 */

const API_BASE = window.location.origin;
const POLL_INTERVAL = 2000; // ms
const EVENT_POLL_INTERVAL = 3000;

// ── State ──
let state = {
    panel: null,
    partitions: [],
    zones: [],
    events: [],
    scenarios: { available: [], active: null, running: false },
    lastEventId: 0,
    lastSerialLogId: 0,
    connected: false,
};

// ═══ API Layer ═══

async function api(path, method = 'GET', body = null) {
    try {
        const opts = {
            method,
            headers: {},
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(`${API_BASE}${path}`, opts);
        if (!res.ok && res.status !== 304) throw new Error(`HTTP ${res.status}`);
        if (res.status === 304) return null;
        return await res.json();
    } catch (err) {
        console.error(`API Error [${method} ${path}]:`, err);
        throw err;
    }
}

// ═══ Data Fetching ═══

async function fetchPanelState() {
    try {
        const data = await api('/panel');
        state.panel = data.state;
        state.partitions = data.partitions;
        state.zones = data.zones;
        state.connected = true;
        updateConnectionStatus(true);
        updatePanelStrip();
        updatePartitions();
        updateZones();
        updateHeaderStats(data.connections?.tcp_clients || 0, data.connections?.serial_open || false);
    } catch {
        state.connected = false;
        updateConnectionStatus(false);
    }
}

async function fetchEvents() {
    try {
        const data = await api('/events?limit=50&offset=0');
        if (data && data.events) {
            // Detectar nuevos eventos
            const newEvents = data.events.filter(e => e.id > state.lastEventId);
            if (newEvents.length > 0) {
                state.lastEventId = Math.max(...data.events.map(e => e.id));
                state.events = data.events;
                updateEventFeed();
            }
            document.getElementById('event-count').textContent = data.total;
            document.getElementById('events-total').textContent = `${data.total} eventos`;
        }
    } catch { /* silently fail */ }
}

async function fetchScenarios() {
    try {
        const data = await api('/scenarios');
        state.scenarios = data;
        updateScenarios();
    } catch { /* silently fail */ }
}

async function fetchSerialConsole() {
    try {
        const data = await api(`/serial/console?since=${state.lastSerialLogId}`);
        if (!data || !data.logs || data.logs.length === 0) return;

        const terminal = document.getElementById('serial-terminal');
        const isScrolledToBottom = terminal.scrollHeight - terminal.clientHeight <= terminal.scrollTop + 10;

        // Limpiar mensaje "Esperando datos..."
        if (state.lastSerialLogId === 0) {
            terminal.innerHTML = '';
        }

        for (const log of data.logs) {
            state.lastSerialLogId = Math.max(state.lastSerialLogId, log.id);
            const div = document.createElement('div');
            div.className = 'terminal-line';
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'term-time';
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
            timeSpan.textContent = `[${timeStr}]`;
            
            const payloadSpan = document.createElement('span');
            payloadSpan.className = log.type === 'TX' ? 'term-tx' : 'term-rx';
            // Representación limpia apuntando al dispositivo
            payloadSpan.textContent = log.type === 'TX' 
                ? `TX → CIE-H14 : ${log.payload}` 
                : `RX ← CIE-H14 : ${log.payload}`;

            div.appendChild(timeSpan);
            div.appendChild(payloadSpan);
            terminal.appendChild(div);
        }

        // Mantener max 200 lineas
        while (terminal.childNodes.length > 200) {
            terminal.removeChild(terminal.firstChild);
        }

        if (isScrolledToBottom) {
            terminal.scrollTop = terminal.scrollHeight;
        }
    } catch { /* silently fail */ }
}

// ═══ UI Updates ═══

function updateConnectionStatus(connected) {
    const pill = document.getElementById('connection-status');
    const text = pill.querySelector('.status-text');
    pill.className = `status-pill ${connected ? 'connected' : 'error'}`;
    text.textContent = connected ? 'Conectado' : 'Desconectado';
}

function updateHeaderStats(tcpClients, serialOpen) {
    document.getElementById('tcp-clients').textContent = tcpClients;
    
    const serialEl = document.getElementById('serial-status');
    if (serialEl) {
        if (serialOpen) {
            serialEl.textContent = 'En linea';
            serialEl.style.color = 'var(--green-400)';
        } else {
            serialEl.textContent = 'Cerrado';
            serialEl.style.color = 'var(--text-muted)';
        }
    }
}

function updatePanelStrip() {
    if (!state.panel) return;
    const p = state.panel;

    setIndicator('ind-online', 'val-online', p.online, p.online ? 'OK' : 'OFF', false);
    setIndicator('ind-ac', 'val-ac', p.acPower, p.acPower ? 'OK' : 'FALLO', false);
    setIndicator('ind-battery', 'val-battery', !p.batteryLow, p.batteryLow ? 'BAJA' : 'OK', false);
    setIndicator('ind-tamper', 'val-tamper', !p.tamper, p.tamper ? 'ACTIVO' : 'OK', false);
    setIndicator('ind-trouble', 'val-trouble', !p.trouble, p.trouble ? 'ACTIVO' : 'OK', true);
    setIndicator('ind-comm', 'val-comm', !p.commFailure, p.commFailure ? 'FALLO' : 'OK', false);
}

function setIndicator(containerId, valueId, isOk, text, isWarn) {
    const container = document.getElementById(containerId);
    const value = document.getElementById(valueId);
    if (!container || !value) return;

    value.textContent = text;
    if (isOk) {
        container.dataset.status = 'ok';
    } else {
        container.dataset.status = isWarn ? 'warn' : 'fault';
    }
}

function updatePartitions() {
    const container = document.getElementById('partitions-container');
    if (!container || !state.partitions.length) return;

    container.innerHTML = state.partitions.map(p => {
        const badgeClass = p.alarm ? 'alarm' : p.armed ? `armed-${p.armMode || 'away'}` : 'disarmed';
        const badgeText = p.alarm ? '🚨 ALARMA' : p.armed ? `🔒 ${(p.armMode || 'away').toUpperCase()}` : '🔓 DESARMADA';
        const cardClass = p.alarm ? 'alarm' : p.armed ? 'armed' : '';

        return `
            <div class="partition-card ${cardClass}" data-partition="${p.id}">
                <div class="partition-header">
                    <span class="partition-name">Partición ${p.id}</span>
                    <span class="partition-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="partition-flags">
                    <span class="flag-chip ${p.ready ? 'active' : ''}">Ready: ${p.ready ? 'Sí' : 'No'}</span>
                    <span class="flag-chip ${p.entryDelay ? 'active' : ''}">Entry Delay</span>
                    <span class="flag-chip ${p.exitDelay ? 'active' : ''}">Exit Delay</span>
                </div>
                <div class="partition-actions">
                    <button class="btn-arm ${p.armed && p.armMode === 'away' ? 'active' : ''}" onclick="armPartition(${p.id}, 'away')">Away</button>
                    <button class="btn-arm ${p.armed && p.armMode === 'stay' ? 'active' : ''}" onclick="armPartition(${p.id}, 'stay')">Stay</button>
                    <button class="btn-arm ${p.armed && p.armMode === 'instant' ? 'active' : ''}" onclick="armPartition(${p.id}, 'instant')">Instant</button>
                    <button class="btn-disarm" onclick="disarmPartition(${p.id})">Desarmar</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateZones() {
    const container = document.getElementById('zone-grid');
    if (!container || !state.zones.length) return;

    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    let filtered = state.zones;

    if (activeFilter === 'alarm') filtered = state.zones.filter(z => z.alarm);
    else if (activeFilter === 'open') filtered = state.zones.filter(z => z.open);
    else if (activeFilter === 'fault') filtered = state.zones.filter(z => z.fault || z.tamper);

    if (filtered.length === 0 && activeFilter !== 'all') {
        container.innerHTML = `<div class="event-empty" style="grid-column: 1 / -1;">No hay zonas con ese filtro</div>`;
        return;
    }

    container.innerHTML = filtered.map(z => {
        const classes = [];
        if (z.alarm) classes.push('alarm');
        else if (z.open) classes.push('open');
        if (z.fault) classes.push('fault');
        if (z.bypassed) classes.push('bypassed');
        if (z.tamper) classes.push('tamper');

        const badges = [];
        if (z.alarm) badges.push('<span class="zone-badge alarm">Alarma</span>');
        else if (z.open) badges.push('<span class="zone-badge open">Abierta</span>');
        else badges.push('<span class="zone-badge closed">Cerrada</span>');
        if (z.bypassed) badges.push('<span class="zone-badge bypassed">Bypass</span>');
        if (z.tamper) badges.push('<span class="zone-badge tamper">Tamper</span>');
        if (z.fault) badges.push('<span class="zone-badge fault">Fallo</span>');

        return `
            <div class="zone-card ${classes.join(' ')}" data-zone="${z.id}" onclick="openZoneModal(${z.id})">
                <div class="zone-id">Z${String(z.id).padStart(2, '0')} · P${z.partitionId}</div>
                <div class="zone-name" title="${z.name}">${z.name}</div>
                <div class="zone-badges">${badges.join('')}</div>
            </div>
        `;
    }).join('');
}

function updateEventFeed() {
    const feed = document.getElementById('event-feed');
    if (!feed || !state.events.length) return;

    // Mostramos los más recientes primero
    const sorted = [...state.events].sort((a, b) => b.id - a.id).slice(0, 40);

    feed.innerHTML = sorted.map(e => {
        const time = new Date(e.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const typeClass = getEventTypeClass(e.type);

        return `
            <div class="event-item ${typeClass}">
                <span class="event-time">${time}</span>
                <span class="event-desc">${e.description}</span>
            </div>
        `;
    }).join('');
}

function getEventTypeClass(type) {
    if (type.includes('alarm')) return 'type-alarm';
    if (type.includes('zone')) return 'type-zone';
    if (type.includes('partition')) return 'type-partition';
    if (type.includes('panel')) return 'type-panel';
    if (type.includes('system')) return 'type-system';
    return '';
}

function updateScenarios() {
    const list = document.getElementById('scenario-list');
    const activeEl = document.getElementById('scenario-active');
    const stopBtn = document.getElementById('btn-stop-scenario');
    if (!list) return;

    const { available, active, running } = state.scenarios;

    if (!available || available.length === 0) {
        list.innerHTML = '<div class="event-empty">No hay escenarios disponibles</div>';
    } else {
        list.innerHTML = available.map(s => `
            <button class="scenario-chip ${active === s ? 'active' : ''}" onclick="loadScenario('${s}')">${s}</button>
        `).join('');
    }

    if (active && running) {
        activeEl.textContent = `▶ ${active}`;
        activeEl.style.color = 'var(--green-400)';
        stopBtn.style.display = 'inline-flex';
    } else {
        activeEl.textContent = 'Ninguno activo';
        activeEl.style.color = '';
        stopBtn.style.display = 'none';
    }
}

// ═══ Actions ═══

async function armPartition(id, mode) {
    try {
        await api(`/partitions/${id}/arm`, 'POST', { mode });
        showToast(`Partición ${id} armada (${mode})`, 'success');
        await fetchPanelState();
    } catch {
        showToast(`Error al armar partición ${id}`, 'error');
    }
}

async function disarmPartition(id) {
    try {
        await api(`/partitions/${id}/disarm`, 'POST');
        showToast(`Partición ${id} desarmada`, 'success');
        await fetchPanelState();
    } catch {
        showToast('Error al desarmar', 'error');
    }
}

async function zoneAction(id, action) {
    try {
        await api(`/zones/${id}/${action}`, 'POST');
        showToast(`Zona ${id}: ${action}`, 'success');
        closeZoneModal();
        await fetchPanelState();
        await fetchEvents();
    } catch {
        showToast(`Error en zona ${id}`, 'error');
    }
}

async function triggerFault(fault, action) {
    try {
        await api(`/faults/${fault}/${action}`, 'POST');
        showToast(`${fault} → ${action}`, 'success');
        await fetchPanelState();
        await fetchEvents();
    } catch {
        showToast(`Error: ${fault}`, 'error');
    }
}

async function resetSimulator() {
    if (!confirm('¿Resetear todo el simulador? Se perderán todos los estados y eventos.')) return;
    try {
        await api('/sim/reset', 'POST');
        state.lastEventId = 0;
        showToast('Simulador reseteado', 'info');
        await fetchPanelState();
        await fetchEvents();
    } catch {
        showToast('Error al resetear', 'error');
    }
}

async function loadScenario(file) {
    try {
        await api('/scenarios/load', 'POST', { file });
        showToast(`Escenario cargado: ${file}`, 'success');
        await fetchScenarios();
    } catch {
        showToast(`Error cargando escenario: ${file}`, 'error');
    }
}

async function stopScenario() {
    try {
        await api('/scenarios/stop', 'POST');
        showToast('Escenario detenido', 'info');
        await fetchScenarios();
    } catch {
        showToast('Error deteniendo escenario', 'error');
    }
}

async function applyLabSetting(type) {
    const inputId = type === 'delay' ? 'lab-delay' : 'lab-jitter';
    const ms = parseInt(document.getElementById(inputId).value, 10);
    if (isNaN(ms) || ms < 0) {
        showToast('Valor inválido', 'error');
        return;
    }
    try {
        await api(`/lab/${type}`, 'POST', { ms });
        showToast(`${type} configurado a ${ms}ms`, 'success');
    } catch {
        showToast(`Error configurando ${type}`, 'error');
    }
}

async function launchBurst() {
    const count = parseInt(document.getElementById('lab-burst-count').value, 10);
    if (isNaN(count) || count < 1) {
        showToast('Cantidad inválida', 'error');
        return;
    }
    try {
        await api('/lab/burst', 'POST', { count, intervalMs: 200 });
        showToast(`Ráfaga de ${count} eventos lanzada 🔥`, 'success');
    } catch {
        showToast('Error lanzando ráfaga', 'error');
    }
}

// ═══ Zone Modal ═══

function openZoneModal(id) {
    const zone = state.zones.find(z => z.id === id);
    if (!zone) return;

    const modal = document.getElementById('zone-modal');
    const title = document.getElementById('modal-zone-title');
    const status = document.getElementById('modal-zone-status');
    const actions = document.getElementById('modal-zone-actions');

    title.textContent = `${zone.name} (Z${String(zone.id).padStart(2, '0')})`;

    // Status badges
    const badges = [];
    badges.push(`<span class="zone-badge ${zone.open ? 'open' : 'closed'}">${zone.open ? 'Abierta' : 'Cerrada'}</span>`);
    if (zone.alarm) badges.push('<span class="zone-badge alarm">Alarma</span>');
    if (zone.bypassed) badges.push('<span class="zone-badge bypassed">Bypass</span>');
    if (zone.tamper) badges.push('<span class="zone-badge tamper">Tamper</span>');
    if (zone.fault) badges.push('<span class="zone-badge fault">Fallo</span>');
    badges.push(`<span class="flag-chip">Partición ${zone.partitionId}</span>`);
    status.innerHTML = badges.join('');

    // Action buttons
    actions.innerHTML = `
        <button class="modal-action-btn" onclick="zoneAction(${id}, 'open')">📂 Abrir</button>
        <button class="modal-action-btn success" onclick="zoneAction(${id}, 'close')">📁 Cerrar</button>
        <button class="modal-action-btn danger" onclick="zoneAction(${id}, 'alarm')">🚨 Alarma</button>
        <button class="modal-action-btn success" onclick="zoneAction(${id}, 'restore')">✅ Restaurar</button>
        <button class="modal-action-btn" onclick="zoneAction(${id}, 'bypass')">⏭️ Bypass</button>
        <button class="modal-action-btn danger" onclick="zoneAction(${id}, 'tamper')">🛡️ Tamper</button>
        <button class="modal-action-btn danger" onclick="zoneAction(${id}, 'fault')">⚠️ Fallo</button>
    `;

    modal.style.display = 'flex';
}

function closeZoneModal() {
    document.getElementById('zone-modal').style.display = 'none';
}

// ═══ Toast System ═══

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

// ═══ Event Listeners ═══

function setupEventListeners() {
    // Refresh button
    document.getElementById('btn-refresh')?.addEventListener('click', async () => {
        await fetchPanelState();
        await fetchEvents();
        await fetchScenarios();
        showToast('Datos actualizados', 'info');
    });

    // Reset button
    document.getElementById('btn-reset')?.addEventListener('click', resetSimulator);

    // Fault buttons
    document.querySelectorAll('.btn-fault').forEach(btn => {
        btn.addEventListener('click', () => {
            const fault = btn.dataset.fault;
            const action = btn.dataset.action;
            if (fault && action) triggerFault(fault, action);
        });
    });

    // Zone filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateZones();
        });
    });

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', closeZoneModal);
    document.getElementById('zone-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'zone-modal') closeZoneModal();
    });

    // Scenario stop
    document.getElementById('btn-stop-scenario')?.addEventListener('click', stopScenario);

    // Lab controls
    document.querySelectorAll('[data-lab]').forEach(btn => {
        btn.addEventListener('click', () => applyLabSetting(btn.dataset.lab));
    });

    // Burst
    document.getElementById('btn-burst')?.addEventListener('click', launchBurst);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeZoneModal();
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            fetchPanelState();
            fetchEvents();
            fetchSerialConsole();
        }
    });

    // Serial Console clear
    document.getElementById('btn-clear-console')?.addEventListener('click', () => {
        const terminal = document.getElementById('serial-terminal');
        if (terminal) terminal.innerHTML = '<div class="terminal-line"><span class="term-time">['+new Date().toLocaleTimeString([], { hour12: false })+']</span> <span class="term-info">Consola limpiada.</span></div>';
    });
}

// ═══ Polling ═══

function startPolling() {
    // Poll principal
    setInterval(fetchPanelState, POLL_INTERVAL);

    // Poll de eventos
    setInterval(fetchEvents, EVENT_POLL_INTERVAL);

    // Poll consola RS232
    setInterval(fetchSerialConsole, EVENT_POLL_INTERVAL);

    // Poll de escenarios (menos frecuente)
    setInterval(fetchScenarios, 10000);
}

// ═══ Init ═══

async function init() {
    console.log('%c🛡️ NX-8 Dashboard v0.1.0', 'color: #818cf8; font-size: 14px; font-weight: bold;');

    setupEventListeners();

    // Carga inicial
    await Promise.all([
        fetchPanelState(),
        fetchEvents(),
        fetchScenarios(),
        fetchSerialConsole()
    ]);

    // Iniciar polling
    startPolling();
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
