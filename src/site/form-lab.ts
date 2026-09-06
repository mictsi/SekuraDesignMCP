import { Page } from './shell.js';

export function formLabPage(): Page {
  const p = new Page({ file: 'form-lab.html', title: 'Forms under real conditions', eyebrow: 'Examples', lead: 'Try long labels, mixed hints, dependent choices, delayed validation and permissions changing while you edit.' });
  p.section('Scenario controls', `<div class="sk-stack sk-stack--gap-16" data-form-scenarios>
    <div class="sk-field"><label class="sk-field__label" for="lab-language">Project label language</label><select class="sk-select" id="lab-language"><option value="en">English</option><option value="de">German (long label)</option></select></div>
    <div class="sk-field"><label class="sk-field__label" for="lab-outcome">Next save outcome</label><select class="sk-select" id="lab-outcome"><option value="success">Success</option><option value="failure">Service unavailable</option><option value="conflict">Version conflict</option></select></div>
    <label class="sk-checkbox"><input type="checkbox" class="sk-checkbox__input" id="lab-permission" checked><span class="sk-checkbox__box" aria-hidden="true"></span><span>Allow editing</span></label>
    <div class="sk-field"><label class="sk-field__label" for="lab-transport">Example transport</label><select class="sk-select" id="lab-transport"><option value="local">Local simulator</option><option value="http">HTTP demo server</option></select><p class="sk-field__hint">The simulator resets on reload. For real fetch requests, run <code>npm run demo:server</code> and open its local URL. The HTTP server stores demonstration data in memory.</p></div>
  </div>`);
  p.section('Project settings', `<form id="form-lab" class="sk-stack sk-stack--gap-24" novalidate>
    <div id="lab-summary" class="sk-alert sk-alert--danger" tabindex="-1" hidden><h3>Project could not be saved</h3><ul id="lab-errors"></ul></div>
    <p id="lab-permission-status" role="status"></p>
    <fieldset id="lab-fields" class="sk-fieldset sk-stack sk-stack--gap-16"><legend class="sk-fieldset__legend">Project details</legend>
      <div class="sk-field"><label class="sk-field__label" id="lab-name-label" for="lab-name">Project name (required)</label><input class="sk-input" id="lab-name" name="name" required maxlength="80" aria-describedby="lab-name-hint lab-name-status"><p class="sk-field__hint" id="lab-name-hint">Use a name your team can recognize. “Taken” demonstrates an unavailable name.</p><p id="lab-name-status" class="sk-field__hint" role="status"></p></div>
      <div class="sk-field"><label class="sk-field__label" for="lab-team">Team</label><select class="sk-select" id="lab-team" name="team"><option value="design">Design</option><option value="engineering">Engineering</option></select></div>
      <div class="sk-field"><label class="sk-field__label" for="lab-owner">Project owner</label><select class="sk-select" id="lab-owner" name="owner" aria-describedby="lab-owner-hint"><option value="Alex">Alex</option><option value="Sam">Sam</option></select><p class="sk-field__hint" id="lab-owner-hint">Choose someone from the selected team.</p></div>
      <div class="sk-field"><label class="sk-field__label" for="lab-notes">Notes (optional)</label><textarea class="sk-textarea" id="lab-notes" name="notes" rows="3"></textarea></div>
    </fieldset>
    <div class="sk-cluster sk-cluster--gap-8"><button class="sk-button sk-button--primary" type="submit" id="lab-save">Save project</button><button class="sk-button sk-button--secondary" type="button" id="lab-cancel" hidden>Cancel request</button><button class="sk-button sk-button--secondary" type="button" id="lab-reload" hidden>Load latest version, keep my edits</button></div>
    <p id="lab-result" role="status" aria-atomic="true">Unsaved project.</p>
  </form>`);
  p.section('Integration contract', `<div class="sk-prose"><p>Validation cancels stale requests. Team changes replace dependent choices and announce the new selection. Saving disables the fields; permission changes cancel pending work and retain the draft. Failures focus the error summary. Version conflicts require loading the latest version before an explicit retry.</p><p>The reusable <a href="assets/request.js">request adapter</a> accepts an AbortSignal, checks HTTP status and JSON, and times out. It never automatically retries writes. Cancellation stops waiting; it cannot guarantee a server has rolled back an accepted write. Production APIs need authentication, authorization, durable storage and application-specific conflict handling.</p></div>`);
  return p;
}
