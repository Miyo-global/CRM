import { describe, expect, it } from "vitest";

import { extractContentText } from "./content";
import {
  deriveContentText,
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_CATEGORIES,
} from "./starter-templates";

describe("starter templates", () => {
  it("has the fifteen from the checklist, with unique keys and names", () => {
    expect(STARTER_TEMPLATES).toHaveLength(15);
    expect(new Set(STARTER_TEMPLATES.map((t) => t.key)).size).toBe(15);
    expect(new Set(STARTER_TEMPLATES.map((t) => t.name)).size).toBe(15);

    for (const name of [
      "Meeting Notes",
      "Standard Operating Procedure",
      "Policy",
      "Decision Record",
      "Runbook",
      "Project Brief",
      "Playbook",
      "Troubleshooting Guide",
      "Support Article",
      "Onboarding Guide",
      "Weekly Update",
      "Retrospective",
      "Product Requirements Document",
      "How-to Guide",
      "FAQ",
    ]) {
      expect(
        STARTER_TEMPLATES.map((t) => t.name),
        name,
      ).toContain(name);
    }
  });

  it("carries a valid Plate value that the content walker can read", () => {
    for (const template of STARTER_TEMPLATES) {
      expect(Array.isArray(template.content), template.key).toBe(true);
      expect(template.content.length, template.key).toBeGreaterThan(0);
      for (const block of template.content) {
        expect(block.type, template.key).toMatch(/^(h1|h2|h3|p|blockquote)$/);
        expect(Array.isArray(block.children), template.key).toBe(true);
      }
      // The first block is the title heading, so the text is never empty.
      expect(extractContentText(template.content).trim(), template.key).not.toBe("");
      expect(deriveContentText(template.content)).toContain(
        template.content[0].children[0].text,
      );
    }
  });

  it("carries no emoji icons, which the CRM design rules rule out", () => {
    for (const template of STARTER_TEMPLATES) {
      expect(template.icon, template.key).toBeNull();
    }
  });

  it("files every template under a known category", () => {
    for (const template of STARTER_TEMPLATES) {
      expect(STARTER_TEMPLATE_CATEGORIES, template.key).toContain(template.category);
    }
  });

  it("describes each one, for the picker", () => {
    for (const template of STARTER_TEMPLATES) {
      expect(template.description.length, template.key).toBeGreaterThan(10);
      expect(template.expectedOutput.length, template.key).toBeGreaterThan(10);
    }
  });
});
