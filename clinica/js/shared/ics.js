// Archivo .ics y enlace de Google Calendar para "agregar al calendario".
import { addDays } from './dates.js';
const stamp = (date, time) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
const plus = (time, min) => { const m = +time.slice(0, 2) * 60 + +time.slice(3, 5) + min; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function icsFile({ uid, date, time, duration = 30, title, location = '', description = '' }) {
  const esc = s => String(s).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//La Gran Web//Demo//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${now}`, `DTSTART:${stamp(date, time)}`, `DTEND:${stamp(date, plus(time, duration))}`,
    `SUMMARY:${esc(title)}`, `LOCATION:${esc(location)}`, `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Recordatorio', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return body;
}
export function downloadICS(name, opts) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icsFile(opts)], { type: 'text/calendar' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function googleCalUrl({ date, time, duration = 30, title, location = '', description = '' }) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(date, time)}/${stamp(date, plus(time, duration))}`, details: description, location });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
