const express = require('express');
const router = express.Router();
const { signUp, signIn, verifyEmail, verifyToken, dashboard, resendVerificationEmail, initFlutterPayment, createReserved, monnifyTransaction, getReservedAccounts,
     profilePix, intraTransfer, getUserToCredit, paymentValidation, changePassword, resetPassword, test } = require('../Controllers/User.controllers');

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/verifyEmail', verifyEmail);
router.get('/verifyToken', verifyToken);
router.get('/dashboard', dashboard);
router.post('/resendVerificationEmail', resendVerificationEmail);
router.post('/flutterwave', initFlutterPayment);
router.post('/monnify', createReserved);
router.post('/monnify/get_account', getReservedAccounts);
router.post('/monnify/confirm', monnifyTransaction);
router.post('/upload', profilePix );
router.post('/intra_transfer', intraTransfer );
router.post('/intra_transfer/get_user', getUserToCredit );
router.post('/intra_transfer/payment_validation', paymentValidation );
router.post('/change-password', changePassword );
router.post('/reset-password', resetPassword );
router.post('/test', test );

module.exports = router;