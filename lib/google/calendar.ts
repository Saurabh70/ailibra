import "server-only";
import { google, calendar_v3 } from "googleapis";
import { getAuthedClient } from "@/lib/google/tokens";

export async function calendarClient(): Promise<calendar_v3.Calendar> {
  const auth = await getAuthedClient();
  return google.calendar({ version: "v3", auth });
}

export type UpcomingEvent = {
  id: string;
  summary: string;
  description: string | null;
  start: string; // ISO
  end: string;
  attendees: string[];
  location: string | null;
  hangout_link: string | null;
};

export async function listUpcoming(hoursAhead = 48): Promise<UpcomingEvent[]> {
  const cal = await calendarClient();
  const now = new Date();
  const end = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });
  return (res.data.items ?? []).map((e) => ({
    id: e.id ?? "",
    summary: e.summary ?? "(no title)",
    description: e.description ?? null,
    start: e.start?.dateTime ?? e.start?.date ?? "",
    end: e.end?.dateTime ?? e.end?.date ?? "",
    attendees: (e.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    location: e.location ?? null,
    hangout_link: e.hangoutLink ?? null,
  }));
}

export async function createEvent(args: {
  summary: string;
  description?: string;
  start: string; // ISO
  end: string;
  attendees: string[];
}): Promise<{ id: string; html_link: string | null; meet_link: string | null }> {
  const cal = await calendarClient();
  const res = await cal.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: args.summary,
      description: args.description,
      start: { dateTime: args.start, timeZone: "Asia/Kolkata" },
      end: { dateTime: args.end, timeZone: "Asia/Kolkata" },
      attendees: args.attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });
  return {
    id: res.data.id ?? "",
    html_link: res.data.htmlLink ?? null,
    meet_link: res.data.hangoutLink ?? null,
  };
}
