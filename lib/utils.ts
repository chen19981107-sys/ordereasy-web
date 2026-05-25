import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Upload file to S3 via manus-upload-file CLI
 * This is a placeholder for local development
 * In production, use the actual S3 upload endpoint
 */
export async function manus_upload_file(uri: string): Promise<string[]> {
  // For now, return a placeholder URL
  // In production, this would upload to S3 and return the actual URL
  const filename = uri.split("/").pop() || "image.jpg";
  const timestamp = Date.now();
  return [`https://placeholder.example.com/images/${timestamp}-${filename}`];
}
