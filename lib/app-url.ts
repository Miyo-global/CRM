function resolveAppUrl(): string {
  let url = "";
  if (process.env.NEXT_PUBLIC_APP_URL) {
    url = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.NEXTAUTH_URL) {
    url = process.env.NEXTAUTH_URL;
  } else if (process.env.VERCEL_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  } else {
    url = "http://localhost:3000";
  }

  if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
    url = url.replace("http://", "https://");
  }

  return url;
}

export const appUrl = resolveAppUrl();
