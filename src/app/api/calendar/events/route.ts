import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { filterEventsForDaysOff } from "@/lib/google-calendar";
import { GoogleCalendarEvent } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax are required" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // First, get all calendar IDs
    const calendarList = await calendar.calendarList.list();
    const calendars = calendarList.data.items || [];

    const allEvents: GoogleCalendarEvent[] = [];

    // Fetch events from each calendar
    for (const cal of calendars) {
      if (!cal.id) continue;

      try {
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
        });

        const events = eventsResponse.data.items || [];

        for (const event of events) {
          if (event.id && event.summary) {
            // Handle all-day events (date) vs timed events (dateTime)
            const start = event.start?.date || event.start?.dateTime;
            const end = event.end?.date || event.end?.dateTime;

            if (start && end) {
              allEvents.push({
                id: event.id,
                summary: event.summary,
                start: start.split("T")[0],
                end: end.split("T")[0],
              });
            }
          }
        }
      } catch (calError) {
        // Skip calendars we can't access
        console.warn(`Could not access calendar ${cal.id}:`, calError);
      }
    }

    const daysOff = filterEventsForDaysOff(allEvents);

    return NextResponse.json({ daysOff, eventCount: allEvents.length });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
