import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';
import { createClioTask, completeClioTask } from '@/lib/clioPush';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');

function getMatterDir(matterId: string | number): string {
  return path.join(CLIO_VAULT, String(matterId));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matterId, name, dueAt } = body;

    if (!matterId || !name) {
      return NextResponse.json({ error: 'Matter ID and Task Name are required.' }, { status: 400 });
    }

    const matterDir = getMatterDir(matterId);
    const token = getToken('clio');
    let finalTaskId = String(Date.now());

    // Push to Clio API if live token present
    if (token?.access_token) {
      try {
        const clioTask = await createClioTask(matterId, name, dueAt);
        finalTaskId = String(clioTask.id);
      } catch (err: any) {
        console.error('[Clio Live Create Task Error]', err);
      }
    }

    // Append task locally
    const tasksFile = path.join(matterDir, 'tasks.json');
    let tasks = [];

    if (fs.existsSync(tasksFile)) {
      tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
    }

    const newTask = {
      id: finalTaskId,
      name,
      due_at: dueAt || null,
      complete: false
    };

    tasks.push(newTask);
    if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    console.error('[Tasks POST Error]', err);
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { matterId, taskId, complete } = body;

    if (!matterId || !taskId) {
      return NextResponse.json({ error: 'Matter ID and Task ID are required.' }, { status: 400 });
    }

    const matterDir = getMatterDir(matterId);
    const token = getToken('clio');

    // Update Clio API if live token present
    if (token?.access_token) {
      try {
        await completeClioTask(taskId, complete);
      } catch (err: any) {
        console.error('[Clio Live Complete Task Error]', err);
      }
    }

    // Update task locally
    const tasksFile = path.join(matterDir, 'tasks.json');

    if (fs.existsSync(tasksFile)) {
      const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
      const idx = tasks.findIndex((t: any) => String(t.id) === String(taskId));
      if (idx >= 0) {
        tasks[idx].complete = complete;
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
        return NextResponse.json({ success: true, task: tasks[idx] });
      }
    }

    return NextResponse.json({ error: 'Task not found in vault.' }, { status: 404 });
  } catch (err: any) {
    console.error('[Tasks PATCH Error]', err);
    return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
  }
}
