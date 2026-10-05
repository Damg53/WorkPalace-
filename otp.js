/**
 * otp.js — Input OTP con reels animados (vanilla JS, sin dependencias).
 * Estilos: OtpInput.css
 *
 *   const otp = mountOtp(document.querySelector('#otp'), {
 *     verify: async (code) => (await fetch(...)).ok,   // devuelve true/false
 *     onSuccess: (code) => {},
 *   });
 */
function mountOtp(root, opts = {}) {
  const {
    length = 6,
    phone = '+57 300 ••• 42 18',
    resendSeconds = 30,
    autoFocus = true,
    verify = async (code) => code === '246810', // demo
    onSuccess = () => {},
    onResend = () => {},
  } = opts;

  const RING = 2 * Math.PI * 8;
  const reel = '<i></i>' + Array.from({ length: 10 }, (_, d) => `<i>${d}</i>`).join('');
  const burst = Array.from({ length: 14 }, (_, k) => `<i style="--a:${(k * 360) / 14}deg"></i>`).join('');
  const mid = length % 2 === 0 && length >= 4 ? length / 2 : -1;

  const slotsHtml = Array.from({ length }, (_, i) => `
    ${i === mid ? '<span class="otp-dash" aria-hidden="true"></span>' : ''}
    <label class="otp-slot" style="--n:${i}">
      <input class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code"
             aria-label="Dígito ${i + 1} de ${length}" />
      <span class="otp-drum" aria-hidden="true"><span class="otp-strip">${reel}</span></span>
    </label>`).join('');

  root.innerHTML = `
    <section class="otp" data-state="idle" style="--len:${length};--p:0">
      <div class="otp-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path class="otp-shackle" d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" stroke="none" />
          <circle class="otp-keyhole" cx="12" cy="15.3" r="1.5" stroke="none" />
          <rect class="otp-keyhole" x="11.3" y="16" width="1.4" height="2.6" rx=".7" stroke="none" />
        </svg>
        <span class="otp-burst">${burst}</span>
      </div>
      <h2 class="otp-title">Verifica tu código</h2>
      <p class="otp-sub">Enviamos un código de ${length} dígitos al <strong class="otp-phone"></strong></p>
      <div class="otp-reels" role="group" aria-label="Código de verificación">${slotsHtml}</div>
      <p class="otp-msg" role="status" aria-live="polite"></p>
      <button class="otp-btn" type="button" disabled>Verificar código</button>
      <div class="otp-resend">
        <button class="otp-link" type="button" disabled>
          <svg class="otp-ring" viewBox="0 0 20 20" aria-hidden="true">
            <circle class="otp-ring-bg" cx="10" cy="10" r="8" />
            <circle class="otp-ring-fg" cx="10" cy="10" r="8" />
          </svg>
          <span></span>
        </button>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const el = $('.otp');
  const inputs = [...root.querySelectorAll('.otp-input')];
  const strips = [...root.querySelectorAll('.otp-strip')];
  const slots = [...root.querySelectorAll('.otp-slot')];
  const msg = $('.otp-msg');
  const btn = $('.otp-btn');
  const resendBtn = $('.otp-link');
  const ring = $('.otp-ring-fg');
  const clock = resendBtn.querySelector('span');
  $('.otp-phone').textContent = phone;

  let values = Array(length).fill('');
  let busy = false; // verificando, reseteando o ya verificado
  let interval = 0;
  const pending = new Set();

  const later = (fn, ms) => {
    const id = setTimeout(() => { pending.delete(id); fn(); }, ms);
    pending.add(id);
  };
  const setState = (s) => { el.dataset.state = s; };
  const say = (text = '', tone = '') => { msg.textContent = text; msg.dataset.tone = tone; };
  const stagger = () => values.map((_, i) => i * 45);

  // Pinta los reels: --i es la celda de la tira (0 = blanco, 1…10 = dígitos 0…9)
  function paint(delays = []) {
    values.forEach((v, i) => {
      strips[i].style.setProperty('--i', v === '' ? 0 : Number(v) + 1);
      strips[i].style.setProperty('--d', (delays[i] || 0) + 'ms');
      slots[i].toggleAttribute('data-filled', v !== '');
      inputs[i].value = v;
    });
    const n = values.filter((v) => v !== '').length;
    el.style.setProperty('--p', n / length); // cierra el candado
    btn.disabled = busy || n < length;
  }

  function fill(start, raw) {
    if (busy) return;
    const chars = raw.replace(/\D/g, '').slice(0, length - start).split('').filter(Boolean);
    if (!chars.length) return;
    const delays = [];
    chars.forEach((c, k) => { values[start + k] = c; delays[start + k] = k * 55; });
    say();
    setState('idle');
    paint(delays);
    inputs[Math.min(start + chars.length, length - 1)].focus();
    if (values.every((v) => v !== '')) later(submit, 500 + chars.length * 55);
  }

  function clearAll() {
    values = Array(length).fill('');
    paint(stagger());
    inputs[0].focus();
  }

  async function submit() {
    if (busy || values.some((v) => v === '')) return;
    busy = true;
    setState('verifying');
    say('Verificando…');
    btn.textContent = 'Verificando…';
    btn.disabled = true;
    const code = values.join('');
    let ok = false;
    try { ok = await verify(code); } catch { ok = false; }

    if (ok) {
      setState('success');
      say('Código verificado.', 'ok');
      btn.textContent = 'Verificado';
      inputs.forEach((i) => { i.disabled = true; });
      resendBtn.disabled = true;
      clearInterval(interval);
      onSuccess(code); // busy queda en true: el código ya no se edita
      return;
    }
    setState('error');
    say('Código incorrecto. Prueba de nuevo.', 'error');
    btn.textContent = 'Verificar código';
    later(() => {
      busy = false;
      setState('idle');
      clearAll();
    }, 900);
  }

  function startTimer() {
    clearInterval(interval);
    let left = resendSeconds;
    const tick = () => {
      resendBtn.disabled = left > 0;
      ring.style.strokeDashoffset = RING * (1 - left / resendSeconds);
      clock.textContent = left > 0
        ? `Reenviar código en ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
        : 'Reenviar código';
      if (left-- <= 0) clearInterval(interval);
    };
    tick();
    interval = setInterval(tick, 1000);
  }

  inputs.forEach((input, i) => {
    input.addEventListener('focus', () => {
      const first = values.findIndex((v) => v === '');
      if (first !== -1 && i > first) return inputs[first].focus();
      input.select();
    });

    input.addEventListener('input', (e) => {
      if (busy) return;
      if (e.inputType && e.inputType.startsWith('delete')) {
        values[i] = '';
        return paint();
      }
      const digits = input.value.replace(/\D/g, '');
      const typed = e.inputType === 'insertText' && /^\d$/.test(e.data || '') ? e.data : digits;
      if (!typed) { input.value = values[i]; return; }
      fill(i, typed); // también cubre pegar y autocompletar por SMS
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (busy) return;
        if (values[i]) values[i] = '';
        else if (i > 0) { values[i - 1] = ''; inputs[i - 1].focus(); }
        say();
        paint();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        inputs[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < length - 1) {
        e.preventDefault();
        inputs[i + 1].focus();
      } else if (e.key === 'Enter') {
        submit();
      }
    });
  });

  btn.addEventListener('click', submit);
  resendBtn.addEventListener('click', () => {
    if (busy || resendBtn.disabled) return;
    clearAll();
    setState('idle');
    say('Te enviamos un código nuevo.', 'info');
    startTimer();
    onResend();
  });

  paint();
  startTimer();
  if (autoFocus) inputs[0].focus();

  return {
    reset: () => { busy = false; inputs.forEach((i) => { i.disabled = false; }); setState('idle'); say(); clearAll(); },
    destroy: () => { clearInterval(interval); pending.forEach(clearTimeout); root.innerHTML = ''; },
  };
}
