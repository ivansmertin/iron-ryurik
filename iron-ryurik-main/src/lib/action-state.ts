import type { ZodError } from "zod/v4";

export type FieldErrors = Record<string, string[]>;

export type ActionState =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: false;
      fieldErrors: FieldErrors;
    }
  | undefined;

export function getActionError(message: string): ActionState {
  return {
    ok: false,
    error: message,
  };
}

export function getActionFieldErrors(
  fieldErrors: FieldErrors,
): Extract<ActionState, { fieldErrors: FieldErrors }> {
  return {
    ok: false,
    fieldErrors,
  };
}

export function getActionFieldErrorsFromZodError(error: ZodError): ActionState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].length > 0,
    ),
  );

  if (Object.keys(fieldErrors).length === 0) {
    return getActionError("Не удалось обработать форму. Попробуйте ещё раз.");
  }

  return getActionFieldErrors(fieldErrors);
}
