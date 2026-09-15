export function sanitizeText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Strips HTML tags
    .trim()
    .slice(0, 500); // Enforce max character length
}