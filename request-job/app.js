(function () {
  'use strict';
  const form = document.getElementById('requestForm');
  const steps = [...document.querySelectorAll('.rq-step')];
  const stepItems = [...document.querySelectorAll('#stepList li')];
  const titles = ['How can we contact you?', 'Where is the project?', 'What work is required?', 'Tell us about the project.', 'Timing, budget and files.', 'Review your request.'];
  let current = 0;
  const files = document.getElementById('requestFiles');
  const $ = id => document.getElementById(id);

  function showAlert(message) { $('formAlert').textContent = message; $('formAlert').hidden = false; }
  function clearAlert() { $('formAlert').hidden = true; }
  function checked(name) { return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(input => input.value); }
  function value(name) { const input = form.elements[name]; return input?.type === 'checkbox' ? input.checked : String(input?.value || '').trim(); }
  function payload() {
    return {
      customer_name: value('customer_name'), phone: value('phone'), email: value('email'), preferred_contact: value('preferred_contact'),
      address: value('address'), suburb: value('suburb'), state: value('state'), postcode: value('postcode'), property_type: value('property_type'),
      services: checked('services'), engineering_services: checked('engineering_services'), description: value('description'), current_problem: value('current_problem'), expected_result: value('expected_result'), urgent: !!form.elements.urgent.checked,
      budget_range: value('budget_range'), preferred_start_date: value('preferred_start_date') || null, completion_expectation: value('completion_expectation'), date_flexibility: value('date_flexibility')
    };
  }
  function validateStep(index) {
    clearAlert(); let valid = true;
    steps[index].querySelectorAll('[required]').forEach(input => { const okay = input.type === 'checkbox' ? input.checked : input.checkValidity(); input.classList.toggle('invalid', !okay); if (!okay) valid = false; });
    if (index === 2 && !checked('services').length) { valid = false; showAlert('Choose at least one service so our team can route your request correctly.'); }
    if (!valid && $('formAlert').hidden) showAlert('Please complete the required fields before continuing.');
    return valid;
  }
  function renderReview() {
    const data = payload();
    const rows = [
      ['Customer', `${data.customer_name} · ${data.phone} · ${data.email}`], ['Location', `${data.address}, ${data.suburb} ${data.state} ${data.postcode}`],
      ['Property', data.property_type], ['Services', [...data.services, ...data.engineering_services].join(', ') || '—'], ['Project', data.description],
      ['Current issue', data.current_problem || 'Not provided'], ['Expected result', data.expected_result || 'Not provided'], ['Budget', data.budget_range || 'Not provided'],
      ['Preferred start', data.preferred_start_date || 'Flexible / not provided'], ['Files', [...files.files].map(file => file.name).join(', ') || 'No files attached']
    ];
    $('review').innerHTML = rows.map(([label, text]) => `<article><small>${label}</small><strong>${escapeHtml(text)}</strong></article>`).join('');
  }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function render() {
    steps.forEach((step, index) => step.classList.toggle('active', index === current));
    stepItems.forEach((item, index) => { item.classList.toggle('active', index === current); item.classList.toggle('done', index < current); });
    $('stepKicker').textContent = `Step ${current + 1} of ${steps.length}`; $('stepTitle').textContent = titles[current];
    const percent = Math.round(((current + 1) / steps.length) * 100); $('progressText').textContent = `${percent}%`; $('progressBar').style.width = `${percent}%`;
    $('backButton').hidden = current === 0; $('nextButton').hidden = current === steps.length - 1; $('submitButton').hidden = current !== steps.length - 1;
    if (current === steps.length - 1) renderReview(); clearAlert(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('nextButton').addEventListener('click', () => { if (!validateStep(current)) return; current = Math.min(steps.length - 1, current + 1); render(); });
  $('backButton').addEventListener('click', () => { current = Math.max(0, current - 1); render(); });
  document.querySelectorAll('[name="services"]').forEach(input => input.addEventListener('change', () => { $('engineeringOptions').hidden = !checked('services').includes('Engineering'); }));
  files.addEventListener('change', () => { const invalid = [...files.files].find(file => file.size > 25 * 1024 * 1024); if (invalid) { files.value = ''; showAlert(`${invalid.name} is larger than 25 MB.`); } $('fileList').innerHTML = [...files.files].map(file => `<span>• ${escapeHtml(file.name)} · ${(file.size / 1048576).toFixed(1)} MB</span>`).join(''); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!validateStep(current)) return;
    const button = $('submitButton'), original = button.textContent; button.disabled = true; button.textContent = 'Submitting securely…';
    try { const result = await ACWorkflow.submitRequest(payload(), [...files.files]); form.hidden = true; $('success').hidden = false; $('requestNumber').textContent = result.request_number; }
    catch (error) { showAlert(error.message); button.disabled = false; button.textContent = original; }
  });
  async function start() {
    if (!ACWorkflow.preview) {
      await ACAuth.ready;
      if (!ACAuth.isCustomer()) { form.hidden = true; $('accountGate').hidden = false; return; }
      const customer = ACAuth.customerProfile() || {}, user = ACAuth.user() || {};
      $('customerName').value = customer.full_name || ''; $('customerEmail').value = user.email || customer.email || '';
    }
    render();
  }
  start();
})();
