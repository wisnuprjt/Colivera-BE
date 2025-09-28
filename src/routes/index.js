const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Colivera API ready' });
});

module.exports = router;
