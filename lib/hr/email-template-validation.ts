export const TEMPLATE_NAME_MIN = 5;
export const TEMPLATE_NAME_MAX = 80;
export const TEMPLATE_SUBJECT_MIN = 5;
export const TEMPLATE_SUBJECT_MAX = 200;
export const TEMPLATE_BODY_MIN = 10;
export const TEMPLATE_BODY_MAX = 20000;

export const TEMPLATE_NAME_ALLOWED = /^[\p{L}\p{N} \-–—/&().,':]+$/u;
export const TEMPLATE_NAME_ALLOWED_HINT = "letters, numbers, spaces and - – — / & ( ) . , ' :";

export interface TemplateFieldErrors {
  name?: string;
  subject?: string;
  body?: string;
}

export function validateTemplateName(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return "Template name is required.";
  if (value.length < TEMPLATE_NAME_MIN)
    return `Template name must be at least ${TEMPLATE_NAME_MIN} characters.`;
  if (value.length > TEMPLATE_NAME_MAX)
    return `Template name must be ${TEMPLATE_NAME_MAX} characters or fewer.`;
  if (!TEMPLATE_NAME_ALLOWED.test(value))
    return `Template name can only contain ${TEMPLATE_NAME_ALLOWED_HINT}.`;
  return undefined;
}

export function validateTemplateSubject(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return "Subject is required.";
  if (value.length < TEMPLATE_SUBJECT_MIN)
    return `Subject must be at least ${TEMPLATE_SUBJECT_MIN} characters.`;
  if (value.length > TEMPLATE_SUBJECT_MAX)
    return `Subject must be ${TEMPLATE_SUBJECT_MAX} characters or fewer.`;
  return undefined;
}

export function validateTemplateBody(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return "Body is required.";
  if (value.length < TEMPLATE_BODY_MIN)
    return `Body must be at least ${TEMPLATE_BODY_MIN} characters.`;
  if (value.length > TEMPLATE_BODY_MAX)
    return `Body must be ${TEMPLATE_BODY_MAX} characters or fewer.`;
  return undefined;
}

export function validateTemplateForm(input: {
  name: string;
  subject: string;
  body: string;
}): TemplateFieldErrors {
  const errors: TemplateFieldErrors = {};
  const name = validateTemplateName(input.name);
  const subject = validateTemplateSubject(input.subject);
  const body = validateTemplateBody(input.body);
  if (name) errors.name = name;
  if (subject) errors.subject = subject;
  if (body) errors.body = body;
  return errors;
}
