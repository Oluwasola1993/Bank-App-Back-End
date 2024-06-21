const mongoose = require('mongoose');

userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    accountBalance: { type: Number, default: 0 },
    emailInfo: {
        email: { type: String, required: true, unique: true },
        verified: { type: Boolean, default: false },
        emailVerificationCode: { type: String, required: true },
    },
    accountNo: { type: Number, required: true, unique: true },
    phone: {
        phoneNo: { type: String, required: true, unique: true },
        verified: { type: Boolean, default: false },
        phoneVerificationCode: { type: String, required: true },
    },
    password: { type: String, minlength: 6, required: true },
    profile_url: { type: String, default: 'unset' }
},
    {
        strict: false
    }
)

reservedAccount = new mongoose.Schema({
    userEmail: { type: String, required: true },
    accountReference: { type: String, required: true, unique: true },
    accounts: [
        {
            bankCode: String,
            bankName: String,
            accountName: String,
            accountNumber: String
        },
        {
            bankCode: String,
            bankName: String,
            accountName: String,
            accountNumber: String
        }
    ]
})

creditTransac = new mongoose.Schema({
    email: { type: String, required: true },
    from: { type: String, required: true },
    description: { type: String, default: 'Credit' },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true },
    balanceAfterTransaction: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    date: { type: String, required: true }
});

debitTransac = new mongoose.Schema({
    email: { type: String, required: true },
    to: { type: String, required: true },
    description: { type: String, default: 'Debit' },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true },
    balanceAfterTransaction: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    date: { type: String, required: true }
});


module.exports = {
    userModel: mongoose.model('user', userSchema),
    reservedAccount: mongoose.model('reservedAccount', reservedAccount),
    creditTransac: mongoose.model('creditTransaction', creditTransac),
    debitTransac: mongoose.model('debitTransaction', debitTransac)
};