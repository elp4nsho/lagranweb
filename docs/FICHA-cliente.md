# Ficha de cliente · <Nombre comercial>

> Copia a `clients/<slug>/FICHA.md`. **Sin claves ni contraseñas**: solo dónde están (gestor de claves).

## Cliente
| | |
|---|---|
| Razón social / RUT | |
| Contacto principal (nombre, cargo, celular, correo) | |
| Contacto de facturación | |
| Fecha de inicio · paquete contratado | Básico / Pro / Completo · $ mensual |

## Instalación
| | |
|---|---|
| Slug · app | `<slug>` · taller |
| Módulos | base, … |
| Estilo · disposición · colores | |
| Backend | local / Supabase (ref del proyecto `xxxx`, región) |
| Repositorio · rama | |
| Hosting | Cloudflare Pages (proyecto `…`) / Netlify / VPS `…` |

## Dominio y correo
| | |
|---|---|
| Dominio | `cliente.cl` (titular NIC: …, vence: AAAA-MM-DD, renovación automática: sí/no) |
| DNS | Cloudflare (zona …) / NIC / otro |
| Registros | www CNAME → … · SPF · DKIM · DMARC |
| SMTP de Auth | proveedor, remitente `no-responder@cliente.cl` |

## Accesos (dónde, no el valor)
| Servicio | Dueño | Tú | Clave en |
|---|---|---|---|
| NIC Chile | cliente | contacto técnico | gestor › `cliente/nic` |
| Supabase | cliente (owner) | developer | gestor › `cliente/supabase` |
| Hosting | | | |
| Correo / SMTP | | | |

## Respaldos y monitoreo
| | |
|---|---|
| Respaldo BD | GitHub Action `backup-supabase` / cron VPS · retención … días · última restauración probada: AAAA-MM-DD |
| Respaldo archivos | rclone → … |
| Monitoreo | UptimeRobot (portada, REST) · avisos a … |

## Vencimientos
| Qué | Fecha | Costo |
|---|---|---|
| Dominio .cl | | |
| Plan Supabase | | |
| Hosting / SMTP | | |

## Legal
- Política de privacidad revisada por: … (fecha) · correo de privacidad: …
- Encargados de tratamiento informados: Supabase, hosting, SMTP.

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| | Puesta en producción | |
