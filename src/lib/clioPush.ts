import { getToken } from './tokenStore';

function getHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Pushes a new Note directly into a Clio Matter.
 */
export async function createMatterNote(matterId: string | number, text: string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot push to Clio: No active connection found.");
  }

  const clioNotesUrl = 'https://app.clio.com/api/v4/notes.json';
  const notePayload = {
    data: {
      subject: {
        id: parseInt(matterId as string, 10),
        type: "Matter"
      },
      detail: text
    }
  };

  const response = await fetch(clioNotesUrl, {
    method: 'POST',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(notePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Matter Note: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Creates a new Contact in Clio Manage.
 */
export async function createClioContact(name: string, email?: string, phone?: string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  const clioContactsUrl = 'https://app.clio.com/api/v4/contacts.json';
  const payload: any = {
    data: {
      name,
      type: 'Person'
    }
  };

  if (email) {
    payload.data.email_addresses = [{ address: email, name: 'Work' }];
  }
  if (phone) {
    payload.data.phone_numbers = [{ number: phone, name: 'Work' }];
  }

  const response = await fetch(clioContactsUrl, {
    method: 'POST',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Clio Contact: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Creates a new Matter in Clio Manage.
 */
export async function createClioMatter(description: string, clientId: number | string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  const clioMattersUrl = 'https://app.clio.com/api/v4/matters.json';
  const payload = {
    data: {
      description,
      client: {
        id: parseInt(clientId as string, 10)
      },
      status: 'Open'
    }
  };

  const response = await fetch(clioMattersUrl, {
    method: 'POST',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Clio Matter: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

async function getClioCurrentUserId(accessToken: string): Promise<number> {
  const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json?fields=id', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch current user profile from Clio: ${response.status}`);
  }
  const result = await response.json();
  return result.data.id;
}

/**
 * Creates a new Task in Clio Manage.
 */
export async function createClioTask(matterId: number | string, name: string, dueAt?: string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  // Fetch active user ID to assign the task
  const userId = await getClioCurrentUserId(token.access_token);

  const clioTasksUrl = 'https://app.clio.com/api/v4/tasks.json';
  const payload: any = {
    data: {
      name,
      assignee: {
        id: userId,
        type: 'User'
      },
      matter: {
        id: parseInt(matterId as string, 10)
      }
    }
  };

  if (dueAt) {
    payload.data.due_at = dueAt;
  }

  const response = await fetch(clioTasksUrl, {
    method: 'POST',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Clio Task: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Toggles status of a Task in Clio Manage.
 */
export async function completeClioTask(taskId: number | string, completed: boolean): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  const clioTaskUrl = `https://app.clio.com/api/v4/tasks/${taskId}.json`;
  const payload = {
    data: {
      complete: completed
    }
  };

  const response = await fetch(clioTaskUrl, {
    method: 'PATCH',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Clio Task status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

async function getClioDefaultCalendarId(accessToken: string): Promise<number> {
  const response = await fetch('https://app.clio.com/api/v4/calendars.json?limit=1', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch calendars from Clio: ${response.status}`);
  }
  const result = await response.json();
  if (result.data && result.data.length > 0) {
    return result.data[0].id;
  }
  throw new Error('No calendars found in this Clio account');
}

export async function createClioCalendarEvent(matterId: number | string, summary: string, startAt: string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  // Fetch primary calendar ID
  const calendarId = await getClioDefaultCalendarId(token.access_token);

  const clioCalendarUrl = 'https://app.clio.com/api/v4/calendar_entries.json';
  
  // Calculate end_at as 1 hour after start_at by default
  const startDate = new Date(startAt);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const payload = {
    data: {
      summary,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      calendar_owner: {
        id: calendarId,
        type: 'Calendar'
      },
      matter: {
        id: parseInt(matterId as string, 10)
      }
    }
  };

  const response = await fetch(clioCalendarUrl, {
    method: 'POST',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Clio Calendar Event: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updateClioMatterStatus(matterId: number | string, status: string): Promise<any> {
  const token = getToken('clio');
  if (!token?.access_token) {
    throw new Error("Cannot connect to Clio: No active connection found.");
  }

  const lowercaseStatus = status.toLowerCase();
  const clioMatterUrl = `https://app.clio.com/api/v4/matters/${matterId}.json`;
  const payload = {
    data: {
      status: lowercaseStatus
    }
  };

  const response = await fetch(clioMatterUrl, {
    method: 'PATCH',
    headers: getHeaders(token.access_token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Clio Matter Status: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.data;
}
