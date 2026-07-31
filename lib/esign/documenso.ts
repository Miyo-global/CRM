


function getConfig(): { apiUrl: string; apiToken: string } | null {
  const apiUrl = process.env.DOCUMENSO_API_URL;
  const apiToken = process.env.DOCUMENSO_API_TOKEN;
  if (!apiUrl || !apiToken) return null;
  return { apiUrl: apiUrl.replace(/\/$/, ""), apiToken };
}


export interface DocumensoRecipient {
  name: string;
  email: string;
  role?: "SIGNER" | "VIEWER" | "APPROVER";
}

export interface CreateSigningRequestInput {
  
  title: string;
  
  htmlContent: string;
  
  recipients: DocumensoRecipient[];
  
  redirectUrl?: string;
  
  webhookUrl?: string;
}

export interface SigningRequestResult {
  sent: true;
  externalDocId: string;
  signingUrl: string;
}

export interface SigningRequestFailed {
  sent: false;
  reason: string;
}

export type CreateSigningRequestResult = SigningRequestResult | SigningRequestFailed;

export interface DocumensoDocumentStatus {
  id: string;
  status: "PENDING" | "COMPLETED" | "DECLINED" | "EXPIRED";
  recipients: Array<{
    name: string;
    email: string;
    role: string;
    signingStatus: "NOT_OPENED" | "OPENED" | "SIGNED" | "DECLINED";
    signingUrl?: string;
    signedAt?: string;
  }>;
}


async function documensoFetch<T>(
  endpoint: string,
  options: RequestInit,
  config: { apiUrl: string; apiToken: string }
): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Documenso API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}



export async function createSigningRequest(
  input: CreateSigningRequestInput
): Promise<CreateSigningRequestResult> {
  const config = getConfig();
  if (!config) return { sent: false, reason: "not_configured" };

  try {
    interface DocumensoCreateResponse {
      id: string | number;
      recipients?: Array<{ signingUrl?: string }>;
    }

    const payload: Record<string, unknown> = {
      title: input.title,
      recipients: input.recipients.map((r) => ({
        name: r.name,
        email: r.email,
        role: r.role ?? "SIGNER",
      })),
    };

    if (input.redirectUrl) payload.redirectUrl = input.redirectUrl;

    if (input.webhookUrl) {
      payload.webhooks = [{ url: input.webhookUrl, triggerEvents: ["document.signed", "document.viewed", "document.declined", "document.sent"] }];
    }

    const doc = await documensoFetch<DocumensoCreateResponse>(
      "/api/v1/documents",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          formValues: {},
          meta: { subject: input.title, message: "" },
        }),
      },
      config
    );

    const signingUrl =
      doc.recipients?.[0]?.signingUrl ??
      `${config.apiUrl}/sign/${doc.id}`;

    return {
      sent: true,
      externalDocId: String(doc.id),
      signingUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sent: false, reason: message };
  }
}


export async function getDocumentStatus(
  externalDocId: string
): Promise<DocumensoDocumentStatus | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    return await documensoFetch<DocumensoDocumentStatus>(
      `/api/v1/documents/${externalDocId}`,
      { method: "GET" },
      config
    );
  } catch {
    return null;
  }
}


export async function sendSigningReminder(externalDocId: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  try {
    await documensoFetch<unknown>(
      `/api/v1/documents/${externalDocId}/send`,
      { method: "POST", body: JSON.stringify({ sendEmail: true }) },
      config
    );
    return true;
  } catch {
    return false;
  }
}


export async function voidDocument(externalDocId: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  try {
    await documensoFetch<unknown>(
      `/api/v1/documents/${externalDocId}/void`,
      { method: "DELETE" },
      config
    );
    return true;
  } catch {
    return false;
  }
}
