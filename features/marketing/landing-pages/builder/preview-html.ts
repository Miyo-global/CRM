export function buildPreviewHtml(title: string, description: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title || "Preview"}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111; }
  .hero { background: #0f2b7f; color: #fff; padding: 3rem 1.5rem; text-align: center; }
  .hero h1 { margin: 0 0 0.75rem; font-size: 2rem; font-weight: 700; }
  .hero p { margin: 0; font-size: 1.1rem; opacity: 0.8; }
  .container { max-width: 800px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .content { line-height: 1.7; }
  .content h1, .content h2, .content h3 { margin-top: 1.5rem; }
  .content p { margin: 0.75rem 0; }
  .content ul, .content ol { padding-left: 1.5rem; }
  .cta-box { margin-top: 2rem; padding: 1.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .cta-box h2 { margin: 0 0 0.5rem; font-size: 1.125rem; }
  .cta-box p { margin: 0 0 1rem; font-size: 0.875rem; color: #6b7280; }
  input, textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 0.75rem; }
  button { width: 100%; padding: 0.625rem; background: #bd882c; color: #fff; border: none; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<div class="hero">
  <h1>${title || "Your Page Title"}</h1>
  ${description ? `<p>${description}</p>` : ""}
</div>
<div class="container">
  ${content ? `<div class="content">${content}</div>` : ""}
  <div class="cta-box">
    <h2>Get in Touch</h2>
    <p>Fill in your details and we'll reach out to you shortly.</p>
    <input placeholder="Your name *" />
    <input placeholder="Email address" />
    <input placeholder="Phone number" />
    <button>Send Message</button>
  </div>
</div>
</body>
</html>`;
}
