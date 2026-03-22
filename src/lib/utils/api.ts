import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationError(error: { errors?: unknown }) {
  return NextResponse.json(
    { success: false, error: "Validation failed", details: error.errors },
    { status: 422 },
  );
}

export const Errors = {
  unauthorized: () => err("Unauthorized", 401),
  forbidden: () => err("Forbidden", 403),
  notFound: (entity = "Resource") => err(`${entity} not found`, 404),
  conflict: (message = "Already exists") => err(message, 409),
  serverError: (message = "Internal server error") => err(message, 500),
};
