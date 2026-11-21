import {expect, test, type Locator, type Page} from '@playwright/test';
import type {FestivalSweep} from '../../components/concert/festival-paths';
import type {InviteDraft} from '../../lib/concert/registration';
import {readFile} from 'node:fs/promises';
import type {Workspace} from '../../lib/concert/domain';
import {mockLocalBotChallenge} from './local-bot-challenge';

const workspace: Workspace = {
  viewerId:'10000000-0000-4000-8000-000000000001', name:'Fictional Member',
  canManage:false, myTicket:null, invitedCount:0, inviteUrl:'/concert/rsvp',
  event:{
    id:'10000000-0000-4000-8000-000000000002', title:'The Words of Mother’s Love Healing Concert',
    date:'2026-12-06', startTime:'16:30', doorsTime:null, venue:'Fictional Hall',
    details:'', capacity:null, seatsTaken:0, publicRsvp:true, rsvpOpen:true, version:1, program:[],
  },
};

async function mockConcert(page: Page, event = workspace.event) {
  await page.route('**/api/concert', route => route.fulfill({json:{...workspace,event,email:'member@example.invalid'}}));
  await page.route('**/api/concert/placement', route => route.fulfill({status:403,json:{}}));
  await page.route('**/api/concert/promo/*', route => route.fulfill({status:503,body:''}));
}

async function openRegistration(page: Page) {
  await mockConcert(page);
  await page.goto('/modules/concert');
  await page.getByRole('button', {name:'Tap here to register', exact:true}).click();
  return page.getByRole('dialog');
}

test.beforeEach(async ({page, baseURL}) => {
  await mockLocalBotChallenge(page, baseURL);
});

test('guest can retry an empty ticket lookup and return to the unfinished registration', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const emails: string[] = [];
  await page.route('**/api/concert/registration', route => {
    const input = route.request().postDataJSON();
    if (input.op === 'requestCode') {
      emails.push(input.email);
      return route.fulfill({json:{challenge:'fictional-lookup-' + emails.length}});
    }
    if (input.op === 'verifyCode' && input.purpose === 'recovery') {
      const tickets = input.email === 'attendee@example.invalid' && input.challenge === 'fictional-lookup-2'
        ? [{id:'ticket',name:'Fictional Attendee',partySize:1,url:'/concert/ticket/example'}] : [];
      return route.fulfill({json:{tickets}});
    }
    return route.fulfill({status:400,json:{error:'Unexpected operation'}});
  });
  const dialog = await openRegistration(page);
  await dialog.getByRole('button', {name:'I am a guest.'}).click();
  await dialog.getByLabel('Full Name', {exact:true}).fill('Fictional Visitor');
  await dialog.getByRole('button', {name:'Tickets & help'}).click();
  const email = dialog.getByLabel('Registration email');
  const code = dialog.getByLabel('Eight-digit email code');
  await email.fill('missing@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await code.fill('12345678');
  await dialog.getByRole('button', {name:'Verify email'}).click();
  await expect(dialog.getByRole('heading', {name:'No tickets found'})).toBeFocused();
  await dialog.getByRole('button', {name:'Try another email'}).click();
  await expect(email).toHaveValue('');
  await email.fill('attendee@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await expect(code).toHaveValue('');
  await code.fill('87654321');
  await dialog.getByRole('button', {name:'Verify email'}).click();
  await expect(dialog.getByText('Fictional Attendee', {exact:true})).toBeVisible();
  expect(emails).toEqual(['missing@example.invalid','attendee@example.invalid']);
  await dialog.getByRole('button', {name:'Back to registration'}).click();
  await expect(dialog.getByLabel('Full Name', {exact:true})).toHaveValue('Fictional Visitor');
});

test('corner help opens from the invitation, stays outside the card and returns to the registration', async ({page}) => {
  await mockConcert(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/modules/concert');
  const landingHelp = page.getByRole('button', {name:'Tickets & help', exact:true});
  expect(await landingHelp.evaluate(button => {
    const target = button.getBoundingClientRect(), badge = button.querySelector('.cc-help-badge')!.getBoundingClientRect();
    return {target:[target.width,target.height],badge:[badge.width,badge.height]};
  })).toEqual({target:[44,44],badge:[28,28]});
  await landingHelp.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Registration email')).toBeVisible();
  await dialog.getByRole('button', {name:'Back to registration'}).click();
  await expect(dialog.getByRole('button', {name:'I am a guest.'})).toBeVisible();
  for (const viewport of [{width:390,height:844},{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    const help = dialog.getByRole('button', {name:'Tickets & help'});
    await expect(help).toBeInViewport({ratio:1});
    expect(await help.evaluate(button => {
      const target = button.getBoundingClientRect(), badge = button.querySelector('.cc-help-badge')!.getBoundingClientRect();
      return {target:[target.width,target.height],badge:[badge.width,badge.height]};
    })).toEqual({target:[44,44],badge:[28,28]});
    await expect.poll(async () => {
      const corner = await help.boundingBox(), card = await dialog.boundingBox();
      const visible = await page.evaluate(() => {
        const visual = window.visualViewport;
        return {width:visual ? visual.offsetLeft + visual.width : innerWidth,
          height:visual ? visual.offsetTop + visual.height : innerHeight};
      });
      return Boolean(corner && card && corner.x + corner.width >= visible.width - 5 &&
        corner.y + corner.height >= visible.height - 5 &&
        (corner.y >= card.y + card.height - 1 || corner.x >= card.x + card.width - 1));
    }).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(landingHelp).toBeFocused();
});

test('the festival Register button and its label stay centered with help visible', async ({page}) => {
  await mockConcert(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/modules/concert');
  const register = page.getByRole('button',{name:'Tap here to register',exact:true});
  for (const width of [320,390,430]) {
    await page.setViewportSize({width,height:700});
    await expect(page.getByRole('button',{name:'Tickets & help',exact:true})).toBeInViewport({ratio:1});
    await expect.poll(() => register.evaluate(button => {
      const midpointError = (element: Element) => {
        const box = element.getBoundingClientRect();
        return Math.abs(box.left + box.width / 2 - window.innerWidth / 2);
      };
      return Math.max(midpointError(button), midpointError(button.querySelector('.cc-admission-title')!));
    })).toBeLessThanOrEqual(1);
  }
  await register.click();
  const guest = page.getByRole('button',{name:'I am a guest.', exact:true});
  await expect(guest).toBeInViewport({ratio:1});
  const greeting = page.locator('dialog[open] .cc-festival-welcome img');
  await expect.poll(() => greeting.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('Register hops in pairs for one minute and stops when asked', async ({page}) => {
  await mockConcert(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/modules/concert');
  const register = page.getByRole('button', {name:'Tap here to register', exact:true});
  const stop = page.getByRole('button', {name:'Stop button animation'});
  await expect(register).toHaveCSS('animation-name', 'cc-register-beckon');
  await expect(register).toHaveCSS('animation-iteration-count', '6');
  await expect(stop).toBeInViewport({ratio:1});
  const lifts = await register.evaluate(button => {
    const hop = button.getAnimations().find(animation =>
      animation instanceof CSSAnimation && animation.animationName === 'cc-register-beckon');
    if (!hop) return [];
    hop.pause();
    return [640, 2400, 5000, 50640, 52400, 59900, 60000].map(time => {
      hop.currentTime = time;
      return new DOMMatrix(getComputedStyle(button).transform).m42;
    });
  });
  expect(lifts).toEqual([-12, -12, 0, -12, -12, 0, 0]);
  await stop.click();
  await expect(register).toBeFocused();
  await expect(register).toHaveCSS('animation-name', 'none');
  await expect(stop).toHaveCount(0);
  await register.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await register.blur();
  await expect(register).toHaveCSS('animation-name', 'none');

  await page.reload();
  await expect(register).toHaveCSS('animation-name', 'cc-register-beckon');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(register).toHaveCSS('animation-name', 'none');
  await expect(stop).toHaveCount(0);
});

async function expectLeafSweep(dialog: Locator, direction: 'open' | 'forward' | 'back' | 'success', sweep: FestivalSweep) {
  const card = dialog.locator('.cc-festival-leaves');
  const sky = dialog.locator('.cc-festival-sky');
  await expect(card).toHaveAttribute('data-sweep', sweep);
  await expect(sky).toHaveAttribute('data-sweep', sweep);
  await expect(card).toHaveAttribute('data-direction', direction);
  await expect(sky).toHaveAttribute('data-direction', direction);
  await expect(sky).toHaveCSS('transform', direction === 'back' ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none');
  await expect(card.locator('.cc-leaf-flight').first()).toHaveCSS('animation-name',
    sweep === 'breeze' ? 'cc-heaven-flight' : 'cc-leaf-curve');
  await expect(sky.locator('[data-shape="leaf"]').first()).toHaveCSS('animation-name',
    sweep === 'breeze' ? 'cc-sky-rise' : 'cc-sky-curve');
}

async function expectAccent(sky: Locator, kind: string, colors: string[], glintCount: number) {
  await expect(sky).toHaveAttribute('data-accent', kind);
  const expression = sky.locator(`[data-expression="${kind}"]`);
  await expect(expression.locator('img')).toHaveAttribute('src', '/concert/festival-' + kind + '.webp');
  await expect.poll(() => expression.evaluate(node => {
    const art = node.querySelector('img')!;
    return art.complete && art.naturalWidth > 0 && art.clientWidth <= art.naturalWidth;
  })).toBe(true);
  await expect(expression).toHaveCSS('animation-name', 'cc-sky-expression');
  await expect(expression.locator('.cc-sky-glint')).toHaveCount(glintCount);
  await expect(expression.locator('.cc-sky-glint').first()).toHaveCSS('animation-name', 'cc-sky-glint');
  expect(await sky.locator('[data-shape="heart"]').evaluateAll(hearts =>
    hearts.slice(0, 2).map(heart => heart.getAttribute('data-color')))).toEqual(colors);
}

async function sampleSkyFrame(dialog: Locator) {
  return dialog.locator('.cc-festival-sky').evaluate(sky => {
    // Read both profiles at the same 360 ms instant, independent of rendering speed.
    return ['leaf', 'heart', 'star'].map(shape => {
      const element = sky.querySelector<HTMLElement>(`[data-shape="${shape}"]`)!;
      const flight = element.getAnimations()[0];
      const previous = flight.currentTime;
      flight.currentTime = 360;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      flight.currentTime = previous;
      return [matrix.m41, matrix.m42];
    });
  });
}

test('leaf sweeps travel from different edges, mirror Back and respect reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  const dialog = await openRegistration(page);
  const scene = dialog.locator('.cc-festival-leaves');
  const sky = dialog.locator('.cc-festival-sky');
  await expect(scene).toHaveAttribute('data-direction', 'open');
  await expect(sky).toHaveAttribute('data-direction', 'open');
  const coverage = await sky.evaluate(layer => {
    const bounds = layer.getBoundingClientRect();
    return {
      fillsScreen: bounds.left === 0 && bounds.top === 0 &&
        bounds.width === window.innerWidth && bounds.height === window.innerHeight,
      active: layer.matches(':popover-open'),
      acceptsInput: getComputedStyle(layer).pointerEvents !== 'none',
      shapes: [...new Set(Array.from(layer.children, child => child.getAttribute('data-shape')))].sort(),
    };
  });
  expect(coverage).toEqual({fillsScreen:true, active:true, acceptsInput:false, shapes:['expression', 'heart', 'leaf', 'star']});
  await expect(sky).toHaveAttribute('aria-hidden', 'true');
  await expectLeafSweep(dialog, 'open', 'breeze');
  await expectAccent(sky, 'greeting', ['rose', 'blush'], 3);
  await expect(scene.locator('.cc-leaf-flight')).toHaveCount(10);
  await expect(scene).toHaveCSS('pointer-events', 'none');
  await expect(scene.locator('.cc-leaf-flight').first()).toHaveCSS('animation-duration', '0.44s');
  await expect(scene.locator('.cc-leaf-flight').last()).toHaveCSS('animation-duration', '0.93s');
  await expect(scene).toHaveCount(0);
  await expect(sky).toHaveCount(0);

  await dialog.getByRole('button', {name:'Tickets & help'}).click();
  await expectLeafSweep(dialog, 'forward', 'breeze');
  await dialog.getByRole('button', {name:'Back to registration'}).click();
  await expectLeafSweep(dialog, 'forward', 'breeze');
  await expect(sky).toHaveCount(0);

  await dialog.getByRole('button', {name:'I am a member.'}).click();
  await expectLeafSweep(dialog, 'forward', 'canopy');
  const canopyFrame = await sampleSkyFrame(dialog);
  const heading = dialog.getByRole('heading', {level:3});
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('opacity', '1');
  await expect(heading).toHaveCSS('transform', 'none');
  await expect(sky).toHaveCount(0);

  await dialog.getByRole('button', {name:'I’m registering myself.'}).click();
  await expectLeafSweep(dialog, 'forward', 'updraft');
  const updraftFrame = await sampleSkyFrame(dialog);
  expect(canopyFrame[0][1]).toBeGreaterThan(0);
  expect(updraftFrame[0][1]).toBeLessThan(0);
  expect(canopyFrame.slice(1)).not.toEqual(updraftFrame.slice(1));
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await expectLeafSweep(dialog, 'back', 'canopy');
  await expect(sky).toHaveCount(0);

  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await expectLeafSweep(dialog, 'back', 'breeze');
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'I am a guest.'}).click();
  await expectLeafSweep(dialog, 'forward', 'diagonal');
  await expectAccent(sky, 'inclusiveness', ['coral', 'lilac'], 3);
  const name = dialog.getByLabel('Full Name', {exact:true});
  const directlyTappable = await name.evaluate(field => {
    const box = field.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === field;
  });
  expect(directlyTappable).toBe(true);
  await name.fill('Fictional Visitor');
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'Tickets & help'}).click();
  await expectLeafSweep(dialog, 'forward', 'breeze');
  await dialog.getByRole('button', {name:'Back to registration'}).click();
  await expectLeafSweep(dialog, 'forward', 'diagonal');
  await expect(name).toHaveValue('Fictional Visitor');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(scene).toHaveCount(0);
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await dialog.getByRole('button', {name:'I am a guest.'}).click();
  await expect(dialog.getByLabel('Full Name', {exact:true})).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-scene');

  await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(() => Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable:true, value:undefined,
  }));
  await page.getByRole('button', {name:'Tap here to register', exact:true}).click();
  await expect(sky).not.toHaveAttribute('popover');
  await expect(sky).toHaveCSS('position', 'absolute');
  await expect(sky).toHaveCSS('pointer-events', 'none');
  await expect(sky.locator('i').first()).toHaveCSS('animation-name', 'cc-sky-rise');
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await expectLeafSweep(dialog, 'back', 'breeze');
  await page.keyboard.press('Escape');
  await expect(sky).toHaveCount(0);
});

test('adaptive form paging alternates the leaves and preserves focus and field positions', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const dialog = await openRegistration(page);
  await dialog.getByRole('button', {name:'I am a guest.'}).click();
  const sky = dialog.locator('.cc-festival-sky');
  await expectLeafSweep(dialog, 'forward', 'diagonal');
  await page.setViewportSize({width:320,height:360});
  const form = dialog.locator('.cc-reg-form:visible');
  await expect(form).toHaveAttribute('data-layout', 'paged');
  const inputs = form.locator('input:visible');
  for (const input of await inputs.all()) {
    await input.fill(await input.getAttribute('type') === 'email' ? 'visitor@example.invalid' : 'Fictional Visitor');
  }
  await dialog.getByRole('button', {name:'Next', exact:true}).click();
  await expectLeafSweep(dialog, 'forward', 'updraft');
  const position = form.locator('.cc-page-nav span');
  await expect(position).toBeFocused();
  await expect(position).toHaveCSS('transform', 'none');
  const firstField = form.locator('[data-form-unit]:visible').first();
  await expect(firstField).toHaveCSS('transform', 'none');
  expect(await firstField.evaluate(unit =>
    unit.getAnimations().some(animation => animation.id === 'festival-step'))).toBe(true);
  await form.getByRole('button', {name:'Previous page'}).click();
  await expectLeafSweep(dialog, 'back', 'diagonal');
  await expect(position).toBeFocused();
  await expect(sky).toHaveCount(0);
  await expect(dialog.getByLabel('Full Name', {exact:true})).toHaveValue('Fictional Visitor');
});

test('sender fields stay in place through the iPhone keyboard lifecycle', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  const dialog = await openRegistration(page);
  await dialog.getByRole('button', {name:'I am a member.'}).click();
  await dialog.getByRole('button', {name:'I’m inviting someone.'}).click();
  const name = dialog.getByLabel('Full Name', {exact:true});
  const email = dialog.getByLabel('Email', {exact:true});
  const poster = dialog.locator('.cc-poster-stage');
  await expect(name).toBeVisible();
  await expect(poster).toBeHidden();
  const settledTop = (await dialog.boundingBox())!.y;
  expect(await email.evaluate(field => parseFloat(getComputedStyle(field).fontSize))).toBeGreaterThanOrEqual(16);

  const viewportHeight = await page.evaluate(() => window.visualViewport!.height);
  async function resizeKeyboard(height: number, top = 0, scale = 1) {
    await page.evaluate(({height, top, scale}) => {
      const visual = window.visualViewport!;
      Object.defineProperties(visual, {
        height:{configurable:true, value:height},
        offsetTop:{configurable:true, value:top},
        scale:{configurable:true, value:scale},
      });
      visual.dispatchEvent(new Event('resize'));
    }, {height, top, scale});
  }

  async function expectAboveKeyboard(control: Locator) {
    await expect.poll(() => control.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const visual = window.visualViewport!;
      return rect.top >= visual.offsetTop - 1 &&
        rect.bottom <= visual.offsetTop + visual.height + 1;
    })).toBe(true);
  }

  await name.fill('Fictional Sender');
  await resizeKeyboard(315);
  await expect(dialog).toHaveAttribute('data-keyboard', '');
  expect((await dialog.boundingBox())!.y).toBeCloseTo(settledTop, 0);
  await email.fill('sender@example.invalid');
  await resizeKeyboard(245, 24, 1.01);
  await expect.poll(async () => Math.round((await dialog.boundingBox())!.y - settledTop)).toBe(24);
  await expect.poll(async () => {
    const field = (await email.boundingBox())!;
    const body = (await dialog.locator('.cc-dialog-inner').boundingBox())!;
    return field.y >= body.y - 1 && field.y + field.height <= body.y + body.height + 1;
  }).toBe(true);
  await expect(email).toBeFocused();
  await expect(dialog.locator('.cc-page-nav:visible')).toHaveCount(0);
  await expectAboveKeyboard(email);
  await expectAboveKeyboard(dialog.getByRole('button', {name:'Continue'}));
  await expectAboveKeyboard(dialog.getByRole('button', {name:'Tickets & help'}));

  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await expect(dialog.getByRole('button', {name:'I’m inviting someone.'})).toBeVisible();
  await expect(dialog).toHaveAttribute('data-keyboard', '');
  await expect(poster).toBeHidden();
  await expect(dialog.locator('.cc-festival-sky')).toHaveCount(0);

  await resizeKeyboard(viewportHeight);
  await expect(dialog).not.toHaveAttribute('data-keyboard', '');
  await expect(poster).toBeVisible();
  await dialog.getByRole('button', {name:'I’m inviting someone.'}).click();
  await expect(name).toHaveValue('Fictional Sender');
  await expect(email).toHaveValue('sender@example.invalid');
});

test('invitation, verification and paged results follow the same leaf sequence', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/api/concert/registration', route => {
    const input = route.request().postDataJSON();
    if (input.op === 'requestCode') return route.fulfill({json:{challenge:'fictional-scene-code'}});
    if (input.op === 'register' || (input.op === 'verifyCode' && input.purpose === 'recovery')) {
      return route.fulfill({json:{tickets:[{id:'ticket',name:'Fictional Guest',partySize:1,url:'/concert/ticket/scene'}]}});
    }
    if (input.op === 'create' || input.op === 'verifyCode') {
      return route.fulfill({json:{invitations:[1, 2].map(index => ({
        id:'invitation-' + index, name:'Fictional Guest ' + index, url:'/concert/invitation/scene-' + index,
        hasEmail:false, withdrawn:false, accepted:false, delivery:'pending',
      }))}});
    }
    return route.fulfill({status:400,json:{error:'Unexpected operation'}});
  });
  const dialog = await openRegistration(page);
  const sky = dialog.locator('.cc-festival-sky');
  await expect(dialog).toBeVisible();
  await expect(sky).toHaveCount(0);
  await dialog.getByRole('button', {name:'I am a member.'}).click();
  await expectLeafSweep(dialog, 'forward', 'canopy');
  await dialog.getByRole('button', {name:'I’m inviting someone.'}).click();
  await expectLeafSweep(dialog, 'forward', 'updraft');
  await dialog.getByLabel('Full Name', {exact:true}).fill('Fictional Sender');
  await dialog.getByLabel('Email', {exact:true}).fill('sender@example.invalid');
  await dialog.getByRole('button', {name:'Continue', exact:true}).click();
  await expectLeafSweep(dialog, 'forward', 'crossing');
  await dialog.getByLabel('Number of invitations').selectOption('2');
  await dialog.getByRole('button', {name:'Add recipients'}).click();
  await expectLeafSweep(dialog, 'forward', 'diagonal');
  await expect(sky.locator('[data-shape="leaf"]')).toHaveCount(6);
  await expectAccent(sky, 'consideration', ['blush', 'lavender'], 3);
  await dialog.getByLabel('Guest’s full name').fill('Fictional First');
  await dialog.getByLabel('Relationship').fill('Friend');
  await dialog.getByRole('button', {name:'Next recipient'}).click();
  await expectLeafSweep(dialog, 'forward', 'fan');
  await dialog.getByLabel('Guest’s full name').fill('Fictional Second');
  await dialog.getByLabel('Relationship').fill('Friend');
  await dialog.getByRole('button', {name:'Create invitations', exact:true}).click();
  await expectLeafSweep(dialog, 'success', 'breeze');
  await expectAccent(sky, 'gratitude', ['honey', 'champagne'], 5);
  const star = sky.locator('[data-shape="star"]').first();
  expect(await star.evaluate(node => getComputedStyle(node).clipPath)).toContain('78% 16%');
  await dialog.getByRole('button', {name:'Next invitation', exact:true}).click();
  await expectLeafSweep(dialog, 'forward', 'canopy');
  await dialog.getByRole('button', {name:'Tickets & help'}).click();
  await expectLeafSweep(dialog, 'forward', 'breeze');
  await dialog.getByRole('button', {name:'Manage invitations I sent'}).click();
  await expectLeafSweep(dialog, 'forward', 'canopy');
  await dialog.getByLabel('Email', {exact:true}).fill('sender@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await expectLeafSweep(dialog, 'forward', 'updraft');
  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await dialog.getByRole('button', {name:'Back', exact:true}).click();
  await dialog.getByLabel('Registration email').fill('guest@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await expectLeafSweep(dialog, 'forward', 'canopy');
  await dialog.getByLabel('Eight-digit email code').fill('12345678');
  await dialog.getByRole('button', {name:'Verify email'}).click();
  await expectLeafSweep(dialog, 'forward', 'updraft');
  await page.keyboard.press('Escape');
  await expect(sky).toHaveCount(0);
  await page.getByRole('button', {name:'Tap here to register', exact:true}).click();
  await dialog.getByRole('button', {name:'I am a guest.'}).click();
  await dialog.getByLabel('Full Name', {exact:true}).fill('Fictional Guest');
  await dialog.getByLabel('Email', {exact:true}).fill('guest@example.invalid');
  await dialog.getByLabel('Who invited you?').fill('Fictional Host');
  await dialog.getByRole('button', {name:'Get my ticket'}).click();
  await expectLeafSweep(dialog, 'success', 'breeze');
  await expect(dialog.getByRole('heading', {level:3})).toBeFocused();
});

test('VIP details follow the recipient draft and disappear when that recipient is removed', async ({page}) => {
  let submitted: InviteDraft[] = [];
  await page.route('**/api/concert/registration', route => {
    const input = route.request().postDataJSON();
    switch (input.op) {

      case 'create':
        submitted = input.recipients;
        return route.fulfill({json:{invitations:[]}});
      default: return route.fulfill({status:400,json:{error:'Unexpected operation'}});
    }
  });
  const dialog = await openRegistration(page);
  await dialog.getByRole('button', {name:'I am a member.'}).click();
  await dialog.getByRole('button', {name:'I’m inviting someone.'}).click();
  await dialog.getByLabel('Full Name', {exact:true}).fill('Fictional Sender');
  await dialog.getByLabel('Email', {exact:true}).fill('sender@example.invalid');
  await dialog.getByRole('button', {name:'Continue',exact:true}).click();
  const count = dialog.getByLabel('Number of invitations');
  await count.selectOption('2');
  const add = dialog.getByRole('button', {name:'Add recipients'});
  await add.click();
  await dialog.getByLabel('Guest’s full name').fill('Fictional First');
  await dialog.getByLabel('Relationship').fill('Friend');
  const next = dialog.getByRole('button', {name:'Next recipient'});
  await next.click();
  const vip = dialog.getByRole('checkbox', {name:'VIP', exact:true});
  const title = dialog.getByLabel('VIP title');
  await vip.check();
  await title.fill('Fictional Director');
  await vip.uncheck();
  await vip.check();
  await expect(title).toHaveValue('Fictional Director');
  await vip.uncheck();
  const back = dialog.getByRole('button', {name:'Back', exact:true});
  await back.click();
  await back.click();
  await count.selectOption('1');
  await count.selectOption('2');
  await add.click();
  await expect(dialog.getByLabel('Guest’s full name')).toHaveValue('Fictional First');
  await next.click();
  await vip.check();
  await expect(title).toHaveValue('');
  await title.fill('Discard this title');
  await vip.uncheck();
  await dialog.getByLabel('Guest’s full name').fill('Fictional Replacement');
  await dialog.getByLabel('Relationship').fill('Neighbor');
  await dialog.getByRole('button', {name:'Create invitations'}).click();
  await expect(dialog.getByRole('heading', {name:'Your invitations'})).toBeFocused();
  expect(submitted).toEqual([
    {name:'Fictional First',relationship:'Friend',email:'',firstVisit:false,vip:null},
    {name:'Fictional Replacement',relationship:'Neighbor',email:'',firstVisit:false,vip:null},
  ]);
});

test('a member can register with one name field and return from duplicate-ticket recovery', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:568});
  let registrations = 0;
  await page.route('**/api/concert/registration', route => {
    const input = route.request().postDataJSON();
    switch (input.op) {
      case 'register':
        registrations++;
        expect(input.member).toEqual({fullName:'Fictional Middle Member',leader:'Fictional Leader'});
        return route.fulfill({json:{existing:true,tickets:[]}});
      case 'requestCode': return route.fulfill({json:{challenge:'fictional-member-lookup'}});
      case 'verifyCode': return route.fulfill({json:{tickets:[
        {id:'ticket',name:'Fictional Member',partySize:1,url:'/concert/ticket/example'},
      ]}});
      default: return route.fulfill({status:400,json:{error:'Unexpected operation'}});
    }
  });
  const dialog = await openRegistration(page);
  const register = page.getByRole('button', {name:'Tap here to register',exact:true});
  await page.keyboard.press('Escape');
  await expect(register).toBeFocused();
  await expect(register).toBeInViewport({ratio:1});
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(568);
  await register.press('Enter');
  await dialog.getByRole('button', {name:'I am a member.'}).click();
  const choices = dialog.locator('[data-step="member"] .cc-festival-choice');
  await expect(choices).toHaveText(['I’m registering myself.', 'I’m inviting someone.']);
  await choices.first().click();
  await dialog.getByLabel('Full Name', {exact:true}).fill('Fictional Middle Member');
  await dialog.getByLabel('Email', {exact:true}).fill('member@example.invalid');
  await dialog.getByLabel('Group Leader').fill('Fictional Leader');
  await dialog.getByRole('button', {name:'Register me'}).click();
  await dialog.getByRole('button', {name:'Find my tickets'}).click();
  await dialog.getByLabel('Registration email').fill('member@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await dialog.getByLabel('Eight-digit email code').fill('12345678');
  await dialog.getByRole('button', {name:'Verify email'}).click();
  await expect(dialog.getByRole('link', {name:'Open QR ticket'})).toBeVisible();
  await dialog.getByRole('button', {name:'Back to registration'}).click();
  await expect(dialog.getByRole('heading', {name:'Check your registration'})).toBeFocused();
  await expect(dialog.getByRole('button', {name:'Continue to invitations'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await register.click();
  await dialog.getByRole('button', {name:'I am a member.'}).click();
  await dialog.getByRole('button', {name:'I’m inviting someone.'}).click();
  await expect(dialog.getByLabel('Full Name', {exact:true})).toBeVisible();
  expect(registrations).toBe(1);
});

test('closing preserves a guest draft but clears completed tickets and a new registration gets a fresh request ID', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const ids: string[] = [];
  await page.route('**/api/concert/registration', route => {
    const input = route.request().postDataJSON();
    ids.push(input.requestId);
    return route.fulfill({json:{tickets:[{id:'ticket',name:input.names[0],partySize:1,url:'/concert/ticket/fictional-guest'}]}});
  });
  const dialog = await openRegistration(page);
  const register = page.getByRole('button', {name:'Tap here to register',exact:true});
  const guest = dialog.getByRole('button', {name:'I am a guest.'});
  const name = dialog.getByLabel('Full Name', {exact:true});
  await guest.click();
  await name.fill('Fictional First');
  await page.keyboard.press('Escape');
  await register.click();
  await expect(name).toHaveValue('Fictional First');
  for (const person of ['First','Second']) {
    if (person === 'Second') {
      await guest.click();
      await expect(name).toHaveValue('');
      await name.fill('Fictional Second');
    }
    await dialog.getByLabel('Email', {exact:true}).fill(person.toLowerCase()+'@example.invalid');
    await dialog.getByLabel('Who invited you?').fill('Fictional Host');
    await dialog.getByRole('button', {name:'Get my ticket'}).click();
    await expect(dialog.getByRole('link', {name:'Open QR ticket'})).toBeVisible();
    await dialog.getByRole('button', {name:'Close',exact:true}).click();
    await expect(page.locator('a[href="/concert/ticket/fictional-guest"]')).toHaveCount(0);
    await register.click();
    await expect(guest).toBeVisible();
  }
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
});

for (const state of ['closed','full'] as const) {
  test('featured member can recover tickets while registration is '+state, async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:320,height:568});
    await mockConcert(page, {...workspace.event!,rsvpOpen:state !== 'closed',capacity:2,seatsTaken:state === 'full' ? 2 : 0});
    await page.route('**/api/concert/registration', route => {
      const input = route.request().postDataJSON();
      if (input.purpose === 'recovery' && input.op === 'requestCode') return route.fulfill({json:{challenge:'fictional-challenge'}});
      if (input.purpose === 'recovery' && input.op === 'verifyCode') return route.fulfill({json:{tickets:[
        {id:'ticket',name:'Fictional Member',partySize:1,url:'/concert/ticket/recovered'},
      ]}});
      return route.fulfill({status:400,json:{error:'Unexpected registration attempt'}});
    });
    await page.goto('/modules/concert');
    const help = page.getByRole('button', {name:'Tickets & help',exact:true});
    await expect(page.getByRole('status').filter({hasText:state})).toBeVisible();
    await expect(page.getByRole('button', {name:'Tap here to register',exact:true})).toHaveCount(0);
    await expect(help).toBeInViewport({ratio:1});
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(568);
    await help.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Registration email').fill('member@example.invalid');
    await dialog.getByRole('button', {name:'Send verification code'}).click();
    await dialog.getByLabel('Eight-digit email code').fill('12345678');
    await dialog.getByRole('button', {name:'Verify email'}).click();
    await expect(dialog.getByRole('link', {name:'Open QR ticket'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeFocused();
    await help.click();
    await expect(dialog.getByLabel('Registration email')).toHaveValue('');
    await expect(page.locator('a[href="/concert/ticket/recovered"]')).toHaveCount(0);
  });
}

test('failed film retries the private media route in place and restores the native player', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:568});
  await mockConcert(page);
  let available = false;
  let filmRequests = 0;
  const film = await readFile('tests/browser/fixtures/concert-retry.webm');
  await page.route('**/api/concert/promo/film.mp4', route => {
    filmRequests++;
    if (!available) return route.fulfill({status:503,headers:{'Cache-Control':'no-store'},body:''});
    return route.fulfill({contentType:'video/webm',body:film});
  });
  await page.goto('/modules/concert');
  const retry = page.getByRole('button', {name:'Retry film'});
  await expect(retry).toBeInViewport({ratio:1});
  await expect(page.getByRole('button', {name:'Tap here to register',exact:true})).toBeInViewport({ratio:1});
  const navigation = await page.evaluate(() => performance.timeOrigin);
  const initialRequests = filmRequests;
  await retry.press('Enter');
  await expect.poll(() => filmRequests).toBeGreaterThan(initialRequests);
  await expect(retry).toBeFocused();
  available = true;
  await retry.press('Enter');
  const player = page.getByLabel('Healing Concert promotional film');
  await expect(player).toBeFocused();
  await expect(player).toHaveJSProperty('videoWidth',32);
  await expect(player).toHaveJSProperty('paused',true);
  await expect(player).toHaveJSProperty('controls',true);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(navigation);
});

test('a completed lookup arriving after dismissal cannot reveal tickets in a reopened sheet', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const release = Promise.withResolvers<void>();
  const received = Promise.withResolvers<void>();
  await page.route('**/api/concert/registration', async route => {
    if (route.request().postDataJSON().op === 'requestCode') {
      await route.fulfill({json:{challenge:'fictional-lookup'}});
      return;
    }
    received.resolve();
    await release.promise;
    await route.fulfill({json:{tickets:[{id:'late',name:'Fictional Guest',partySize:1,url:'/concert/ticket/late'}]}});
  });
  const dialog = await openRegistration(page);
  const help = dialog.getByRole('button', {name:'Tickets & help'});
  await help.click();
  await dialog.getByLabel('Registration email').fill('guest@example.invalid');
  await dialog.getByRole('button', {name:'Send verification code'}).click();
  await dialog.getByLabel('Eight-digit email code').fill('12345678');
  try {
    await dialog.getByRole('button', {name:'Verify email'}).click();
    await received.promise;
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name:'Tap here to register',exact:true}).click();
    await help.click();
  } finally {
    release.resolve();
  }
  await expect(dialog.getByLabel('Registration email')).toHaveValue('');
  await expect(page.locator('a[href="/concert/ticket/late"]')).toHaveCount(0);
});

for (const partySize of [2,10]) test('a guest can switch between party tickets with the QR and actions in view · '+partySize, async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:568});
  const guests=Array.from({length:partySize},(_,i)=>i===0?'First Guest':'Guest '+(i+1));
  const tickets = guests.map((name,index) => ({
    name,id:String(index),partySize:1,url:'/concert/ticket/fictional-'+index,
    svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41"><rect width="41" height="41" fill="white"/></svg>',
  }));
  await page.route('**/api/concert/registration',route => route.fulfill({json:{tickets,emailed:true}}));
  const dialog=await openRegistration(page);
  await dialog.getByRole('button',{name:'I am a guest.'}).click();
  await dialog.getByLabel('Full Name', {exact:true}).fill('First Guest');
  await dialog.getByLabel('Email', {exact:true}).fill('family@example.invalid');
  await dialog.getByLabel('Who invited you?').fill('Fictional Host');
  for(let i=1;i<partySize;i++){
    await dialog.getByRole('button',{name:'Add one attendee'}).click();
    await dialog.getByLabel('Attendee '+(i+1)+' full name').fill(guests[i]);
  }
  await dialog.getByRole('button',{name:'Get tickets'}).click();
  const second=dialog.getByRole('button',{name:'Ticket 2 of '+partySize+' · Guest 2'});
  await dialog.getByRole('button',{name:'Enlarge ticket QR code for First Guest'}).click();
  const enlarged=page.getByRole('dialog',{name:'Ticket QR code for First Guest',exact:true});
  await expect(enlarged.getByRole('img',{name:'Enlarged ticket QR code'})).toBeVisible();
  await enlarged.getByRole('button',{name:'Ticket 2 of '+partySize+' · Guest 2'}).click();
  await page.getByRole('dialog',{name:'Ticket QR code for Guest 2',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
  await expect(second).toHaveAttribute('aria-pressed','true');
  await dialog.getByRole('button',{name:'Options',exact:true}).click();
  await expect(page.getByRole('link',{name:'Open QR ticket'})).toHaveAttribute('href','/concert/ticket/fictional-1');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const options = page.getByRole('dialog',{name:'Ticket options',exact:true});
  await expect.poll(() => options.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:'Close ticket options'}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(dialog.getByRole('button',{name:'Save all'})).toBeVisible();
  for(const viewport of [{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);
    await expect(dialog.getByRole('img',{name:'Ticket QR code'})).toBeInViewport({ratio:1});
    await expect(dialog.getByRole('button',{name:'Share',exact:true})).toBeInViewport({ratio:1});
    await expect.poll(()=>dialog.locator('.cc-dialog-inner').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
  }
});

test('short phone keeps ordinary questions fixed and confines a large party to its name list', async ({page}) => {
  await page.setViewportSize({width:320,height:568});
  await page.emulateMedia({reducedMotion:'reduce'});
  const dialog = await openRegistration(page);
  const sheet = dialog.locator('.cc-dialog-inner');
  const assertFit = async () => {
    await expect.poll(() => sheet.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeInViewport({ratio:1});
  };
  await assertFit();
  await dialog.getByRole('button',{name:'I am a member.'}).click();
  await assertFit();
  await dialog.getByRole('button',{name:'I’m registering myself.'}).click();
  await assertFit();
  await dialog.getByRole('button',{name:'Back',exact:true}).click();
  await dialog.getByRole('button',{name:'Back',exact:true}).click();
  await dialog.getByRole('button',{name:'I am a guest.'}).click();
  await assertFit();
  await dialog.getByLabel('Party size (including you)').selectOption('10');
  const names = dialog.getByRole('region',{name:'Additional attendees'});
  await expect.poll(() => names.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  await dialog.getByLabel('Attendee 10 full name').fill('Fictional Companion');
  await assertFit();
  await expect(dialog.getByRole('button',{name:'Get tickets'})).toBeInViewport({ratio:1});
  await expect(dialog.getByRole('button',{name:'Get tickets'})).toHaveCSS('clip-path', 'none');
});
