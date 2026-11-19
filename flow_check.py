import os, sys, time, json
from playwright.sync_api import sync_playwright

base = os.environ.get('BASE', 'http://localhost:5173')
api = os.environ.get('API', 'http://localhost:5000/api')
invite = os.environ.get('INVITE', 'pilot-code-123')
pw = 'correct-horse-9'
fails = []

def run(browser, name, viewport, mobile):
    u = int(time.time() * 1000) % 10**10
    email = f'{name}{u}@example.com'
    ctx = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))

    def check(label, cond, extra=''):
        print(('PASS ' if cond else 'FAIL ') + f'[{name}] ' + label, extra if not cond else '')
        if not cond: fails.append(f'[{name}] {label}')

    def overflow_ok(label):
        check('no horizontal scroll: ' + label, page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))

    def errs():
        return [e.inner_text() for e in page.query_selector_all('form [id$=-error]')]

    def token():
        return json.loads(page.evaluate("localStorage.getItem('sophia.session')"))['token']

    def get(path):
        r = page.request.get(api + path, headers={'Authorization': 'Bearer ' + token()})
        return r.json()

    def login(password=pw):
        page.fill('#email', email); page.fill('#password', password)
        page.click('button[type=submit]')

    def assess(child, age, counts):
        page.fill('#child_id', child); page.fill('#age_months', age)
        for k, (a, s) in counts.items():
            page.click('text=Quick entry'); page.fill(f'#{k}_achieved', a); page.fill(f'#{k}_assessed', s)

    ALL = lambda a, s: {k: (a, s) for k in ['cognitive', 'motor', 'language', 'social_emotional']}

    # 1. logged out
    page.goto(base + '/')
    page.wait_for_url('**/login')
    check('logged-out visit goes to login', page.url.endswith('/login'))
    overflow_ok('login')

    # 2. register with bad input then good
    page.click('text=Create one'); page.wait_for_url('**/register'); overflow_ok('register')
    page.click('button[type=submit]')
    check('register: empty submit shows 5 messages', len(errs()) == 5, errs())
    page.fill('#full_name', 'Dr Flow'); page.fill('#email', 'bad'); page.fill('#password', 'short'); page.fill('#confirm', 'other')
    page.click('button[type=submit]')
    check('register: bad email, short password, mismatch, no invite code', len(errs()) == 4, errs())
    page.fill('#email', email); page.fill('#password', pw); page.fill('#confirm', pw)
    page.fill('#invite_code', 'wrong'); page.click('button[type=submit]'); page.wait_for_selector('[role=alert]')
    check('register: wrong invite code is refused', 'invite code' in page.inner_text('[role=alert]').lower() and '/register' in page.url)
    page.fill('#invite_code', invite)
    page.click('button[type=submit]'); page.wait_for_url('**/login')
    check('register success shows notice and prefilled email', page.inner_text('[role=status]').startswith('Account created') and page.input_value('#email') == email)

    # 3. login bad then good
    page.fill('#email', ''); page.click('button[type=submit]')
    check('login: empty submit', len(errs()) == 2, errs())
    login('wrong-password'); page.wait_for_selector('[role=alert]')
    check('login: wrong password message', page.inner_text('[role=alert]') == 'Invalid email or password')
    page.fill('#password', pw); page.click('button[type=submit]'); page.wait_for_selector('text=No children screened yet.')
    check('login success lands on dashboard (empty)', page.url == base + '/' and page.is_visible('text=No children screened yet.'))
    check('screening notice visible', 'does not diagnose' in page.inner_text('footer'))
    overflow_ok('dashboard empty')

    # 4. assess: bad input
    page.click('nav >> text=New assessment'); page.wait_for_selector('#child_id'); overflow_ok('assess form')
    page.click('button[type=submit]')
    check('assess: empty submit', len(errs()) >= 3, errs())
    assess(f'a{u}', 'abc', {'cognitive': ('5', '')})
    page.click('button[type=submit]')
    check('assess: bad age and half-filled domain', 'Enter the age as a number, for example 6.5' in errs() and 'Enter how many were assessed' in errs(), errs())
    assess(f'a{u}', '20', ALL('1', '10'))
    page.click('button[type=submit]'); page.wait_for_selector('[role=alert]')
    check('assess: unsupported age rejected by server, values kept', 'not supported' in page.inner_text('[role=alert]') and page.input_value('#age_months') == '20' and page.input_value('#cognitive_achieved') == '1')

    # 5. save fails once (backend unreachable), then succeeds
    page.fill('#age_months', '6')
    page.route('**/api/score', lambda r: r.abort())
    page.click('button[type=submit]'); page.wait_for_selector('[role=alert]:has-text("Cannot reach")')
    check('assess: network failure message, form kept', page.input_value('#child_id') == f'a{u}' and page.input_value('#age_months') == '6')
    page.unroute('**/api/score')
    page.click('button[type=submit]'); page.wait_for_url('**/assess/result'); page.wait_for_selector('[data-testid=verdict]')
    check('result: flagged child', page.inner_text('[data-testid=verdict]').startswith('Flagged for follow-up'))
    overflow_ok('result')
    page.reload(); page.wait_for_selector('[data-testid=verdict]')
    check('result survives refresh', page.url.endswith('/assess/result'))

    # 6. more children: typical, partial, double click
    page.click('text=New assessment >> nth=-1'); page.wait_for_selector('#child_id')
    assess(f'b{u}', '14', ALL('8', '10')); page.click('button[type=submit]'); page.wait_for_selector('[data-testid=verdict]')
    check('result: typical child not flagged', page.inner_text('[data-testid=verdict]').startswith('Not flagged'))
    page.click('nav >> text=New assessment'); page.wait_for_selector('#child_id')
    assess(f'c{u}', '14', {'cognitive': ('3', '8'), 'language': ('1', '2')}); page.click('button[type=submit]'); page.wait_for_selector('[data-testid=verdict]')
    check('result: partial child has no forest score and notes', 'not available' in page.inner_text('[data-testid=forest]') and 'Partial assessment' in page.inner_text('main'))
    page.click('nav >> text=New assessment'); page.wait_for_selector('#child_id')
    assess(f'd{u}', '6', ALL('8', '10')); page.dblclick('button[type=submit]'); page.wait_for_selector('[data-testid=verdict]')
    kids = get('/children')['children']
    d = [k for k in kids if k['child_id'] == f'd{u}']
    check('double click stores one assessment', len(d) == 1 and d[0]['assessment_count'] == 1, d)

    # 7. review: children list, detail, repeat assessment
    page.click('nav >> text=Children'); page.wait_for_selector('[data-testid=row], [data-testid=empty]'); overflow_ok('children')
    page.click('button:has-text("All children")')
    check('children: all four listed', len(page.query_selector_all('[data-testid=row]')) == 4)
    page.click(f'a:has-text("a{u}")'); page.wait_for_selector('h1:has-text("Child a")'); overflow_ok('child detail')
    check('detail: flagged, one assessment', page.inner_text('[data-testid=verdict]').startswith('Flagged for follow-up') and '1 assessment.' in page.inner_text('h1 + p'))
    child_url = page.url
    page.click('text=New assessment for this child'); page.wait_for_selector('#child_id')
    check('repeat assessment prefilled', page.input_value('#child_id') == f'a{u}')
    assess(f'a{u}', '6', ALL('8', '10')); page.click('button[type=submit]'); page.wait_for_selector('[data-testid=verdict]')
    page.goto(child_url); page.wait_for_selector('[data-testid=history-row]')
    check('detail: two rows, latest not flagged', len(page.query_selector_all('[data-testid=history-row]')) == 2 and page.inner_text('[data-testid=verdict]').startswith('Not flagged'))

    # 7b. history chart and deleting a child
    page.click('button:has-text("Chart")'); page.wait_for_selector('[data-testid=history-chart] .recharts-line', state='attached'); overflow_ok('history chart')
    check('detail: chart view has one line per domain', len(page.query_selector_all('[data-testid=history-chart] .recharts-line')) == 4)
    page.click('button:has-text("Table")'); page.wait_for_selector('[data-testid=history-row]')
    page.goto(base + '/children'); page.wait_for_selector('[data-testid=row]'); page.click('button:has-text("All children")')
    page.click(f'a:has-text("d{u}")'); page.wait_for_selector('[data-testid=delete-start]')
    page.click('[data-testid=delete-start]'); overflow_ok('delete confirmation'); page.click('button:has-text("Cancel")')
    check('delete: cancel keeps the child', any(k['child_id'] == f'd{u}' for k in get('/children')['children']))
    page.click('[data-testid=delete-start]'); page.click('[data-testid=delete-confirm]'); page.wait_for_url(base + '/children')
    check('delete: child removed', not any(k['child_id'] == f'd{u}' for k in get('/children')['children']))

    # 8. dashboard matches the API
    page.click('nav >> text=Dashboard'); page.wait_for_selector('[data-testid=total]'); overflow_ok('dashboard')
    kids = get('/children')['children']
    flagged = sum(1 for k in kids if k['latest']['rule_based']['flag'] or (k['latest']['isolation_forest'] or {}).get('flag'))
    total_assessments = sum(k['assessment_count'] for k in kids)
    ui = {t: int(page.inner_text(f'[data-testid={t}]')) for t in ['total', 'flagged', 'not-flagged', 'assessments']}
    check('dashboard equals API', ui == {'total': len(kids), 'flagged': flagged, 'not-flagged': len(kids) - flagged, 'assessments': total_assessments}, (ui, len(kids), flagged, total_assessments))
    page.wait_for_selector('[data-testid=chart] .recharts-bar-rectangle')

    # 9. model report
    page.click('nav >> text=Model report'); page.wait_for_selector('[data-testid=rows]'); overflow_ok('model report')
    check('model report loads', page.inner_text('[data-testid=rows]') == '516')

    # 10. refresh on every protected route
    for path, sel in [('/', '[data-testid=total]'), ('/children', '[data-testid=row], [data-testid=empty]'), (child_url.replace(base, ''), '[data-testid=history-row]'), ('/assess', '#child_id'), ('/model', '[data-testid=rows]')]:
        page.goto(base + path); page.wait_for_selector(sel)
        check(f'direct load works: {path}', page.url == base + path)
    page.goto(base + '/no/such/page'); page.wait_for_selector('h1')
    check('unknown address shows not found page', 'not found' in page.inner_text('h1').lower())
    page.click('a'); page.wait_for_url(base + '/'); check('not found link returns home', True)

    # 11. session lost during use (server says 401 on save)
    page.click('nav >> text=New assessment'); page.wait_for_selector('#child_id')
    assess(f'e{u}', '6', ALL('8', '10'))
    page.route('**/api/score', lambda r: r.fulfill(status=401, content_type='application/json', body=json.dumps({'errors': ['Token has expired']})))
    page.click('button[type=submit]'); page.wait_for_url('**/login')
    check('expired session on save -> login with notice', page.inner_text('[role=status]') == 'Your session has expired. Sign in again.')
    check('expired session: storage cleared', page.evaluate("localStorage.getItem('sophia.session')") is None)
    page.unroute('**/api/score')
    login(); page.wait_for_selector('#child_id')
    check('after sign in, returns to the page being used', page.url == base + '/assess')

    # 12. timer expiry on another page
    page.click('nav >> text=Children'); page.wait_for_selector('[data-testid=row]')
    sess = json.loads(page.evaluate("localStorage.getItem('sophia.session')")); sess['expiresAt'] = int(time.time() * 1000) + 2500
    page.evaluate("v => localStorage.setItem('sophia.session', v)", json.dumps(sess))
    page.reload(); page.wait_for_selector('[data-testid=row]')
    page.wait_for_url('**/login', timeout=8000)
    check('timer expiry logs out with notice', page.inner_text('[role=status]') == 'Your session has expired. Sign in again.')
    login(); page.wait_for_selector('[data-testid=row]')
    check('returns to /children after sign in', page.url == base + '/children')

    # 13. expired on load
    sess = json.loads(page.evaluate("localStorage.getItem('sophia.session')")); sess['expiresAt'] = int(time.time() * 1000) - 1000
    page.evaluate("v => localStorage.setItem('sophia.session', v)", json.dumps(sess))
    page.goto(base + '/model'); page.wait_for_url('**/login')
    check('expired on load -> login with notice', page.inner_text('[role=status]') == 'Your session has expired. Sign in again.')
    login(); page.wait_for_selector('[data-testid=rows]')
    check('expired on load: returns to /model', page.url == base + '/model')

    # 14. logout
    page.click('text=Log out'); page.wait_for_url('**/login')
    check('logout: login page, no expiry notice, storage cleared', page.query_selector('[role=status]') is None and page.evaluate("localStorage.getItem('sophia.session')") is None)
    page.go_back(); page.wait_for_url('**/login')
    check('logout: Back cannot reopen protected page', page.url.endswith('/login'))
    page.goto(child_url); page.wait_for_url('**/login')
    login(); page.wait_for_selector('[data-testid=history-row]')
    check('deep link after logout returns to the child', page.url == child_url)
    page.click('text=Log out'); page.wait_for_url('**/login')

    # 15. other doctor cannot see these children
    ctx2 = browser.new_context(); p2 = ctx2.new_page()
    p2.goto(base + '/register'); p2.fill('#full_name', 'Dr Two'); p2.fill('#email', f'two{email}'); p2.fill('#password', pw); p2.fill('#confirm', pw); p2.fill('#invite_code', invite)
    p2.click('button[type=submit]'); p2.wait_for_url('**/login'); p2.fill('#password', pw); p2.click('button[type=submit]'); p2.wait_for_selector('header')
    p2.goto(child_url); p2.wait_for_selector('h1')
    check('another doctor gets "Child not found"', p2.inner_text('h1') == 'Child not found' and f'a{u}' not in p2.inner_text('body'))
    ctx2.close()

    check('no unexpected console errors', not errors, errors)
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    which = sys.argv[1:] or ['desktop', 'phone']
    if 'desktop' in which: run(b, 'desk', {'width': 1280, 'height': 900}, False)
    if 'phone' in which: run(b, 'phone', {'width': 390, 'height': 844}, True)
    b.close()
print('ALL OK' if not fails else 'FAILURES: ' + '; '.join(fails))
