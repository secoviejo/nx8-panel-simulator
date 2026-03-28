# Manual de Uso del Dashboard y NX-8 Simulator

Este manual describe el uso interactivo del simulador **NetworX NX-8** y cómo interpretar sus elementos, así como la configuración necesaria para la conectividad de pasarela TCP y Serie RS232.

---

## 1. Topología de Conexiones

El simulador cuenta con 3 mecanismos de entrada/salida:
1. **API de Control (Dashboard)**: Interfaz gráfica web moderna + API REST de inyección de estados.
2. **Servidor TCP (Socket)**: Actúa como el módulo TCP/IP oficial.
3. **Puerto Serie RS232**: Permite conexión física con la matriz remota o un equipo embebido tipo **Solae CIE-H14**.

> [!TIP]
> Por defecto el Dashboard se aloja en el puerto 8080. Si ejecutas NPM run dev, navega a \`http://localhost:8080\`.

---

## 2. Dashboard General

El Dashboard es tu Centro de Control y Comando (SCADA) para emular un edificio. Consta de diferentes secciones:

### Header
- **Stat RS232**: Indica si el puerto COM está abierto (En linea) o cerrado/desc.
- **Stat TCP**: Clientes actualmente enchufados a nuestro socket.
- **Eventos**: Contador de comandos ejecutados/trazas recibidas.
- **Reset**: Limpia por completo la red y restablece particiones y zonas.

### Módulo Principal (Panel Strip)
- Representa físicamente el estado de la **Placa principal**.
- Puedes ver el estado de energía (AC), la Batería, Tamper general o Error de comunicaciones.

---

## 3. Monitorización

### Particiones
Las particiones se muestran como bloques visuales que cambian de color según su estado:
- \`🔓 Gris/Neutro\`: Desarmada.
- \`🔒 Rojo o Naranja\`: Armada en modo 'Away', 'Stay' o 'Instant'.
- \`🚨 Intermitente Rojo\`: En alarma activa.

*Dispones de botones integrados en cada tarjeta para poder Armar y Desarmar directamente sin acceder a una consola.*

### Zonas
Se muestran como tarjetas interactivas, con soporte hasta 192 (configurable por `.env`):
*   Haz clic en una zona para **abrir el Panel Multiacción**.
*   **Filtros Rápidos**: Visualiza en tiempo real zonas caídas, en alarma, abiertas o averiadas.

#### Menú Multiacción (Click en Zona)
Al pulsar sobre una tarjeta, tienes opciones discretas:
- **Abrir/Cerrar**: Simula magnetos o PIRs abriéndose y cerrándose.
- **Alarma**: Fuerza un estado flagrante de alarma, ideal para testar si otros sistemas atrapan la trama de Nx-8.
- **Bypass**: Ignorar temporalmente esta zona.
- **Tamper/Fallo**: Simula cables cortados o cortocircuitos.

---

## 4. Inyección de Fallos e Ingeniería
El panel inferior de **Inyección de Fallos** te deja alterar de forma asíncrona estados que el hardware externo suele consultar con comandos `\x85` (System State).
Puedes forzar a que el Panel devuelva "Battery Low", o "Comm fail" para comprobar que tu hardware receptor desencadena los correctos fallos internos o loggea los problemas.

### Modo Laboratorio (Stress Test)
Si necesitas someter tu integrador (Solae / receptor Modbus / Nx584) a mucho estrés:
- **Jitter y Delay**: Retarda deliberadamente el envío de las tramas en la pasarela TCP/Serial simulando latencia asíncrona de un RS-485 lejano o congestionado.
- **Ráfaga**: Lanza *n* eventos simultáneos (ej: abriendo Zonas) y evalúa si tu CIE-H14 bufferiza bien y no crashea con la avalancha de ASCII frames.

---

## 5. El Conector Serie RS232

Hemos empotrado dentro del simulador un `SerialServer`. Automáticamente decodificará solicitudes que viajen por él, como el \`\x84\` o las tramas ASCII (\`p1\`, \`z2\`, etc.) devolviendo idéntico formato al TCP.

### ¿Cómo conectarlo a tu Solae CIE-H14?
Si el Solae va enchufado a tu PC (o el programa corre ahí y se enchufa por DB9):
1. Asegúrate de configurar en tu `.env`:
   \`\`\`env
   SIM_SERIAL_PORT=COM3
   SIM_SERIAL_BAUDRATE=9600
   \`\`\`
2. Al iniciar, el simulador capturará \`COM3\`.
3. Tu CIE-H14 verá tráfico serial fluyendo fluidamente cada vez que modifiques cosas en el dashboard, o bien el CIE podrá pedir \`ps1\` y nuestro Core RS232 le devolverá \`...partition status...\` ASCII.

---

## 6. Persistencia y Escenarios (Roadmap Opcional)
Se incluye un área de escenarios para inyecciones mediante ficheros JSON (pre-programados), pero el uso primario recomendado para testear dispositivos es usar el clic visual y el Laboratorio de fallos del dashboard.
