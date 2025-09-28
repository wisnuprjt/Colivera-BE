const bcrypt = require('bcrypt');

(async () => {
  const pwd = process.argv[2];
  if (!pwd) {
    console.log('Usage: node tools/hash.js <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(pwd, 10);
  console.log('Password:', pwd);
  console.log('Hash:', hash);
})();
