/**
 * Transform Sandbox Tests
 * 
 * Tests to ensure the transform function:
 * 1. Reduces payload size below 100 KB
 * 2. Preserves all required fields
 * 3. Removes unnecessary bulk (descriptions, locations)
 * 4. Filters events to 30-day window
 * 5. Limits to 30 events maximum
 * 
 * Run with: node scripts/test-transform.js
 */

const fs = require('fs');
const path = require('path');

// Load demo data
const demoDataPath = path.join(__dirname, '../assets/demo/trmnl-plugin-merge-snapshot.json');
const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));

// Import transform function (copied from transform-sandbox/transform.js)
function transform(input, referenceDate = null) {
  try {
    const calendarNamespaces = Object.keys(input).filter(key => 
      key.startsWith('google_calendar_') || 
      key.startsWith('calendar_') ||
      key.includes('calendar')
    );

    if (calendarNamespaces.length === 0) {
      return input;
    }

    const transformed = {};
    for (const namespace of calendarNamespaces) {
      const calendar = input[namespace];
      const events = Array.isArray(calendar.events) ? calendar.events : [];
      
      transformed[namespace] = {
        events: filterAndCleanEvents(events, referenceDate)
      };
    }

    return transformed;
  } catch (error) {
    console.error('Transform error:', error);
    return input;
  }
}

function filterAndCleanEvents(events, referenceDate = null) {
  const now = referenceDate || new Date();
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
      summary: event.summary || '',
      status: event.status || 'confirmed',
      date_time: event.date_time,
      all_day: event.all_day || false,
      calname: event.calname || 'primary',
      start_full: event.start_full,
      end_full: event.end_full,
      start: event.start,
      end: event.end,
    }))
    .slice(0, 30);
}

// Test utilities
class TestResult {
  constructor(name) {
    this.name = name;
    this.passed = true;
    this.message = '';
    this.details = {};
  }

  assert(condition, failMessage) {
    if (!condition) {
      this.passed = false;
      this.message = failMessage;
    }
  }

  assertEqual(actual, expected, failMessage) {
    if (actual !== expected) {
      this.passed = false;
      this.message = `${failMessage}\n  Expected: ${expected}\n  Actual: ${actual}`;
    }
  }

  assertGreater(actual, threshold, failMessage) {
    if (actual <= threshold) {
      this.passed = false;
      this.message = `${failMessage}\n  Expected > ${threshold}\n  Actual: ${actual}`;
    }
  }

  assertLess(actual, threshold, failMessage) {
    if (actual >= threshold) {
      this.passed = false;
      this.message = `${failMessage}\n  Expected < ${threshold}\n  Actual: ${actual}`;
    }
  }

  log() {
    const icon = this.passed ? '✅' : '❌';
    console.log(`${icon} ${this.name}`);
    if (!this.passed) {
      console.log(`   ${this.message}`);
    }
    if (Object.keys(this.details).length > 0) {
      Object.entries(this.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
  }
}

// Run tests
console.log('\n📋 Transform Sandbox Test Suite\n');
console.log('=' .repeat(50));

const results = [];

// Use demo data's reference date for testing (2026-03-17)
const demoRefDate = new Date(demoData.google_calendar_123456.today_in_tz);

// TEST 1: Transform reduces payload size
{
  const test = new TestResult('Payload size is reduced below 100 KB');
  const originalSize = Buffer.byteLength(JSON.stringify(demoData));
  const transformed = transform(demoData, demoRefDate);
  const transformedSize = Buffer.byteLength(JSON.stringify(transformed));
  const reduction = ((originalSize - transformedSize) / originalSize * 100).toFixed(1);
  
  test.assertLess(transformedSize, 102400, 'Transformed payload should be < 100 KB');
  test.details['Original Size'] = `${(originalSize / 1024).toFixed(2)} KB`;
  test.details['Transformed Size'] = `${(transformedSize / 1024).toFixed(2)} KB`;
  test.details['Reduction'] = `${reduction}%`;
  test.log();
  results.push(test);
}

// TEST 2: Required fields are preserved
{
  const test = new TestResult('All required fields are preserved');
  const transformed = transform(demoData, demoRefDate);
  const namespace = Object.keys(transformed)[0];
  const eventCount = transformed[namespace].events.length;
  
  test.assert(eventCount > 0, 'Should have at least one event after transform');
  
  if (eventCount > 0) {
    const firstEvent = transformed[namespace].events[0];
    const requiredFields = ['summary', 'start_full', 'end_full', 'all_day', 'start', 'end'];
    requiredFields.forEach(field => {
      test.assert(
        field in firstEvent,
        `Missing required field: ${field}`
      );
    });
    test.details['Required Fields'] = requiredFields.join(', ');
  }
  test.details['Events After Transform'] = eventCount;
  test.log();
  results.push(test);
}

// TEST 3: Descriptions are removed
{
  const test = new TestResult('Descriptions field is removed');
  const transformed = transform(demoData, demoRefDate);
  const namespace = Object.keys(transformed)[0];
  
  if (transformed[namespace].events.length > 0) {
    const firstEvent = transformed[namespace].events[0];
    test.assert(
      !('description' in firstEvent),
      'Description field should not exist in transformed events'
    );
  }
  test.log();
  results.push(test);
}

// TEST 4: Location is removed
{
  const test = new TestResult('Location field is removed');
  const transformed = transform(demoData, demoRefDate);
  const namespace = Object.keys(transformed)[0];
  
  if (transformed[namespace].events.length > 0) {
    const firstEvent = transformed[namespace].events[0];
    test.assert(
      !('location' in firstEvent),
      'Location field should not exist in transformed events'
    );
  }
  test.log();
  results.push(test);
}

// TEST 5: Event count is limited to 30
{
  const test = new TestResult('Event count is limited to 30 maximum');
  
  // Create a test payload with 100 events
  const largePayload = {
    google_calendar_test: {
      events: Array.from({ length: 100 }, (_, i) => ({
        summary: `Event ${i}`,
        description: 'Large description that should be removed',
        status: 'confirmed',
        date_time: new Date(Date.now() + i * 3600000).toISOString(),
        all_day: false,
        calname: 'test',
        start_full: new Date(Date.now() + i * 3600000).toISOString(),
        end_full: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
        start: '2:00 PM',
        end: '3:00 PM',
        location: 'Test Location',
        attendees: ['user@example.com'],
        attachments: [{ name: 'file.pdf', url: 'https://example.com/file.pdf' }]
      }))
    }
  };
  
  const transformed = transform(largePayload);
  const namespace = Object.keys(transformed)[0];
  const eventCount = transformed[namespace].events.length;
  
  test.assertLess(eventCount, 31, 'Should limit to 30 events');
  test.details['Original Event Count'] = '100';
  test.details['Transformed Event Count'] = eventCount;
  test.log();
  results.push(test);
}

// TEST 6: 30-day filter works
{
  const test = new TestResult('Events are filtered to 30-day window');
  
  const now = demoRefDate;
  const testPayload = {
    google_calendar_test: {
      events: [
        {
          summary: 'Today',
          date_time: now.toISOString(),
          all_day: false,
          status: 'confirmed',
          calname: 'test',
          start_full: now.toISOString(),
          end_full: new Date(now.getTime() + 3600000).toISOString(),
          start: '2:00 PM',
          end: '3:00 PM'
        },
        {
          summary: 'In 15 days',
          date_time: new Date(now.getTime() + 15 * 24 * 3600000).toISOString(),
          all_day: false,
          status: 'confirmed',
          calname: 'test',
          start_full: new Date(now.getTime() + 15 * 24 * 3600000).toISOString(),
          end_full: new Date(now.getTime() + (15 * 24 + 1) * 3600000).toISOString(),
          start: '2:00 PM',
          end: '3:00 PM'
        },
        {
          summary: 'In 60 days (should be removed)',
          date_time: new Date(now.getTime() + 60 * 24 * 3600000).toISOString(),
          all_day: false,
          status: 'confirmed',
          calname: 'test',
          start_full: new Date(now.getTime() + 60 * 24 * 3600000).toISOString(),
          end_full: new Date(now.getTime() + (60 * 24 + 1) * 3600000).toISOString(),
          start: '2:00 PM',
          end: '3:00 PM'
        }
      ]
    }
  };
  
  const transformed = transform(testPayload, now);
  const namespace = Object.keys(transformed)[0];
  const eventCount = transformed[namespace].events.length;
  const hasFarFutureEvent = transformed[namespace].events.some(e => e.summary.includes('60 days'));
  
  test.assertEqual(eventCount, 2, 'Should include only events within 30-day window');
  test.assert(!hasFarFutureEvent, '60-day event should be filtered out');
  test.log();
  results.push(test);
}

// TEST 7: Bonus fields are preserved
{
  const test = new TestResult('Bonus fields (status, calname) are preserved');
  const transformed = transform(demoData, demoRefDate);
  const namespace = Object.keys(transformed)[0];
  
  if (transformed[namespace].events.length > 0) {
    const firstEvent = transformed[namespace].events[0];
    const bonusFields = ['status', 'calname', 'date_time'];
    bonusFields.forEach(field => {
      test.assert(
        field in firstEvent,
        `Missing bonus field: ${field}`
      );
    });
    test.details['Bonus Fields'] = bonusFields.join(', ');
  }
  test.log();
  results.push(test);
}

// TEST 8: Original data is not mutated
{
  const test = new TestResult('Original data is not mutated');
  const originalCopy = JSON.parse(JSON.stringify(demoData));
  transform(demoData);
  
  const isUnchanged = JSON.stringify(demoData) === JSON.stringify(originalCopy);
  test.assert(isUnchanged, 'Original input data should not be mutated');
  test.log();
  results.push(test);
}

// TEST 9: Multiple calendar namespaces are handled
{
  const test = new TestResult('Multiple calendar namespaces are handled');
  const multiCalPayload = {
    google_calendar_123: {
      events: [
        {
          summary: 'Work Event',
          date_time: new Date().toISOString(),
          all_day: false,
          status: 'confirmed',
          calname: 'work',
          start_full: new Date().toISOString(),
          end_full: new Date(Date.now() + 3600000).toISOString(),
          start: '2:00 PM',
          end: '3:00 PM'
        }
      ]
    },
    personal_calendar_456: {
      events: [
        {
          summary: 'Personal Event',
          date_time: new Date().toISOString(),
          all_day: false,
          status: 'confirmed',
          calname: 'personal',
          start_full: new Date().toISOString(),
          end_full: new Date(Date.now() + 3600000).toISOString(),
          start: '4:00 PM',
          end: '5:00 PM'
        }
      ]
    }
  };
  
  const transformed = transform(multiCalPayload, demoRefDate);
  const namespaces = Object.keys(transformed);
  
  test.assertEqual(namespaces.length, 2, 'Should preserve both calendar namespaces');
  test.assert(
    transformed.google_calendar_123.events.length > 0,
    'google_calendar_123 should have events'
  );
  test.assert(
    transformed.personal_calendar_456.events.length > 0,
    'personal_calendar_456 should have events'
  );
  test.log();
  results.push(test);
}

// Summary
console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const total = results.length;
const percentage = ((passed / total) * 100).toFixed(0);

console.log(`\n📊 Results: ${passed}/${total} tests passed (${percentage}%)\n`);

if (passed === total) {
  console.log('✅ All tests passed! Transform is production-ready.');
  process.exit(0);
} else {
  console.log(`❌ ${total - passed} test(s) failed. Please review above.`);
  process.exit(1);
}
