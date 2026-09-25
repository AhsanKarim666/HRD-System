const express = require('express');
const router = express.Router();
const { getPositions, createPosition } = require('../controllers/positionController');

router.get('/', getPositions);
router.post('/', createPosition);

module.exports = router;