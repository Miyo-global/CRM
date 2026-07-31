export interface TicketDetailsDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  statuses?: Array<{ name: string; id: number }>;
}

export interface ProjectMember {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  image: string | null;
  email: string;
}
