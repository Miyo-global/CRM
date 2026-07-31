export interface EmailTemplateConfig {
  id: string;
  category: string;
  name: string;
  generate: () => { subject: string; html: string };
}
