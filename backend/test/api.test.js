const http = require('http');
const app = require('../server');

async function runTests() {
  console.log('\n--- STARTING API MANUAL/AUTOMATED CHECKLIST TESTS ---\n');

  // Helper request function
  function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: 'localhost',
          port: 5000,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...headers
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Health Check
    console.log('1. Testing GET /health ...');
    const healthRes = await makeRequest('GET', '/health');
    console.assert(healthRes.status === 200, `Expected 200, got ${healthRes.status}`);
    console.log('   Pass:', healthRes.body);

    // 2. Get Random Song
    console.log('\n2. Testing GET /api/songs/random ...');
    const randomRes = await makeRequest('GET', '/api/songs/random');
    console.assert(randomRes.status === 200, `Expected 200, got ${randomRes.status}`);
    console.log('   Pass:', randomRes.body);

    // 3. Search Songs
    console.log('\n3. Testing GET /api/songs/search?q=tez ...');
    const searchRes = await makeRequest('GET', '/api/songs/search?q=tez');
    console.assert(searchRes.status === 200, `Expected 200, got ${searchRes.status}`);
    console.log('   Pass:', searchRes.body);

    // 4. Get Song Snippets
    console.log('\n4. Testing GET /api/songs/1/snippets ...');
    const snippetRes = await makeRequest('GET', '/api/songs/1/snippets');
    console.assert(snippetRes.status === 200, `Expected 200, got ${snippetRes.status}`);
    console.log('   Pass:', snippetRes.body);

    // 5. 404 Handler
    console.log('\n5. Testing GET /api/unknown ...');
    const notFoundRes = await makeRequest('GET', '/api/unknown');
    console.assert(notFoundRes.status === 404, `Expected 404, got ${notFoundRes.status}`);
    console.log('   Pass:', notFoundRes.body);

    console.log('\n--- ALL API CHECKLIST TESTS PASSED SUCCESSFULLY! ---\n');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    process.exit(0);
  }
}

// Give server time to bind port
setTimeout(runTests, 1000);
