import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { 
  createClioContact, 
  createClioMatter, 
  createClioTask, 
  completeClioTask, 
  createClioCalendarEvent,
  updateClioMatterStatus
} from '@/lib/clioPush';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = getToken('clio');
  const results: Record<string, any> = {
    connection: token ? 'Connected (Live Mode)' : 'Disconnected (Mock Mode)',
    steps: []
  };

  try {
    let testContactId: string | number = 'mock-contact-999';
    let testMatterId: string | number = 'mock-matter-999';
    let testTaskId: string | number = 'mock-task-999';
    let testEventId: string | number = 'mock-event-999';

    // ── STEP 1: TEST CONTACT CREATION ────────────────────────────────────────
    try {
      if (token) {
        const contact = await createClioContact(
          `Test Client ${Date.now()}`,
          'testclient@clucotests.com',
          '555-0199'
        );
        testContactId = contact.id;
        results.steps.push({
          step: '1. Contact Creation',
          status: 'SUCCESS',
          live: true,
          details: { id: contact.id, name: contact.name }
        });
      } else {
        results.steps.push({
          step: '1. Contact Creation (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testContactId, name: 'Mock Client' }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '1. Contact Creation',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    // ── STEP 2: TEST MATTER CREATION (LINKED TO CONTACT) ──────────────────────
    try {
      if (token) {
        const matter = await createClioMatter(
          `Test Matter Litigation File ${Date.now()}`,
          testContactId
        );
        testMatterId = matter.id;
        results.steps.push({
          step: '2. Matter Creation',
          status: 'SUCCESS',
          live: true,
          details: { id: matter.id, display_number: matter.display_number, description: matter.description }
        });
      } else {
        results.steps.push({
          step: '2. Matter Creation (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testMatterId, display_number: 'CLO-00999', description: 'Mock Litigation File' }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '2. Matter Creation',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    // ── STEP 3: TEST TASK CREATION (LINKED TO MATTER) ────────────────────────
    try {
      if (token) {
        const task = await createClioTask(
          testMatterId,
          `Submit Test Intake Record ${Date.now()}`,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        );
        testTaskId = task.id;
        results.steps.push({
          step: '3. Task Creation',
          status: 'SUCCESS',
          live: true,
          details: { id: task.id, name: task.name, due_at: task.due_at }
        });
      } else {
        results.steps.push({
          step: '3. Task Creation (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testTaskId, name: 'Submit Test Intake Record', due_at: '2026-07-21' }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '3. Task Creation',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    // ── STEP 4: TEST TASK COMPLETION (PATCH) ─────────────────────────────────
    try {
      if (token) {
        const task = await completeClioTask(testTaskId, true);
        results.steps.push({
          step: '4. Task Completion Toggle',
          status: 'SUCCESS',
          live: true,
          details: { id: task.id, name: task.name, complete: task.complete }
        });
      } else {
        results.steps.push({
          step: '4. Task Completion Toggle (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testTaskId, complete: true }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '4. Task Completion Toggle',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    // ── STEP 5: TEST CALENDAR EVENT CREATION ──────────────────────────────────
    try {
      if (token) {
        const event = await createClioCalendarEvent(
          testMatterId,
          `Initial Client Assessment Hearing ${Date.now()}`,
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        );
        testEventId = event.id;
        results.steps.push({
          step: '5. Calendar Event Creation',
          status: 'SUCCESS',
          live: true,
          details: { id: event.id, summary: event.summary, start_at: event.start_at }
        });
      } else {
        results.steps.push({
          step: '5. Calendar Event Creation (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testEventId, summary: 'Initial Client Assessment Hearing', start_at: '2026-07-16' }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '5. Calendar Event Creation',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    // ── STEP 6: TEST MATTER STATUS UPDATE (PATCH) ────────────────────────────
    try {
      if (token) {
        const updatedMatter = await updateClioMatterStatus(testMatterId, 'Closed');
        results.steps.push({
          step: '6. Matter Status Update',
          status: 'SUCCESS',
          live: true,
          details: { id: updatedMatter.id, status: updatedMatter.status }
        });
      } else {
        results.steps.push({
          step: '6. Matter Status Update (Mock)',
          status: 'SUCCESS',
          live: false,
          details: { id: testMatterId, status: 'Closed' }
        });
      }
    } catch (err: any) {
      results.steps.push({
        step: '6. Matter Status Update',
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }

    results.testSuite = 'ALL PASSED';
    return NextResponse.json(results);

  } catch (globalErr: any) {
    results.testSuite = 'FAILED';
    results.globalError = globalErr.message;
    return NextResponse.json(results, { status: 500 });
  }
}
