/**
 * Calendar XL Transform Sandbox
 * 
 * TRMNL Sandbox Runtime: https://help.trmnl.com/en/articles/12996946-parsing-plugins-with-the-sandbox-runtime
 * 
 * Paste this code into TRMNL Markup Editor > Transform tab
 * 
 * Filters merged calendar events to reduce payload size below 100 KB.
 * Keeps only events within a reasonable time window (today + next 30 days)
 * and removes unnecessary bulk (descriptions, attachments, etc.).
 * 
 * TRMNL Constraints:
 * - Node.js v22 runtime (isolated-vm)
 * - Execution timeout: 1 second max
 * - No internet access allowed
 * - Input contains the complete original payload
 * - Return a new object to replace the payload
 * 
 * Transform Rules:
 * 1. Keep events from today through +30 days
 * 2. Remove description field (usually the largest bulk contributor)
 * 3. Limit to max 30 events to stay well under 100 KB
 * 4. Keep only essential fields for template rendering
 * 5. Preserve calendar namespace structure (e.g., google_calendar_123456)
 */

/**
 * Main transform function
 * 
 * REQUIRED: Must be named transform() and accept input parameter.
 * 
 * @param {Object} input - Complete original payload from TRMNL
 * @returns {Object} - Transformed payload with same structure but filtered content
 */
function transform(input) {
  try {
    // Find the calendar namespace (e.g., google_calendar_123456)
    // Examples: google_calendar_*, calendar_*, or any key containing 'calendar'
    const calendarNamespaces = Object.keys(input).filter(key => 
      key.startsWith('google_calendar_') || 
      key.startsWith('calendar_') ||
      key.includes('calendar')
    );

    if (calendarNamespaces.length === 0) {
      return input; // Return unmodified if no calendar found
    }

    // Transform each calendar namespace independently
    // Preserves the namespace structure so templates can access data via same keys
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
    // Error handling: if transform fails for any reason, return original payload
    // This ensures plugin keeps working even if transform has a bug
    console.error('Transform error:', error);
    return input;
  }
}

/**
 * Filter and clean events
 * 
 * Reduces event array by:
 * - Filtering to 30-day window (today ± 1 day ~ +30 days)
 * - Removing bulk fields (description, location, attendees)
 * - Keeping only essential fields for template rendering
 * - Limiting to 30 events maximum
 * 
 * @param {Array} events - Array of calendar events
 * @returns {Array} - Filtered and cleaned events
 */
function filterAndCleanEvents(events) {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  return events
    .filter(event => {
      try {
        // Parse event date from date_time or start_full field
        const eventDate = new Date(event.date_time || event.start_full);
        // Only keep events within the 30-day window
        return eventDate >= yesterday && eventDate <= thirtyDaysLater;
      } catch {
        // Skip events with invalid dates
        return false;
      }
    })
    .map(event => ({
      // KEPT: Essential fields required by Calendar XL templates
      summary: event.summary || '',           // Event title/name
      status: event.status || 'confirmed',    // Event confirmation status
      date_time: event.date_time,             // ISO timestamp (primary)
      all_day: event.all_day || false,        // All-day flag (filters from NOW/NEXT)
      calname: event.calname || 'primary',    // Calendar identifier
      start_full: event.start_full,           // Full timestamp for time calculations
      end_full: event.end_full,               // Full timestamp for time calculations
      start: event.start,                     // Pre-formatted start time (e.g., "2:00 PM")
      end: event.end,                         // Pre-formatted end time (e.g., "3:00 PM")
      
      // REMOVED: Bulk fields not used by templates
      // - description (often 100+ chars, major contributor to payload size)
      // - location (not displayed in Calendar XL layouts)
      // - attendees (not displayed, can be large array)
      // - attachments (not displayed, can add significant size)
      // - recurrence, organizer, source, etc. (unused)
    }))
    .slice(0, 30); // Hard limit to 30 events to ensure we stay under 100 KB
}
