import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import './OtpInput.css';

type Status = 'idle' | 'verifying' | 'success' | 'error';
type Tone = '' | 'ok' | 'error' | 'info';

export interface OtpInputProps {
  /** Cantidad de dígitos (default 6) */
  length?: number;
  /** Correo ya enmascarado, se muestra en el subtítulo */
  email?: string;
  /** Código visible durante el desarrollo */
  devCode?: string;
  /** Segundos antes de poder reenviar (default 30) */
  resendSeconds?: number;
  autoFocus?: boolean;
  /** Devuelve true si el código es correcto */
  verify: (code: string) => Promise<boolean>;
  onSuccess?: (code: string) => void;
  onResend?: () => void;
  onCancel?: () => void;
}

const RING = 2 * Math.PI * 8;
const BURST = Array.from({ length: 14 }, (_, k) => (k * 360) / 14);
const REEL = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // -1 = celda en blanco

export default function OtpInput({
  length = 6,
  email = 'tu correo',
  devCode,
  resendSeconds = 30,
  autoFocus = true,
  verify,
  onSuccess,
  onResend,
  onCancel,
}: OtpInputProps) {
  const empty = () => Array<string>(length).fill('');
  const [values, setValues] = useState<string[]>(empty);
  const [delays, setDelays] = useState<number[]>(() => Array(length).fill(0));
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState<{ text: string; tone: Tone }>({ text: '', tone: '' });
  const [left, setLeft] = useState(resendSeconds);

  const vals = useRef<string[]>(values);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const busy = useRef(false); // verificando, reseteando o ya verificado
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());
  const submitRef = useRef<() => Promise<void>>(async () => {});

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pending.current.delete(id);
      fn();
    }, ms);
    pending.current.add(id);
  }, []);

  useEffect(() => {
    const timers = pending.current;
    return () => timers.forEach((id) => clearTimeout(id));
  }, []);

  // cuenta regresiva del reenvío
  useEffect(() => {
    if (left <= 0 || status === 'success') return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left, status]);

  const say = (text = '', tone: Tone = '') => setMsg({ text, tone });
  const focusAt = (i: number) => inputs.current[i]?.focus();
  const stagger = () => Array.from({ length }, (_, i) => i * 45);

  const commit = (next: string[], d: number[] = []) => {
    vals.current = next;
    setValues(next);
    setDelays(next.map((_, i) => d[i] ?? 0));
  };

  async function submit() {
    const code = vals.current.join('');
    if (busy.current || code.length < length) return;
    busy.current = true;
    setStatus('verifying');
    say('Verificando…');

    let ok = false;
    try {
      ok = await verify(code);
    } catch {
      ok = false;
    }

    if (ok) {
      setStatus('success');
      say('Código verificado.', 'ok');
      onSuccess?.(code); // busy queda en true: el código ya no se edita
      return;
    }
    setStatus('error');
    say('Código incorrecto. Prueba de nuevo.', 'error');
    later(() => {
      busy.current = false;
      setStatus('idle');
      commit(empty(), stagger());
      focusAt(0);
    }, 900);
  }
  submitRef.current = submit;

  function fill(start: number, raw: string) {
    if (busy.current) return;
    const chars = raw
      .replace(/\D/g, '')
      .slice(0, length - start)
      .split('')
      .filter(Boolean);
    if (!chars.length) return;

    const next = [...vals.current];
    const d: number[] = [];
    chars.forEach((c, k) => {
      next[start + k] = c;
      d[start + k] = k * 55;
    });
    say();
    setStatus('idle');
    commit(next, d);
    focusAt(Math.min(start + chars.length, length - 1));
    if (next.every((v) => v !== '')) later(() => submitRef.current(), 500 + chars.length * 55);
  }

  function resend() {
    if (left > 0 || busy.current) return;
    commit(empty(), stagger());
    setStatus('idle');
    say('Te enviamos un código nuevo.', 'info');
    setLeft(resendSeconds);
    onResend?.();
    focusAt(0);
  }

  function onChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    if (busy.current) return;
    const ne = e.nativeEvent as InputEvent;
    if (ne.inputType?.startsWith('delete')) {
      const next = [...vals.current];
      next[i] = '';
      commit(next);
      return;
    }
    const digits = e.target.value.replace(/\D/g, '');
    const typed = ne.inputType === 'insertText' && /^\d$/.test(ne.data ?? '') ? ne.data! : digits;
    fill(i, typed); // también cubre pegar y autocompletar por SMS
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (busy.current) return;
      const next = [...vals.current];
      if (next[i]) next[i] = '';
      else if (i > 0) {
        next[i - 1] = '';
        focusAt(i - 1);
      }
      say();
      commit(next);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault();
      focusAt(i + 1);
    } else if (e.key === 'Enter') {
      void submit();
    }
  }

  function onFocus(i: number, e: FocusEvent<HTMLInputElement>) {
    const first = vals.current.findIndex((v) => v === '');
    if (first !== -1 && i > first) return focusAt(first);
    e.target.select();
  }

  const mid = length % 2 === 0 && length >= 4 ? length / 2 : -1;
  const filled = values.filter((v) => v !== '').length;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const label =
    status === 'verifying' ? 'Verificando…' : status === 'success' ? 'Verificado' : 'Verificar código';

  return (
    <section
      className="otp"
      data-state={status}
      style={{ '--len': length, '--p': filled / length } as CSSProperties}
    >
      <div className="otp-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path className="otp-shackle" d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" stroke="none" />
          <circle className="otp-keyhole" cx="12" cy="15.3" r="1.5" stroke="none" />
          <rect className="otp-keyhole" x="11.3" y="16" width="1.4" height="2.6" rx=".7" stroke="none" />
        </svg>
        <span className="otp-burst">
          {BURST.map((a) => (
            <i key={a} style={{ '--a': `${a}deg` } as CSSProperties} />
          ))}
        </span>
      </div>

      <h2 className="otp-title">Verifica tu código</h2>
      <p className="otp-sub">
        Enviamos un código de {length} dígitos al correo <strong>{email}</strong>
      </p>
      {devCode && (
        <p className="otp-dev-code" role="note">
          Código de prueba: <strong>{devCode}</strong>
        </p>
      )}

      <div className="otp-reels" role="group" aria-label="Código de verificación">
        {values.map((v, i) => (
          <Fragment key={i}>
            {i === mid && <span className="otp-dash" aria-hidden="true" />}
            <label
              className="otp-slot"
              data-filled={v !== '' ? '' : undefined}
              style={{ '--n': i } as CSSProperties}
            >
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Dígito ${i + 1} de ${length}`}
                value={v}
                disabled={status === 'success'}
                autoFocus={autoFocus && i === 0}
                onChange={(e) => onChange(i, e)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => onFocus(i, e)}
              />
              <span className="otp-drum" aria-hidden="true">
                <span
                  className="otp-strip"
                  style={{ '--i': v === '' ? 0 : Number(v) + 1, '--d': `${delays[i]}ms` } as CSSProperties}
                >
                  {REEL.map((d) => (
                    <i key={d}>{d < 0 ? '' : d}</i>
                  ))}
                </span>
              </span>
            </label>
          </Fragment>
        ))}
      </div>

      <p className="otp-msg" role="status" aria-live="polite" data-tone={msg.tone}>
        {msg.text}
      </p>

      <button
        className="otp-btn"
        type="button"
        disabled={status !== 'idle' || filled < length}
        onClick={() => void submit()}
      >
        {label}
      </button>

      <div className="otp-resend">
        <button className="otp-link" type="button" disabled={left > 0 || status === 'success'} onClick={resend}>
          <svg className="otp-ring" viewBox="0 0 20 20" aria-hidden="true">
            <circle className="otp-ring-bg" cx="10" cy="10" r="8" />
            <circle
              className="otp-ring-fg"
              cx="10"
              cy="10"
              r="8"
              style={{ strokeDashoffset: RING * (1 - left / resendSeconds) }}
            />
          </svg>
          <span>{left > 0 ? `Reenviar código en ${clock}` : 'Reenviar código'}</span>
        </button>
      </div>

      {onCancel && (
        <button className="otp-cancel" type="button" onClick={onCancel}>
          Volver al inicio de sesión
        </button>
      )}
    </section>
  );
}

/* Uso:
 *
 * <OtpInput
 *   verify={async (code) => (await fetch('/api/otp/verify', { method: 'POST', body: JSON.stringify({ code }) })).ok}
 *   onSuccess={() => navigate('/home')}
 *   onResend={() => fetch('/api/otp/send', { method: 'POST' })}
 * />
 */
