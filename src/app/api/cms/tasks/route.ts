import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { createClioTask, completeClioTask } from '@/lib/clioPush';


import { prisma } from '@/lib/prisma';


export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { matterId, name, dueAt } = body;

    if (!matterId || !name) {
      return NextResponse.json({ error: 'Matter ID and Task Name are required.' }, { status: 400 });
    }

    const matter = await prisma.matter.findUnique({ where: { id: matterId } });
    if (!matter || matter.userId !== userId) {
      return NextResponse.json({ error: 'Matter not found.' }, { status: 404 });
    }

    const token = getToken(userId, 'clio');
    let sourceId = '';

    // Push to Clio API if live token present
    if (token?.access_token && matter.sourceId) {
      try {
        const clioTask = await createClioTask(matter.sourceId, name, dueAt);
        sourceId = String(clioTask.id);
      } catch (err: any) {
        console.error('[Clio Live Create Task Error]', err);
      }
    }

    // Write to Postgres
    const newTask = await prisma.task.create({
      data: {
        userId,
        matterId,
        name,
        dueAt: dueAt ? new Date(dueAt) : null,
        status: 'Pending',
        source: 'clio',
        sourceId: sourceId || null,
        user: { connect: { id: userId } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      task: {
        id: newTask.id,
        name: newTask.name,
        due_at: newTask.dueAt,
        complete: false
      }
    });
  } catch (err: any) {
    console.error('[Tasks POST Error]', err);
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { matterId, taskId, complete } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Task not found in vault.' }, { status: 404 });
    }

    const token = getToken(userId, 'clio');

    // Update Clio API if live token present
    if (token?.access_token && task.sourceId) {
      try {
        await completeClioTask(task.sourceId, complete);
      } catch (err: any) {
        console.error('[Clio Live Complete Task Error]', err);
      }
    }

    // Update Postgres
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: complete ? 'Completed' : 'Pending' }
    });

    return NextResponse.json({ 
      success: true, 
      task: {
        id: updatedTask.id,
        name: updatedTask.name,
        due_at: updatedTask.dueAt,
        complete: updatedTask.status === 'Completed'
      }
    });
  } catch (err: any) {
    console.error('[Tasks PATCH Error]', err);
    return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
  }
}

