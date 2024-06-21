const express = require('express');
const router = express.Router();
const { newAdmin, loginAdmin, adminDashboard, addToIpWishlist, fetchAllUsers, adminCreditUsers, adminDebitUsers, chartForAllTransactions, getAllTransactions, addNetworks, addDataPlans, getAdminSettings, editAdminSettings, getDataPlan, verifyIp, searchTransac } = require('../Controllers/Admin.controller');

router.post('/add-user', newAdmin);
router.post('/login-user', loginAdmin);
router.get('/admin_dashboard', adminDashboard);
router.post('/add-to-ipWishlist', addToIpWishlist);
router.get('/fetch-users', fetchAllUsers);
router.post('/admin-creditUsers', adminCreditUsers);
router.post('/admin-debitUsers', adminDebitUsers);
router.get('/get-allTransactions', getAllTransactions);
router.get('/chart-transactions', chartForAllTransactions);
router.post('/add-networks', addNetworks);
router.post('/add-dataPlans', addDataPlans);
router.get('/admin-settings', getAdminSettings);
router.post('/edit-adminSettings', editAdminSettings);
router.get('/get-dataPlan', getDataPlan);
router.get('/verify-ip', verifyIp);
router.post("/search-transac", searchTransac)

module.exports = router;