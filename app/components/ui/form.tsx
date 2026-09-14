/**
 * Componentes de formulario reutilizables.
 * Son componentes de presentación: no manejan estado ni datos.
 */
import type {
  ComponentProps,
  ReactNode,
} from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

// ----------------------------------------------------------------------------
// Inputs
// ----------------------------------------------------------------------------
export const inputBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none " +
  "focus:ring-2 focus:ring-emerald-500/40 disabled:bg-zinc-100 disabled:text-zinc-500";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} min-h-20 resize-y ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputBase} ${props.className ?? ""}`} />
  );
}

// ----------------------------------------------------------------------------
// Campo con label y error
// ----------------------------------------------------------------------------
interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mensaje de error de formulario
// ----------------------------------------------------------------------------
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Botones
// ----------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:ring-zinc-400/40",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
      {...rest}
    />
  );
}

// ----------------------------------------------------------------------------
// Link con estilo de botón
// ----------------------------------------------------------------------------
interface ButtonLinkProps extends Omit<ComponentProps<"a">, "href"> {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = "secondary",
  className = "",
  disabled = false,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${buttonVariants[variant]} ${disabled ? "pointer-events-none opacity-60" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}