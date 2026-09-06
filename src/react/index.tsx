import { forwardRef, useId, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';

const classes = (...names: (string | undefined | false)[]) => names.filter(Boolean).join(' ');
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
}
/** Native disabled and busy semantics block both keyboard and pointer activation. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', busy = false, disabled, type = 'button', className, children, ...props }, ref) {
  return <button {...props} ref={ref} type={type} disabled={disabled || busy} aria-busy={busy || undefined} className={classes('sk-button', `sk-button--${variant}`, size !== 'md' && `sk-button--${size}`, className)}>{children}</button>;
});
export interface FieldProps { label: ReactNode; hint?: ReactNode; error?: ReactNode; }
function useField(id: string | undefined, describedBy: string | undefined, hint: ReactNode, error: ReactNode) {
  const generated = useId(); const fieldId = id || `sk-${generated}`;
  return { id: fieldId, hintId: `${fieldId}-hint`, errorId: `${fieldId}-error`, describedBy: classes(describedBy, !!hint && `${fieldId}-hint`, !!error && `${fieldId}-error`) || undefined };
}
function Frame({ label, hint, error, ids, children }: FieldProps & { ids: ReturnType<typeof useField>; children: ReactNode }) {
  return <div className="sk-field"><label className="sk-field__label" htmlFor={ids.id}>{label}</label>{children}{hint && <p id={ids.hintId} className="sk-field__hint">{hint}</p>}{error && <p id={ids.errorId} className="sk-field__error">{error}</p>}</div>;
}
export type TextFieldProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'sm' | 'md' | 'lg' };
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, id, size = 'md', className, 'aria-describedby': describedBy, ...props }, ref) {
  const ids = useField(id, describedBy, hint, error);
  return <Frame {...{ label, hint, error, ids }}><input {...props} ref={ref} id={ids.id} aria-describedby={ids.describedBy} aria-invalid={error ? true : props['aria-invalid']} className={classes('sk-input', size !== 'md' && `sk-input--${size}`, className)} /></Frame>;
});
export type TextareaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, id, className, 'aria-describedby': describedBy, ...props }, ref) {
  const ids = useField(id, describedBy, hint, error);
  return <Frame {...{ label, hint, error, ids }}><textarea {...props} ref={ref} id={ids.id} aria-describedby={ids.describedBy} aria-invalid={error ? true : props['aria-invalid']} className={classes('sk-textarea', className)} /></Frame>;
});
export type SelectProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement>;
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, id, className, 'aria-describedby': describedBy, children, ...props }, ref) {
  const ids = useField(id, describedBy, hint, error);
  return <Frame {...{ label, hint, error, ids }}><select {...props} ref={ref} id={ids.id} aria-describedby={ids.describedBy} aria-invalid={error ? true : props['aria-invalid']} className={classes('sk-select', className)}>{children}</select></Frame>;
});
export type CheckboxProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>;
function Check({ label, hint, error, id, className, role, 'aria-describedby': describedBy, ...props }: CheckboxProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const ids = useField(id, describedBy, hint, error); const base = role === 'switch' ? 'sk-switch' : 'sk-checkbox';
  return <div className="sk-field"><label className={classes(base, className)}><input {...props} type="checkbox" role={role} ref={ref} id={ids.id} aria-describedby={ids.describedBy} aria-invalid={error ? true : props['aria-invalid']} className={`${base}__input`} /><span className={`${base}__${role === 'switch' ? 'track' : 'box'}`} aria-hidden="true">{role === 'switch' && <span className="sk-switch__thumb" />}</span><span className={`${base}__content`}>{label}</span></label>{hint && <p className="sk-field__hint" id={ids.hintId}>{hint}</p>}{error && <p className="sk-field__error" id={ids.errorId}>{error}</p>}</div>;
}
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) { return Check({ ...props, role: undefined }, ref); });
export const Switch = forwardRef<HTMLInputElement, CheckboxProps>(function Switch(props, ref) { return Check({ ...props, role: 'switch' }, ref); });
