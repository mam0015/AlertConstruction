(function (global) {
  'use strict';

  const config = global.AC_PLATFORM_CONFIG || {};
  const apiBase = String(config.supabaseUrl || '').replace(/\/$/, '');
  const PREVIEW_KEY = 'ac_workflow_preview_v60';
  const query = new URLSearchParams(location.search);
  const preview = query.get('preview') === '1';
  const previewRole = String(query.get('role') || 'owner').toLowerCase();
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const iso = (offset = 0) => new Date(Date.now() + offset).toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const clone = value => JSON.parse(JSON.stringify(value));

  const ROLE_CAPABILITIES = {
    owner: ['dashboard', 'requests', 'projects', 'inspections', 'schedule', 'tasks', 'delays', 'messages', 'team', 'timesheets', 'finance', 'reports', 'tools', 'settings'],
    admin: ['dashboard', 'requests', 'projects', 'inspections', 'schedule', 'tasks', 'delays', 'messages', 'team', 'timesheets', 'finance', 'reports', 'tools'],
    manager: ['dashboard', 'requests', 'projects', 'inspections', 'schedule', 'tasks', 'delays', 'messages', 'team', 'timesheets', 'reports'],
    site_supervisor: ['dashboard', 'projects', 'inspections', 'schedule', 'tasks', 'delays', 'messages', 'timesheets', 'reports'],
    worker: ['dashboard', 'projects', 'schedule', 'tasks', 'messages', 'timesheets'],
    estimator: ['dashboard', 'projects', 'messages', 'reports']
  };

  function demoSeed() {
    const requestId = 'req_demo_1';
    const projectId = 'project_demo_1';
    return {
      version: 60,
      members: [
        { id: 'owner_demo', full_name: 'Ali Mobini', email: 'owner@alertconstruction.com.au', role: 'owner', active: true },
        { id: 'admin_demo', full_name: 'Sarah Chen', email: 'admin@alertconstruction.com.au', role: 'admin', active: true },
        { id: 'manager_demo', full_name: 'Daniel Brooks', email: 'manager@alertconstruction.com.au', role: 'manager', active: true },
        { id: 'supervisor_demo', full_name: 'Liam Walsh', email: 'liam@alertconstruction.com.au', role: 'site_supervisor', active: true },
        { id: 'worker_demo', full_name: 'Noah Wilson', email: 'noah@alertconstruction.com.au', role: 'worker', active: true }
      ],
      requests: [
        {
          id: requestId,
          request_number: 'ATP-2026-0041',
          customer_id: 'customer_demo',
          customer_name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '0412 555 019',
          preferred_contact: 'Phone',
          address: '18 Vista Court', suburb: 'Rowville', state: 'VIC', postcode: '3178', property_type: 'House',
          services: ['Bathroom', 'Plumbing', 'Electrical'],
          description: 'Full bathroom renovation including layout changes, waterproofing and new fixtures.',
          current_problem: 'Water damage near the shower and an outdated plumbing layout.',
          expected_result: 'A modern, low-maintenance bathroom with improved storage.',
          urgent: false, budget_range: '$30,000 – $50,000', preferred_start_date: '2026-08-24', completion_expectation: '6–8 weeks', date_flexibility: 'Flexible',
          status: 'admin_review', created_at: iso(-86400000), updated_at: iso(-3600000), assigned_admin_id: 'admin_demo'
        },
        {
          id: 'req_demo_2', request_number: 'ATP-2026-0040', customer_id: 'customer_demo_2', customer_name: 'Mia Taylor',
          email: 'mia@example.com', phone: '0431 222 450', preferred_contact: 'Email', address: '7 Crown Avenue', suburb: 'Glen Waverley', state: 'VIC', postcode: '3150', property_type: 'Townhouse',
          services: ['Kitchen', 'Engineering'], description: 'Kitchen wall removal and new open-plan kitchen.', current_problem: 'Existing wall separates the kitchen and living area.', expected_result: 'Open-plan layout with engineering confirmation.', urgent: false,
          budget_range: '$50,000 – $80,000', preferred_start_date: '2026-09-15', completion_expectation: '10 weeks', date_flexibility: 'Flexible', status: 'follow_up_required', created_at: iso(-172800000), updated_at: iso(-7200000), assigned_admin_id: 'admin_demo'
        }
      ],
      followups: [
        { id: 'follow_demo_1', request_id: requestId, outcome: 'Contacted', note: 'Customer confirmed access after 3:30 PM on weekdays.', next_action: 'Schedule site visit', due_at: iso(86400000), created_by: 'admin_demo', created_at: iso(-5400000) }
      ],
      projects: [
        {
          id: projectId, request_id: requestId, customer_id: 'customer_demo', project_number: 'ATP-P-2026-0018', name: 'John Smith – Bathroom Renovation – Rowville',
          customer_name: 'John Smith', customer_email: 'john.smith@example.com', customer_phone: '0412 555 019', address: '18 Vista Court, Rowville VIC 3178', services: ['Bathroom', 'Plumbing', 'Electrical'],
          status: 'in_progress', customer_status: 'Work in Progress', progress: 42, assigned_admin_id: 'admin_demo', assigned_supervisor_id: 'supervisor_demo',
          admin_brief: 'Check waterproofing condition, plumbing layout, wall damage, ventilation and access restrictions. Do not discuss internal pricing.',
          site_visit_at: iso(86400000 * 2), created_at: iso(-1209600000), updated_at: iso(-1800000)
        }
      ],
      inspections: [
        { id: 'inspection_demo_1', project_id: projectId, status: 'submitted', visit_date: '2026-07-30', arrival_time: '15:35', departure_time: '16:45', customer_present: true, weather: 'Dry', site_access: 'Side gate available', parking_access: 'Driveway', safety_issues: 'Loose tiles near shower entry', work_required: 'Strip-out, repair substrate, relocate plumbing, waterproof, tile and refit.', materials_required: 'Villaboard, membrane, tiles, fixtures', trades_required: ['Plumber', 'Electrician', 'Waterproofer', 'Tiler'], risks: 'Possible framing damage behind wet wall', recommended_sequence: 'Demolition → assessment → rough-ins → waterproofing → tiling → fit-off', submitted_by: 'supervisor_demo', submitted_at: iso(-259200000) }
      ],
      areas: [
        { id: 'area_demo_1', inspection_id: 'inspection_demo_1', project_id: projectId, area_name: 'Bathroom', length: 3.1, width: 2.4, height: 2.55, floor_area: 7.44, wall_area: 28.05, existing_fixtures: 'Bath, vanity, shower, toilet', plumbing_condition: 'Relocation required', electrical_condition: 'Fan and GPO upgrade required', waterproofing_condition: 'Failed near shower', demolition_required: true, issues: 'Moisture damage', required_work: 'Full renovation', risks: 'Hidden substrate damage' }
      ],
      tasks: [
        { id: 'task_demo_1', project_id: projectId, title: 'Demolition', trade: 'Demolition Team', assigned_to: 'worker_demo', start_date: '2026-08-03', due_date: '2026-08-03', status: 'completed', order_index: 1 },
        { id: 'task_demo_2', project_id: projectId, title: 'Plumbing Rough-In', trade: 'Plumber', assigned_to: 'supervisor_demo', start_date: '2026-08-04', due_date: '2026-08-04', status: 'delayed', order_index: 2 },
        { id: 'task_demo_3', project_id: projectId, title: 'Electrical Rough-In', trade: 'Electrician', assigned_to: 'supervisor_demo', start_date: '2026-08-05', due_date: '2026-08-05', status: 'confirmed', order_index: 3 },
        { id: 'task_demo_4', project_id: projectId, title: 'Waterproofing', trade: 'Waterproofer', assigned_to: 'supervisor_demo', start_date: '2026-08-06', due_date: '2026-08-06', status: 'not_started', order_index: 4 }
      ],
      delays: [
        { id: 'delay_demo_1', project_id: projectId, task_id: 'task_demo_2', reason: 'Plumber unavailable due to an emergency.', person_contacted: 'Chris – plumber', contact_time: iso(-5400000), new_expected_date: '2026-08-05', impact: 'Waterproofing moved by one day.', internal_note: 'Admin notified. Confirm electrician sequencing.', customer_update: 'Plumbing work has been rescheduled. The project schedule is being updated.', reported_by: 'supervisor_demo', created_at: iso(-3600000) }
      ],
      notes: [
        { id: 'note_demo_1', project_id: projectId, visibility: 'private_management', body: 'Customer requested two fixture alternatives before quote approval.', created_by: 'admin_demo', created_at: iso(-7200000) },
        { id: 'note_demo_2', project_id: projectId, visibility: 'supervisor', body: 'Confirm wall framing condition immediately after strip-out.', created_by: 'admin_demo', created_at: iso(-5400000) },
        { id: 'note_demo_3', project_id: projectId, visibility: 'customer', body: 'The demolition stage is complete. Rough-in work is being coordinated.', created_by: 'admin_demo', created_at: iso(-1800000) }
      ],
      quotes: [
        { id: 'quote_demo_1', project_id: projectId, quote_number: 'QUO-2026-018', title: 'Bathroom Renovation', status: 'sent', subtotal: 38181.82, gst: 3818.18, total: 42000, valid_until: '2026-08-20', customer_visible: true, created_at: iso(-86400000) }
      ],
      appointments: [
        { id: 'appt_demo_1', project_id: projectId, customer_id: 'customer_demo', title: 'Site inspection follow-up', starts_at: iso(86400000), status: 'confirmed', customer_visible: true }
      ],
      messages: [
        { id: 'message_demo_1', project_id: projectId, sender_id: 'admin_demo', sender_scope: 'team', body: 'Hi John, the site inspection is complete. We have shared the renovation quote for your review.', customer_visible: true, created_at: iso(-90000000) },
        { id: 'message_demo_2', project_id: projectId, sender_id: 'customer_demo', sender_scope: 'customer', body: 'Thanks. I will review it tonight and let you know if I have any questions.', customer_visible: true, created_at: iso(-86400000) }
      ],
      documents: [
        { id: 'document_demo_1', project_id: projectId, file_name: 'Bathroom renovation scope.pdf', storage_path: 'demo/project/scope.pdf', category: 'Scope of works', mime_type: 'application/pdf', size_bytes: 284000, customer_visible: true, created_at: iso(-172800000) }
      ],
      time_entries: [],
      reports: [
        { id: 'report_demo_1', project_id: projectId, user_id: 'supervisor_demo', report_date: today(), completed: 'Checked demolition and measured exposed wet wall.', unfinished: 'Plumbing relocation.', tomorrow: 'Coordinate plumbing and electrical rough-ins.', delays: 'Plumber rescheduled.', customer_issues: '', materials_required: 'Additional noggins and wet-area board.', status: 'submitted', created_at: iso(-1800000) }
      ],
      activities: [
        { id: 'activity_1', project_id: projectId, actor_id: 'admin_demo', action: 'customer_update_published', description: 'Published a customer-safe project update', created_at: iso(-1800000) },
        { id: 'activity_2', project_id: projectId, actor_id: 'supervisor_demo', action: 'delay_recorded', description: 'Recorded delay for Plumbing Rough-In', created_at: iso(-3600000) },
        { id: 'activity_3', project_id: projectId, actor_id: 'supervisor_demo', action: 'inspection_submitted', description: 'Submitted site inspection to Admin', created_at: iso(-259200000) }
      ],
      notifications: [
        { id: 'notification_1', recipient_id: 'admin_demo', type: 'delay', title: 'Trade delay reported', body: 'Plumbing Rough-In was rescheduled to 5 Aug.', project_id: projectId, read_at: null, created_at: iso(-3600000) }
      ]
    };
  }

  function readPreview() {
    try {
      const value = JSON.parse(localStorage.getItem(PREVIEW_KEY) || 'null');
      if (value && value.version === 60) return value;
    } catch (_) {}
    const seeded = demoSeed();
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(seeded));
    return seeded;
  }
  function writePreview(state) {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent('ac-workflow-changed', { detail: clone(state) }));
    return clone(state);
  }
  function resetPreview() { localStorage.removeItem(PREVIEW_KEY); return readPreview(); }

  async function headers() {
    return { apikey: config.publishableKey || '', 'Content-Type': 'application/json', ...(await global.ACAuth.headers()) };
  }
  async function request(path, options = {}) {
    if (!apiBase) throw new Error('The secure workflow service is not configured.');
    const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...(await headers()), ...(options.headers || {}) } });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || data?.error || `Workflow request failed (${response.status}).`);
    return data;
  }
  function rpc(name, body = {}) { return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }); }
  function rows(table, params = '') { return request(`/rest/v1/${table}?${params}`); }
  function patchRow(table, id, body) { return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) }); }

  function role() { return preview ? previewRole : (global.ACAuth.role() || ''); }
  function capabilities(value = role()) { return ROLE_CAPABILITIES[value] || []; }
  function can(capability, value = role()) { return value === 'owner' || capabilities(value).includes(capability); }
  function isOffice(value = role()) { return ['owner', 'admin', 'manager'].includes(value); }
  function canUseOperations(value = role()) { return ['owner', 'admin'].includes(value); }

  async function submitRequest(payload, files = []) {
    if (preview) {
      const state = readPreview();
      const count = 42 + state.requests.length;
      const entry = {
        id: uid('req'), request_number: `ATP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`,
        customer_id: 'customer_demo', status: 'new', created_at: iso(), updated_at: iso(), ...clone(payload),
        file_names: files.map(file => file.name)
      };
      state.requests.unshift(entry);
      state.activities.unshift({ id: uid('activity'), project_id: null, actor_id: 'customer_demo', action: 'request_submitted', description: `${entry.request_number} submitted by ${entry.customer_name}`, created_at: iso() });
      writePreview(state);
      return entry;
    }
    const created = await rpc('submit_ac_customer_request_v60', { p_payload: payload });
    for (const file of files) await uploadRequestFile(created.id, file);
    return created;
  }

  async function uploadRequestFile(requestId, file) {
    if (!file || file.size > 25 * 1024 * 1024) throw new Error('Each request file must be 25 MB or smaller.');
    const user = global.ACAuth.user();
    const safeName = String(file.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${user.id}/${requestId}/${crypto.randomUUID()}-${safeName}`;
    const response = await fetch(`${apiBase}/storage/v1/object/customer-request-files/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { apikey: config.publishableKey || '', ...(await global.ACAuth.headers()), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'The request file could not be uploaded.');
    return rpc('register_ac_request_file_v60', { p_request_id: requestId, p_storage_path: path, p_file_name: file.name, p_mime_type: file.type || 'application/octet-stream', p_size_bytes: file.size || 1 });
  }

  async function customerSnapshot() {
    if (preview) {
      const state = readPreview();
      const customerId = 'customer_demo';
      return {
        requests: state.requests.filter(item => item.customer_id === customerId),
        projects: state.projects.filter(item => item.customer_id === customerId),
        notes: state.notes.filter(item => item.visibility === 'customer'),
        quotes: state.quotes.filter(item => state.projects.some(project => project.id === item.project_id && project.customer_id === customerId) && item.customer_visible),
        appointments: state.appointments.filter(item => item.customer_id === customerId && item.customer_visible),
        tasks: state.tasks.filter(item => state.projects.some(project => project.id === item.project_id && project.customer_id === customerId)),
        invoices: [],
        messages: state.messages.filter(item => state.projects.some(project => project.id === item.project_id && project.customer_id === customerId) && item.customer_visible),
        documents: state.documents.filter(item => state.projects.some(project => project.id === item.project_id && project.customer_id === customerId) && item.customer_visible)
      };
    }
    const [requests, projects, notes, quotes, appointments, tasks, invoices, messages, documents] = await Promise.all([
      rows('ac_customer_requests', 'select=*&order=created_at.desc'),
      rows('ac_workflow_projects', 'select=*&order=updated_at.desc'),
      rows('ac_project_notes', 'visibility=eq.customer&select=*&order=created_at.desc'),
      rows('ac_workflow_quotes', 'customer_visible=eq.true&select=*&order=created_at.desc'),
      rows('ac_customer_appointments', 'customer_visible=eq.true&select=*&order=starts_at.asc'),
      rows('ac_project_tasks', 'customer_visible=eq.true&select=*&order=order_index.asc'),
      rows('ac_invoices', 'select=id,invoice_number,project_id,status,total,balance_due,due_date,created_at&order=created_at.desc').catch(() => []),
      rows('ac_workflow_messages', 'customer_visible=eq.true&select=*&order=created_at.asc'),
      rows('ac_project_documents', 'customer_visible=eq.true&select=*&order=created_at.desc')
    ]);
    return { requests, projects, notes, quotes, appointments, tasks, invoices, messages, documents };
  }

  async function managementSnapshot() {
    if (preview) return readPreview();
    const [members, requests, followups, projects, inspections, areas, tasks, delays, notes, quotes, appointments, reports, activities, notifications, messages, documents, time_entries] = await Promise.all([
      rows('profiles', 'select=id,full_name,email,role,active&order=full_name'),
      rows('ac_customer_requests', 'select=*&order=updated_at.desc'),
      rows('ac_request_followups', 'select=*&order=created_at.desc'),
      rows('ac_workflow_projects', 'select=*&order=updated_at.desc'),
      rows('ac_site_inspections', 'select=*&order=created_at.desc'),
      rows('ac_inspection_areas', 'select=*&order=created_at.asc'),
      rows('ac_project_tasks', 'select=*&order=start_date.asc,order_index.asc'),
      rows('ac_project_delays', 'select=*&order=created_at.desc'),
      rows('ac_project_notes', 'select=*&order=created_at.desc'),
      rows('ac_workflow_quotes', 'select=*&order=created_at.desc'),
      rows('ac_customer_appointments', 'select=*&order=starts_at.asc'),
      rows('ac_daily_reports', 'select=*&order=report_date.desc'),
      rows('ac_audit_log', 'select=id,project_id,actor_id,action,module,details,created_at&order=created_at.desc&limit=300'),
      rows('ac_workflow_notifications', 'select=*&order=created_at.desc&limit=100'),
      rows('ac_workflow_messages', 'select=*&order=created_at.asc'),
      rows('ac_project_documents', 'select=*&order=created_at.desc'),
      rows('ac_time_entries', 'select=*&order=clocked_in_at.desc')
    ]);
    return { version: 60, members, requests, followups, projects, inspections, areas, tasks, delays, notes, quotes, appointments, reports, activities, notifications, messages, documents, time_entries };
  }

  async function recordFollowup(requestId, payload) {
    if (preview) {
      const state = readPreview();
      const entry = { id: uid('follow'), request_id: requestId, created_by: `${role()}_demo`, created_at: iso(), ...clone(payload) };
      state.followups.unshift(entry);
      const requestRow = state.requests.find(item => item.id === requestId);
      if (requestRow) { requestRow.status = String(payload.status || 'follow_up_required').toLowerCase().replace(/\s+/g, '_'); requestRow.updated_at = iso(); }
      writePreview(state); return entry;
    }
    return rpc('record_ac_request_followup_v60', { p_request_id: requestId, p_payload: payload });
  }

  async function approveRequest(requestId, payload) {
    if (preview) {
      const state = readPreview();
      const requestRow = state.requests.find(item => item.id === requestId);
      if (!requestRow) throw new Error('Request not found.');
      let project = state.projects.find(item => item.request_id === requestId);
      if (!project) {
        project = {
          id: uid('project'), request_id: requestId, customer_id: requestRow.customer_id,
          project_number: `ATP-P-${new Date().getFullYear()}-${String(state.projects.length + 19).padStart(4, '0')}`,
          name: `${requestRow.customer_name} – ${requestRow.services?.[0] || 'Project'} – ${requestRow.suburb}`,
          customer_name: requestRow.customer_name, customer_email: requestRow.email, customer_phone: requestRow.phone,
          address: `${requestRow.address}, ${requestRow.suburb} ${requestRow.state} ${requestRow.postcode}`,
          services: requestRow.services, status: 'site_inspection_assigned', customer_status: 'Site Visit Scheduled', progress: 12,
          assigned_admin_id: 'admin_demo', assigned_supervisor_id: payload.supervisor_id, admin_brief: payload.admin_brief,
          site_visit_at: payload.site_visit_at, created_at: iso(), updated_at: iso()
        };
        state.projects.unshift(project);
      }
      requestRow.status = 'approved_for_inspection'; requestRow.updated_at = iso();
      state.notifications.unshift({ id: uid('notification'), recipient_id: payload.supervisor_id, type: 'inspection_assigned', title: 'New site inspection', body: project.name, project_id: project.id, read_at: null, created_at: iso() });
      writePreview(state); return project;
    }
    return rpc('approve_ac_request_and_create_project_v60', { p_request_id: requestId, p_supervisor_id: payload.supervisor_id, p_admin_brief: payload.admin_brief, p_site_visit_at: payload.site_visit_at });
  }

  async function submitInspection(projectId, payload) {
    if (preview) {
      const state = readPreview();
      const entry = { id: uid('inspection'), project_id: projectId, status: 'submitted', submitted_by: 'supervisor_demo', submitted_at: iso(), created_at: iso(), ...clone(payload) };
      state.inspections.unshift(entry);
      (payload.areas || []).forEach(area => state.areas.push({ id: uid('area'), inspection_id: entry.id, project_id: projectId, ...area }));
      const project = state.projects.find(item => item.id === projectId); if (project) { project.status = 'inspection_completed'; project.customer_status = 'Site Inspection Completed'; project.progress = Math.max(project.progress || 0, 24); project.updated_at = iso(); }
      state.notifications.unshift({ id: uid('notification'), recipient_id: 'admin_demo', type: 'inspection_submitted', title: 'Site inspection completed', body: project?.name || 'Project', project_id: projectId, read_at: null, created_at: iso() });
      writePreview(state); return entry;
    }
    return rpc('submit_ac_site_inspection_v60', { p_project_id: projectId, p_payload: payload });
  }

  async function updateTask(taskId, status, details = {}) {
    if (preview) {
      const state = readPreview(); const task = state.tasks.find(item => item.id === taskId); if (!task) throw new Error('Task not found.');
      task.status = status; task.updated_at = iso(); Object.assign(task, details); writePreview(state); return task;
    }
    return rpc('update_ac_project_task_v60', { p_task_id: taskId, p_status: status, p_details: details });
  }

  async function createTask(projectId, payload) {
    if (preview) {
      const state = readPreview();
      const entry = { id: uid('task'), project_id: projectId, status: 'not_started', customer_visible: true, order_index: state.tasks.filter(item => item.project_id === projectId).length + 1, created_at: iso(), ...clone(payload) };
      state.tasks.push(entry); writePreview(state); return entry;
    }
    return rpc('create_ac_project_task_v60', { p_project_id: projectId, p_payload: payload });
  }

  async function recordDelay(projectId, taskId, payload) {
    if (preview) {
      const state = readPreview(); const entry = { id: uid('delay'), project_id: projectId, task_id: taskId, reported_by: `${role()}_demo`, created_at: iso(), ...clone(payload) };
      state.delays.unshift(entry); const task = state.tasks.find(item => item.id === taskId); if (task) task.status = 'delayed';
      state.notifications.unshift({ id: uid('notification'), recipient_id: 'admin_demo', type: 'delay', title: 'Trade delay reported', body: payload.reason, project_id: projectId, read_at: null, created_at: iso() });
      writePreview(state); return entry;
    }
    return rpc('record_ac_project_delay_v60', { p_project_id: projectId, p_task_id: taskId, p_payload: payload });
  }

  async function addNote(projectId, visibility, body) {
    if (preview) {
      const state = readPreview(); const entry = { id: uid('note'), project_id: projectId, visibility, body, created_by: `${role()}_demo`, created_at: iso() };
      state.notes.unshift(entry); writePreview(state); return entry;
    }
    return rpc('add_ac_project_note_v60', { p_project_id: projectId, p_visibility: visibility, p_body: body });
  }

  async function saveQuote(projectId, payload) {
    if (preview) {
      const state = readPreview(); let entry = payload.id ? state.quotes.find(item => item.id === payload.id) : null;
      const project = state.projects.find(item => item.id === projectId); if (!project) throw new Error('Project not found.');
      if (!entry) { entry = { id: uid('quote'), project_id: projectId, quote_number: payload.quote_number || `QUO-${project.project_number.replace('ATP-P-', '')}`, created_at: iso() }; state.quotes.unshift(entry); }
      Object.assign(entry, clone(payload), { status: payload.share_with_customer ? 'sent' : (entry.status || 'draft'), customer_visible: Boolean(payload.share_with_customer), updated_at: iso() });
      project.status = payload.share_with_customer ? 'quote_sent' : 'estimate_preparation'; project.customer_status = payload.share_with_customer ? 'Quote Sent' : 'Estimate in Preparation'; project.progress = Math.max(project.progress || 0, payload.share_with_customer ? 45 : 35); project.updated_at = iso();
      writePreview(state); return entry;
    }
    return rpc('save_ac_workflow_quote_v60', { p_project_id: projectId, p_payload: payload });
  }

  async function decideQuote(quoteId, decision) {
    if (preview) {
      const state = readPreview(), quote = state.quotes.find(item => item.id === quoteId); if (!quote || !quote.customer_visible) throw new Error('Quote is not available.');
      quote.status = decision; quote.updated_at = iso(); const project = state.projects.find(item => item.id === quote.project_id);
      if (project) { project.status = decision === 'accepted' ? 'quote_accepted' : 'estimate_preparation'; project.customer_status = decision === 'accepted' ? 'Quote Accepted' : 'Quote Review Required'; project.progress = decision === 'accepted' ? Math.max(project.progress || 0, 55) : Math.min(project.progress || 45, 45); project.updated_at = iso(); }
      writePreview(state); return quote;
    }
    return rpc('decide_ac_workflow_quote_v60', { p_quote_id: quoteId, p_decision: decision });
  }

  async function sendMessage(projectId, body) {
    if (preview) {
      const state = readPreview(), customerMode = location.pathname.includes('/customer-portal/'); const entry = { id: uid('message'), project_id: projectId, sender_id: customerMode ? 'customer_demo' : `${role()}_demo`, sender_scope: customerMode ? 'customer' : 'team', body, customer_visible: true, created_at: iso() };
      state.messages.push(entry); writePreview(state); return entry;
    }
    return rpc('send_ac_workflow_message_v60', { p_project_id: projectId, p_body: body });
  }

  async function clockIn(projectId) {
    if (preview) {
      const state = readPreview(); if (state.time_entries.some(item => item.user_id === `${role()}_demo` && !item.clocked_out_at)) throw new Error('Clock out of the current project before starting another.');
      const entry = { id: uid('time'), project_id: projectId, user_id: `${role()}_demo`, clocked_in_at: iso(), clocked_out_at: null, created_at: iso() }; state.time_entries.unshift(entry); writePreview(state); return entry;
    }
    return rpc('clock_in_ac_project_v60', { p_project_id: projectId });
  }

  async function uploadProjectDocument(projectId, file, category = 'Project document', customerVisible = false) {
    if (!file || file.size > 25 * 1024 * 1024) throw new Error('Each project file must be 25 MB or smaller.');
    if (preview) {
      const state = readPreview(), entry = { id: uid('document'), project_id: projectId, file_name: file.name, storage_path: `preview/${projectId}/${file.name}`, category, mime_type: file.type || 'application/octet-stream', size_bytes: file.size || 1, customer_visible: Boolean(customerVisible), uploaded_by: `${role()}_demo`, created_at: iso() };
      state.documents.unshift(entry); writePreview(state); return entry;
    }
    const profile = global.ACAuth.profile(), safeName = String(file.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    if (!profile?.organisation_id) throw new Error('The Team workspace could not be identified.');
    const path = `${profile.organisation_id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
    const response = await fetch(`${apiBase}/storage/v1/object/workflow-project-files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { apikey: config.publishableKey || '', ...(await global.ACAuth.headers()), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'The project file could not be uploaded.');
    return rpc('register_ac_project_document_v60', { p_project_id: projectId, p_storage_path: path, p_file_name: file.name, p_category: category, p_mime_type: file.type || 'application/octet-stream', p_size_bytes: file.size || 1, p_customer_visible: Boolean(customerVisible) });
  }

  async function downloadProjectDocument(fileRecord) {
    if (preview) return { preview: true, name: fileRecord.file_name };
    const path = String(fileRecord.storage_path || '').split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${apiBase}/storage/v1/object/authenticated/workflow-project-files/${path}`, { headers: { apikey: config.publishableKey || '', ...(await global.ACAuth.headers()) } });
    if (!response.ok) throw new Error('The shared document could not be downloaded.');
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = fileRecord.file_name || 'project-document'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { downloaded: true };
  }

  async function submitDailyReport(projectId, payload) {
    if (preview) {
      const state = readPreview(); const entry = { id: uid('report'), project_id: projectId, user_id: `${role()}_demo`, report_date: today(), status: 'submitted', created_at: iso(), ...clone(payload) };
      state.reports.unshift(entry); const timeEntry = state.time_entries.find(item => item.user_id === `${role()}_demo` && item.project_id === projectId && !item.clocked_out_at); if (timeEntry) { timeEntry.clocked_out_at = iso(); timeEntry.report_id = entry.id; } writePreview(state); return entry;
    }
    return rpc('submit_ac_daily_report_v60', { p_project_id: projectId, p_payload: payload });
  }

  async function reviewDailyReport(reportId, action, note = '') {
    if (preview) {
      const state = readPreview(), report = state.reports.find(item => item.id === reportId); if (!report) throw new Error('Daily report not found.');
      report.status = action; report.owner_note = note; report.reviewed_at = iso(); report.reviewed_by = `${role()}_demo`; writePreview(state); return report;
    }
    return rpc('review_ac_daily_report_v60', { p_report_id: reportId, p_action: action, p_note: note });
  }

  global.ACWorkflow = {
    preview, previewRole, role, capabilities, can, isOffice, canUseOperations, resetPreview,
    submitRequest, customerSnapshot, managementSnapshot, recordFollowup, approveRequest,
    submitInspection, createTask, updateTask, recordDelay, addNote, saveQuote, decideQuote, sendMessage, clockIn, uploadProjectDocument, downloadProjectDocument, submitDailyReport, reviewDailyReport, patchRow
  };
})(window);
