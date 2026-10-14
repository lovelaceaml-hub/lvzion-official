// Hosted Auth uses the *_content property; the template URL property is not accepted
// by the management API. Always read back the content after configuration.
export const signupEmailTemplate='<h2>Confirm your LV Zion account</h2><p>Continue only if you created this account.</p><p><a href="{{ .SiteURL }}/auth/continue#token_hash={{ .TokenHash }}&amp;type=signup">Confirm my account</a></p><p>Your age category, group and unit will stay Unassigned until an authorized leader verifies your placement. Ignore this email if you did not request an account.</p>';
export function signupEmailSettings(){return {mailer_subjects_confirmation:'Confirm your LV Zion account',mailer_templates_confirmation_content:signupEmailTemplate};}
export function verifySignupEmailSettings(config:Record<string,unknown>){
 if(config.mailer_templates_confirmation_content!==signupEmailTemplate||config.mailer_subjects_confirmation!=='Confirm your LV Zion account'||config.mailer_autoconfirm!==false)throw new Error('Signup email settings were not applied as requested.');
}
