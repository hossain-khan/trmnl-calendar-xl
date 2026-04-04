/**
 * Calendar XL Transform Sandbox
 * 
 * Paste this code into TRMNL Markup Editor > Transform tab
 * 
 * Filters merged calendar events to reduce payload size below 100 KB.
 * Keeps only events within a reasonable time window (today + next 30 days)
 * and removes unnecessary bulk (descriptions, attachments, etc.).
 * 
 * Rules:
 * 1. Keep events from today through +30 days
 * 2. Remove description field (usually the largest bulk)
 * 3. Limit to max 30 events to stay well under 100 KB
 * 4. Keep only essential fields for template rendering
 * 
 * Node.js v22 runtime with 1-second execution timeout
 */

function transform(input) {
  try {
    // Find the calendar namespace (e.g., google_calendar_123456)
    const calendarNamespaces = Object.keys(input).filter(key => 
      key.startsWith('google_calendar_') || 
      key.startsWith('calendar_') ||
      key.includes('calendar')
    );

    if (calendarNamespaces.length === 0) {
      return input; // Return unmodified if no calendar found
    }

    // Transform each calendar namespace
    const transformed = {};
    for (const namespace of calendarNamespaces) {
      const calendar = input[namespace];
      const events = Array.isArray(calendar.events) ? calendar.events : [];
      
      transformed[namespace] = {
        events: filterAndCleanEvents(events)
      };
    }

    return transformed;
  } catch (error) {
    console.error('Transform error:', error);
    return input; // Fallback to original if transform fails
  }
}

function filterAndCleanEvents(events) {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  return events
    .filter(event => {
      try {
        const eventDate = new Date(event.date_time || event.start_full);
        return eventDate >= yesterday && eventDate <= thirtyDaysLater;
      } catch {
        return false;
      }
    })
    .map(event => ({
      // Keep only essential fields for the template
      summary: event.summary || '',
      status: event.status || 'confirmed',
      date_time: event.date_time,
      all_day: event.all_day || false,
      calname: event.calname || 'primary',
      start_full: event.start_full,
      end_full: event.end_full,
      start: event.start,
      end: event.end,
      // Explicitly exclude: description, location, attendees, attachments, etc.
    }))
    .slice(0, 30); // Hard limit to 30 events
}
