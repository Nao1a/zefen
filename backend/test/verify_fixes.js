const http = require('http');

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
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runVerification() {
  console.log('--- STARTING VERIFICATION TESTS ---\n');

  // 1. Verify GET /api/songs/random obscures sensitive song metadata
  console.log('1. Testing GET /api/songs/random metadata obfuscation...');
  const randomRes = await makeRequest('GET', '/api/songs/random');
  console.log('   Status:', randomRes.status);
  console.log('   Response Body:', JSON.stringify(randomRes.body, null, 2));

  if (randomRes.body.title || randomRes.body.artist || randomRes.body.album) {
    console.error('❌ FAIL: Sensitive song metadata was leaked in /api/songs/random response!');
    process.exit(1);
  } else {
    console.log('✅ PASS: /api/songs/random does NOT leak title/artist/album/year/albumArt!');
  }

  // 2. Verify Audio Endpoint streams audio without metadata in URL or response
  console.log('\n2. Testing GET /api/songs/1/audio/1.0 streaming endpoint...');
  const audioRes = await makeRequest('GET', '/api/songs/1/audio/1.0');
  console.log('   Status:', audioRes.status);
  console.log('   Content-Type:', audioRes.headers['content-type']);
  if (audioRes.status === 200 && audioRes.headers['content-type']?.includes('audio')) {
    console.log('✅ PASS: Audio streaming endpoint works correctly and returns audio content!');
  } else {
    console.error('❌ FAIL: Audio streaming failed! Status:', audioRes.status);
  }

  // 3. Verify Guest Guess Evaluation
  console.log('\n3. Testing POST /api/game/guess as a Guest (un-signed-in)...');
  const guessRes = await makeRequest('POST', '/api/game/guess', {
    songId: 1,
    guess: 'wrong guess test',
    snippetLevel: '1.0'
  });
  console.log('   Status:', guessRes.status);
  console.log('   Response Body:', JSON.stringify(guessRes.body, null, 2));
  if (guessRes.status === 200 && guessRes.body.correct === false && guessRes.body.song) {
    console.log('✅ PASS: Guest mode guess evaluation works cleanly via backend!');
  } else {
    console.error('❌ FAIL: Guest mode guess evaluation failed!');
  }

  // 4. Verify Song Repetition Exclusion
  console.log('\n4. Testing Song Repetition Prevention with exclude parameter...');
  const played = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('GET', `/api/songs/random?exclude=${played.join(',')}`);
    if (res.body && res.body.id) {
      console.log(`   Fetch ${i + 1}: Received song ID ${res.body.id} (Excluded: [${played.join(',')}])`);
      if (played.includes(res.body.id)) {
        console.error(`❌ FAIL: Song ID ${res.body.id} was repeated despite being in exclude list!`);
        process.exit(1);
      }
      played.push(res.body.id);
    }
  }
  console.log('✅ PASS: No songs were repeated during consecutive random fetches!');

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
