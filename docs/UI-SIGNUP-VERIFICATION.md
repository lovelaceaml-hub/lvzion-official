# Signup UI verification

> Historical milestone record. Test counts, preview links and pending gates below describe that milestone. For the actual app and current release boundaries, read the [handoff](HANDOFF.md) and [documentation index](README.md). This record does not authorize a new preview.

The new screens reuse the existing member typography, colors, rounded forms and native controls. This increment does not redesign the application. `/sign-up` displays the disabled activation boundary; `/enrollment-preview` provides a fictional Unassigned profile and leader assignment/decline journey. The leader must choose category, group and unit, independently verify membership, and explain the decision.

Browser checks cover 320px layout, own-record member routes, hidden group/Manage navigation, assignment verification failure/success, decline history, semantic labels, password-manager autocomplete and deliberate confirmation-button keyboard focus. Confirmation GET requests do not exchange a code or create a member. Real local Auth integration independently verifies email confirmation, later sign-in, permission transitions and concurrent assignment. Hosted Auth, physical Safari/Android and human usability studies remain launch gates.

The rendered 390px phone and 1280px desktop signup screens were inspected. The phone clearly presents the Unassigned lifecycle and disabled signup state, without overflow. Fictional visual evidence is saved in [signup phone](design/signup/signup-phone.png), [Unassigned phone](design/signup/unassigned-phone.png) and [signup desktop](design/signup/signup-desktop.png). All 31 automated phone-browser checks passed.

The published Vercel preview passed 14 additional browser/API assertions: disabled signup and no-store responses, anonymous denial, narrow Unassigned layout, explicit leader verification, fictional assignment/decline history and confirmation GET behavior. Preview routes remain fictional.
