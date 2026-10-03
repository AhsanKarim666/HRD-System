const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
	getPositions,
	createPosition,
	updatePosition,
	deletePosition,
} = require('../controllers/positionController');

router.get('/', verifyToken, requireRole('HRD', 'Manager'), getPositions);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), createPosition);
router.put('/:id', verifyToken, requireRole('HRD', 'Manager'), updatePosition);
router.delete('/:id', verifyToken, requireRole('HRD', 'Manager'), deletePosition);

module.exports = router;