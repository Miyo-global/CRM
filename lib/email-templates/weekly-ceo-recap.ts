import { appUrl } from "../app-url";
import { escapeHtml } from "./base";
import { BRAND } from "@/lib/design/brand-hex";

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
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.border};">${i === 0 ? "" : i === 1 ? "" : i === 2 ? "" : `#${i + 1}`}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.border};">${escapeHtml(p.name)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${BRAND.border}; text-align: right; font-weight: bold;">${p.score} pts</td>
        </tr>`
    )
    .join("");

  const pipelineRows = data.pipelineSummary
    .map(
      (s) =>
        `<tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid ${BRAND.border};">${escapeHtml(s.status)}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid ${BRAND.border}; text-align: right; font-weight: bold;">${s.count}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Weekly CEO Recap</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${BRAND.ink}; max-width: 650px; margin: 0 auto; padding: 20px; background: ${BRAND.sunken};">
  <div style="background: ${BRAND.white}; padding: 20px 24px; border-bottom: 2px solid ${BRAND.gold};">
    <h1 style="color: ${BRAND.gold}; margin: 0; font-size: 26px; font-family: Georgia, serif;">Miyo Global</h1>
    <p style="color: ${BRAND.infoSoft}; margin: 8px 0 0 0; font-size: 16px;">Weekly CEO Recap — ${escapeHtml(data.weekRange)}</p>
  </div>

  <div style="background: ${BRAND.white}; padding: 30px; border: 1px solid ${BRAND.border}; border-top: none;">
    <p style="margin-top: 0;">Good morning! Here's your weekly overview for <strong>${escapeHtml(data.orgName)}</strong>.</p>

    ${
      data.aiNarrative
        ? `<div style="background:${BRAND.goldSoft};border-left:4px solid ${BRAND.gold};padding:16px 20px;margin-bottom:24px;border-radius:4px;">
        <p style="font-size:14px;color:${BRAND.ink};line-height:1.7;margin:0;">${escapeHtml(data.aiNarrative).replace(/\n\n/g, `</p><p style="font-size:14px;color:${BRAND.ink};line-height:1.7;margin:12px 0 0 0;">`).replace(/\n/g, " ")}</p>
      </div>`
        : ""
    }

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
      <div style="background: ${BRAND.infoSoft}; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.ink};">${data.newLeads}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: ${BRAND.inkMuted};">New Leads</p>
      </div>
      <div style="background: ${BRAND.successSoft}; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.success};">${data.convertedLeads}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: ${BRAND.inkMuted};">Conversions</p>
      </div>
      <div style="background: ${BRAND.warningSoft}; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.warning};">${data.totalActivities}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: ${BRAND.inkMuted};">Activities Logged</p>
      </div>
      <div style="background: ${BRAND.plumSoft}; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.plum};">${data.closedTickets}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: ${BRAND.inkMuted};">Tickets Closed</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px 0; font-size: 13px; color: ${BRAND.inkMuted};">Total Employees</td><td style="text-align: right; font-weight: bold;">${data.totalEmployees}</td></tr>
      <tr><td style="padding: 8px 0; font-size: 13px; color: ${BRAND.inkMuted};">Open Tickets</td><td style="text-align: right; font-weight: bold;">${data.openTickets}</td></tr>
      <tr><td style="padding: 8px 0; font-size: 13px; color: ${BRAND.inkMuted};">Pending Leave Requests</td><td style="text-align: right; font-weight: bold;">${data.pendingLeaves}</td></tr>
    </table>

    ${
      data.topPerformers.length > 0
        ? `<h3 style="color: ${BRAND.ink}; border-bottom: 2px solid ${BRAND.gold}; padding-bottom: 8px;">Sales Leaderboard</h3>
           <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
             <thead><tr style="background: ${BRAND.sunken};">
               <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: ${BRAND.inkMuted};">Rank</th>
               <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: ${BRAND.inkMuted};">Name</th>
               <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: ${BRAND.inkMuted};">Score</th>
             </tr></thead>
             <tbody>${topPerformersRows}</tbody>
           </table>`
        : ""
    }

    ${
      data.pipelineSummary.length > 0
        ? `<h3 style="color: ${BRAND.ink}; border-bottom: 2px solid ${BRAND.gold}; padding-bottom: 8px;">Lead Pipeline</h3>
           <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
             <thead><tr style="background: ${BRAND.sunken};">
               <th style="padding: 6px 12px; text-align: left; font-size: 12px; color: ${BRAND.inkMuted};">Status</th>
               <th style="padding: 6px 12px; text-align: right; font-size: 12px; color: ${BRAND.inkMuted};">Count</th>
             </tr></thead>
             <tbody>${pipelineRows}</tbody>
           </table>`
        : ""
    }

    <div style="text-align: center; margin: 30px 0 10px;">
      <a href="${appUrl}/dashboard"
         style="background: ${BRAND.ink}; color: ${BRAND.gold}; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Open Dashboard
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 16px; border-radius: 0 0 10px 10px; background: ${BRAND.sunken};">
    <p style="color: ${BRAND.inkSubtle}; font-size: 12px; margin: 0;">
      This is an automated weekly recap from Miyo Global CRM.
    </p>
  </div>
</body>
</html>`;
}
