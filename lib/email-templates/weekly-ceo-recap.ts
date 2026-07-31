import { appUrl } from "../app-url";
import { escapeHtml } from "./base";

export interface WeeklyCeoRecapData {
  weekRange: string;
  orgName: string;
  totalEmployees: number;
  newLeads: number;
  convertedLeads: number;
  totalActivities: number;
  openTickets: number;
  closedTickets: number;
  pendingLeaves: number;
  topPerformers: { name: string; score: number }[];
  pipelineSummary: { status: string; count: number }[];
  aiNarrative?: string;
}

export function getWeeklyCeoRecapTemplate(data: WeeklyCeoRecapData): string {
  const topPerformersRows = data.topPerformers
    .slice(0, 5)
    .map(
      (p, i) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(p.name)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${p.score} pts</td>
        </tr>`
    )
    .join("");

  const pipelineRows = data.pipelineSummary
    .map(
      (s) =>
        `<tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(s.status)}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${s.count}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Weekly CEO Recap</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: linear-gradient(135deg, #0f2b7f 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #bd882c; margin: 0; font-size: 26px; font-family: Georgia, serif;">Miyo Global</h1>
    <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 16px;">Weekly CEO Recap — ${escapeHtml(data.weekRange)}</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Good morning! Here's your weekly overview for <strong>${escapeHtml(data.orgName)}</strong>.</p>

    ${
      data.aiNarrative
        ? `<div style="background:#f8f3e8;border-left:4px solid #bd882c;padding:16px 20px;margin-bottom:24px;border-radius:4px;">
        <p style="font-size:14px;color:#333;line-height:1.7;margin:0;">${escapeHtml(data.aiNarrative).replace(/\n\n/g, '</p><p style="font-size:14px;color:#333;line-height:1.7;margin:12px 0 0 0;">').replace(/\n/g, " ")}</p>
      </div>`
        : ""
    }

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #1e40af;">${data.newLeads}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">New Leads</p>
      </div>
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #166534;">${data.convertedLeads}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Conversions</p>
      </div>
      <div style="background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #854d0e;">${data.totalActivities}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Activities Logged</p>
      </div>
      <div style="background: #faf5ff; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #7c3aed;">${data.closedTickets}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Tickets Closed</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px 0; font-size: 13px; color: #6b7280;">Total Employees</td><td style="text-align: right; font-weight: bold;">${data.totalEmployees}</td></tr>
      <tr><td style="padding: 8px 0; font-size: 13px; color: #6b7280;">Open Tickets</td><td style="text-align: right; font-weight: bold;">${data.openTickets}</td></tr>
      <tr><td style="padding: 8px 0; font-size: 13px; color: #6b7280;">Pending Leave Requests</td><td style="text-align: right; font-weight: bold;">${data.pendingLeaves}</td></tr>
    </table>

    ${
      data.topPerformers.length > 0
        ? `<h3 style="color: #0f2b7f; border-bottom: 2px solid #bd882c; padding-bottom: 8px;">Sales Leaderboard</h3>
           <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
             <thead><tr style="background: #f9fafb;">
               <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280;">Rank</th>
               <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280;">Name</th>
               <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280;">Score</th>
             </tr></thead>
             <tbody>${topPerformersRows}</tbody>
           </table>`
        : ""
    }

    ${
      data.pipelineSummary.length > 0
        ? `<h3 style="color: #0f2b7f; border-bottom: 2px solid #bd882c; padding-bottom: 8px;">Lead Pipeline</h3>
           <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
             <thead><tr style="background: #f9fafb;">
               <th style="padding: 6px 12px; text-align: left; font-size: 12px; color: #6b7280;">Status</th>
               <th style="padding: 6px 12px; text-align: right; font-size: 12px; color: #6b7280;">Count</th>
             </tr></thead>
             <tbody>${pipelineRows}</tbody>
           </table>`
        : ""
    }

    <div style="text-align: center; margin: 30px 0 10px;">
      <a href="${appUrl}/dashboard"
         style="background: #0f2b7f; color: #bd882c; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Open Dashboard
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 16px; border-radius: 0 0 10px 10px; background: #f9fafb;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      This is an automated weekly recap from Miyo Global CRM.
    </p>
  </div>
</body>
</html>`;
}
