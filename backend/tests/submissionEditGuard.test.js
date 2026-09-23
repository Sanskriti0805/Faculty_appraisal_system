const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sessionAccess = require('../utils/sessionAccess');

function fixture(options = {}) {
  const queries = [];
  const session = {
    academic_year: '2099-00', status: 'open', is_released: 1,
    final_locked: 0, deadline: '2099-12-31', ...options.session
  };
  const db = {
    async query(sql) {
      queries.push(sql);
      // Model a production runtime account that cannot change the schema.
      if (/\b(CREATE|ALTER|DROP)\b/i.test(sql)) {
        throw Object.assign(new Error('DDL denied'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
      }
      if (options.error) throw options.error;
      if (sql.includes('SELECT final_locked')) {
        if (options.missingLockColumn) {
          throw Object.assign(new Error('Missing final_locked'), { code: 'ER_BAD_FIELD_ERROR' });
        }
        return [[]];
      }
      if (sql.includes('FROM appraisal_sessions')) return [options.noSession ? [] : [session]];
      if (sql.includes('FROM submissions')) return [options.submission ? [options.submission] : []];
      if (sql.includes('FROM edit_requests')) return [options.approvals || []];
      if (sql.includes('FROM dynamic_fields')) return [[{ section_id: 17 }]];
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  const context = {
    module: { exports: {} },
    require(name) {
      if (name === '../config/database') return db;
      if (name === '../utils/sessionAccess') return sessionAccess;
      throw new Error(`Unexpected import: ${name}`);
    },
    console: { error() {} }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/submissionEditGuard.js'), 'utf8'), context);
  async function run({ section = 'courses_taught', user = { id: 7, role: 'faculty' }, dynamic = false, body = {} } = {}) {
    const req = { user, body };
    const result = { next: false, status: 200, req };
    const res = {
      status(value) { result.status = value; return this; },
      json(value) { result.body = value; return this; }
    };
    const middleware = dynamic
      ? context.module.exports.requireDynamicResponseEditAccess()
      : context.module.exports.requireSectionEditAccess(section);
    await middleware(req, res, () => { result.next = true; });
    return result;
  }
  return { run, queries };
}

test('initial and draft saves work with no schema modification privileges', async () => {
  for (const submission of [null, { id: 2, status: 'draft', locked: 0 }]) {
    const f = fixture({ submission });
    const result = await f.run({ body: { faculty_id: 999 } });
    assert.equal(result.next, true);
    assert.equal(result.req.body.faculty_id, 7);
    assert.ok(f.queries.every(sql => !/\b(CREATE|ALTER|DROP)\b/i.test(sql)));
  }
});

test('unauthenticated and non-faculty checks do not modify or query schema', async () => {
  const f = fixture();
  assert.equal((await f.run({ user: null })).status, 401);
  assert.equal((await f.run({ user: { id: 8, role: 'Dofa' } })).next, true);
  assert.equal(f.queries.length, 0);
});

for (const [name, options, code] of [
  ['no active session', { noSession: true }, 'NO_ACTIVE_SESSION'],
  ['final lock', { session: { final_locked: 1 } }, 'SESSION_FINAL_LOCKED'],
  ['closed session', { session: { status: 'closed' } }, 'SESSION_CLOSED'],
  ['unreleased session', { session: { is_released: 0 } }, 'SESSION_NOT_RELEASED'],
  ['expired deadline', { session: { deadline: '2000-01-01' } }, 'SUBMISSION_DEADLINE_PASSED'],
  ['locked draft', { submission: { id: 2, status: 'draft', locked: 1 } }, 'SUBMISSION_LOCKED'],
  ['submitted form', { submission: { id: 2, status: 'submitted', locked: 0 } }, 'SUBMISSION_LOCKED']
]) {
  test(`${name} still blocks saves`, async () => {
    const result = await fixture(options).run();
    assert.equal(result.next, false);
    assert.equal(result.body.code, code);
  });
}

test('returned submissions respect approved sections, groups, and Part B', async () => {
  const submission = { id: 2, status: 'sent_back', locked: 0 };
  assert.equal((await fixture({ submission }).run()).next, true);
  const restricted = fixture({ submission, approvals: [{ approved_sections: '["research_publications"]' }] });
  assert.equal((await restricted.run()).body.code, 'SECTION_LOCKED');
  assert.equal((await restricted.run({ section: 'research_publications' })).next, true);
  assert.equal((await restricted.run({ section: 'part_b' })).next, true);
  const group = fixture({ submission, approvals: [{ approved_sections: '["teaching_learning"]' }] });
  assert.equal((await group.run()).next, true);
});

test('missing lock column fails closed, even when SELECT * could return a session', async () => {
  const result = await fixture({ missingLockColumn: true }).run();
  assert.equal(result.next, false);
  assert.equal(result.status, 500);
  assert.equal(result.body.code, 'EDIT_PERMISSION_SCHEMA_MISSING');
});

test('database failures remain blocked and do not expose SQL to faculty', async () => {
  for (const code of ['ER_NO_SUCH_TABLE', 'ER_TABLEACCESS_DENIED_ERROR', 'ECONNREFUSED']) {
    const error = Object.assign(new Error('private SQL details'), { code });
    const result = await fixture({ error }).run();
    assert.equal(result.next, false);
    assert.equal(result.status, 500);
    assert.ok(!result.body.message.includes('private SQL details'));
  }
});

test('dynamic sections use the same restrictions without DDL', async () => {
  const input = { dynamic: true, body: { responses: [{ field_id: 123 }] } };
  assert.equal((await fixture().run(input)).next, true);
  const blocked = fixture({
    submission: { id: 2, status: 'sent_back', locked: 0 },
    approvals: [{ approved_sections: '["courses_taught"]' }]
  });
  assert.equal((await blocked.run(input)).body.code, 'SECTION_LOCKED');
  assert.equal((await fixture({ missingLockColumn: true }).run(input)).body.code, 'EDIT_PERMISSION_SCHEMA_MISSING');
});
