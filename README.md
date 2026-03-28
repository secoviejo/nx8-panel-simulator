# NX-8 Panel Simulator

Simulador de central de intrusión NetworX NX-8/NX-8E para laboratorio, desarrollo, testing e integración.

## Stack
- TypeScript + Node.js 22 LTS
- TCP Server (`node:net`)
- Fastify (API de control)
- pino (logging)
- zod (validación)
- vitest (testing)

## Inicio rápido

```bash
npm install
cp .env.example .env
npm run dev
```

## Puertos
- **TCP**: `2401` (protocolo NX-584 ASCII)
- **API**: `8080` (Fastify REST)
