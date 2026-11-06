import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import './auth-ui.css';

interface AuthShellProps {
  children: ReactNode;
  wide?: boolean;
}

export function AuthShell({ children, wide = false }: AuthShellProps) {
  return (
    <main className={`wp-auth${wide ? ' wp-auth--wide' : ''}`}>
      <aside className="wp-auth__brand" aria-label="WorkPalace">
        <LinkLogo />
        <div className="wp-auth__brand-copy">
          <span className="wp-auth__eyebrow">TU ESPACIO, TU RITMO</span>
          <h1>Un lugar para que tus ideas despeguen.</h1>
          <p>Encuentra espacios de trabajo pensados para acompañar cada proyecto.</p>
        </div>
        <span className="wp-auth__brand-foot">Espacios para trabajar mejor.</span>
      </aside>
      <section className="wp-auth__content">
        <div className="wp-auth__card">{children}</div>
      </section>
    </main>
  );
}

function LinkLogo() {
  return (
    <Link className="wp-auth__logo" to="/" aria-label="WorkPalace, ir al inicio">
      <img src="/workpalace-logo.png" alt="" />
      <span>WorkPalace</span>
    </Link>
  );
}

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function PasswordField({ label, id, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="wp-auth__field">
      <label htmlFor={id}>{label}</label>
      <div className="wp-auth__password">
        <input id={id} type={visible ? 'text' : 'password'} {...inputProps} />
        <button
          type="button"
          className="wp-auth__password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
          disabled={inputProps.disabled}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}

interface AuthMessageProps {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
}

export function AuthMessage({ children, tone = 'info' }: AuthMessageProps) {
  return (
    <p className={`wp-auth__message wp-auth__message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
