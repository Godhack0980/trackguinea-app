import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const password = String(value ?? "");

    const rules = [
      {
        label: "Au moins 8 caractères",
        valid: password.length >= 8,
      },
      {
        label: "Une lettre majuscule",
        valid: /[A-Z]/.test(password),
      },
      {
        label: "Une lettre minuscule",
        valid: /[a-z]/.test(password),
      },
      {
        label: "Un chiffre",
        valid: /\d/.test(password),
      },
      {
        label: "Un caractère spécial (!@#$%^&*)",
        valid: /[^A-Za-z0-9]/.test(password),
      },
    ];

    return (
      <div className="w-full">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            value={value}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}

            <span className="sr-only">
              {showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"}
            </span>
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-slate-800 bg-[#0D1322] p-3">
          <p className="mb-2 text-xs font-semibold text-slate-300">
            Votre mot de passe doit contenir :
          </p>

          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.label}
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors",
                  rule.valid ? "text-green-400" : "text-slate-400"
                )}
              >
                {rule.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}

                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };