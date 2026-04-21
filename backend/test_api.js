const fetch = require('node-fetch');

async function testFetch() {
  const API = 'http://localhost:5000/api';

  // First login to get token
  let token;
  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faculty@test.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('Login success:', !!token);
  } catch (e) { console.error('login err', e); return; }

  // Now fetch /my
  let subId;
  let subData;
  try {
    const myRes = await fetch(`${API}/submissions/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const myData = await myRes.json();
    console.log('/my -> success:', myData.success, 'msg:', myData.message);
    if (!myData.success) return;
    subId = myData.data.id;
    subData = myData.data;
    console.log('subId ->', subId, 'status ->', subData.status, 'form_type ->', subData.form_type);
  } catch (e) { console.error('/my err', e); }

  // Now fetch /:id
  try {
    const detRes = await fetch(`${API}/submissions/${subId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const detData = await detRes.json();
    console.log(`/${subId} -> success:`, detData.success, 'msg:', detData.message, 'keys:', detData.data ? Object.keys(detData.data) : 'none');
  } catch (e) { console.error('/id err', e); }
}

testFetch();
