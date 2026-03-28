# Manual de Uso: Dashboard NX-8 Panel Simulator

Este manual detalla las funcionalidades y el uso de la interfaz web del simulador NX-8.

## 1. Introducción
El Dashboard es una herramienta visual premium diseñada para monitorizar y controlar el simulador de la central de intrusión NX-8. Permite simular estados de zonas, particiones y fallos del sistema en tiempo real.

---

## 2. Descripción de Componentes

### 2.1 Barra Superior (Header)
- **Estado de Conexión**: Indica si el frontend está recibiendo datos de la API.
- **Contadores (TCP/Eventos)**: Muestra el número de clientes TCP conectados y el total de eventos generados.
- **Refresh (🔄)**: Forzar una actualización manual de los datos.
- **Reset (🗑️)**: Restaura todo el simulador a su estado inicial (todas las zonas cerradas, particiones desarmadas, sin fallos).

### 2.2 Tira de Estado del Panel
Muestra los 6 indicadores críticos de la central:
- **Online**: Estado de conexión del simulador.
- **AC Power**: Estado de la alimentación eléctrica.
- **Batería**: Estado de la carga de batería.
- **Tamper**: Estado del interruptor de sabotaje de la caja.
- **Trouble**: Indicador general de avería.
- **Comm**: Estado de la comunicación.

### 2.3 Particiones
Permite ver el estado actual (Armada Away/Stay, Desarmada) y controlar cada una de las 2 particiones:
- **Ready**: Indica si la partición está lista para armar (todas las zonas cerradas).
- **Controles**: Botones para armar en modo **Away**, **Stay**, **Instant** o para **Desarmar**.

### 2.4 Zonas (Grid interactiva)
Visualización de las 16 zonas configuradas.
- **Filtros**: Permite filtrar rápidamente por zonas en Alarma, Abiertas o con Fallos.
- **Estado Visual**: Verde (Cerrada), Rojo (Alarma), Amarillo (Abierta/Sabotaje).
- **Acciones**: Al hacer clic en una zona, se abre un **Panel de Control de Zona** para:
  - Abrir/Cerrar la zona.
  - Provocar una Alarma.
  - Realizar un Bypass.
  - Simular Tamper o Fallo de zona.

### 2.5 Eventos en Vivo
Un log en tiempo real de todo lo que sucede en el simulador (apertura de zonas, armado, fallos, etc.). Los eventos están codificados por colores para identificar su gravedad.

### 2.6 Inyección de Fallos
Controles directos para simular problemas sistémicos:
- **Fallo de AC**: Simula el corte de corriente.
- **Batería Baja**: Simula el agotamiento de la batería de respaldo.
- **Tamper General**: Sabotaje de la caja central.
- **Fallo de Comunicación**: Corta la comunicación del panel.

### 2.7 Modo Laboratorio y Escenarios
- **Delay/Jitter**: Permite simular latencias de red para pruebas de robustez.
- **Ráfaga de Eventos**: Genera múltiples eventos aleatorios para pruebas de carga.
- **Escenarios**: Sección para activar comportamientos complejos predefinidos.

---

## 3. Guía Rápida de Operación

1. **Para probar un armado**: Asegúrate de que todas las zonas estén en verde (Cerradas). Haz clic en "Away" en la Partición 1.
2. **Para disparar una alarma**: Haz clic en una zona y selecciona "Disparar Alarma". Verás el cambio en la zona y el indicador de la partición.
3. **Para simular una avería**: En el panel de "Inyección de Fallos", pulsa el botón "Fallo" en AC Power. El indicador superior cambiará automáticamente a rojo.
4. **Para resetear todo**: Si el sistema está en un estado complejo, usa el botón "Reset" en la esquina superior derecha.

---
© 2026 Antigravity - Proyecto Visor PCI
