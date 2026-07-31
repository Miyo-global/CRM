export function jobPostingSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function jobPostingPath(jobId: number, title: string): string {
  return `/careers/${jobId}/${jobPostingSlug(title)}`;
}
