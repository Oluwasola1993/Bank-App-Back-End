const mongoose = require('mongoose');

adminUsers = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: String,
        password: { type: String, required: true },
    }
)

dataPlans = new mongoose.Schema(
    {
        network_Id: String,
        network_Name: String,
        dataPlans: []
    }
)

settings = new mongoose.Schema(
    {
        airtimePrice: { type: Number, default: 0 },
        monnifyTransactionFee: { type: Number, default: 0 },
        intraTransferFee: { type: Number, default: 0 }
    }
)

ipWishlists = new mongoose.Schema(
    {
        ip: { type: String, required: true },
        addBy: { type: String, required: true },
    }
)

module.exports = {
    adminUsers: mongoose.model('adminUsers', adminUsers),
    dataPlans: mongoose.model('dataPlans', dataPlans),
    ipWishlists: mongoose.model('ipWishlists', ipWishlists),
    adminSettings: mongoose.model('adminSettings', settings),
}