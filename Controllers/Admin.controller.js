const { userModel, creditTransac, debitTransac } = require("../Models/User.Model");
const { adminUsers, dataPlans, ipWishlists } = require("../Models/Admin.model");
const secretKey = process.env.JWT_SECRET;
const { creditUser, debitUser } = require('../Controllers/User.controllers');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const adminModel = require("../Models/Admin.model");


const newAdmin = (req, res) => {
    const { name, email, role, password } = req.body;
    let hashPassword = bcrypt.hashSync(password, 10);
    const newAdmin = new adminUsers({
        name,
        email,
        role,
        password: hashPassword
    })
    newAdmin.save()
        .then((response) => {
            console.log(response);
            res.status(200).json({ message: "Admin created successfully", response })
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ message: "Admin creation failed", err })
        })
}

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    try {
        let users = await adminUsers.findOne({ email });
        if (users) {
            const comparedPassword = bcrypt.compareSync(password, users.password);
            if (comparedPassword) {
                const token = jwt.sign({ adminId: users._id }, secretKey, { expiresIn: '2h' });
                res.status(200).json({ status: true, message: "Admin logged in successfully", token })
            } else {
                res.status(400).json({ status: false, message: "Invalid credentials" })
            }
        } else {
            res.status(400).json({ status: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: "Internal server error", error })
    }
}

const adminDashboard = async (req, res) => {
    let token = req.headers.authorization.split(" ")[1]
    console.log(token);
    jwt.verify(token, secretKey, (err, result) => {
        if (err) {
            console.log(err);
            res.status(400).send({ status: false, message: "Token is not valid", err })
        }
        else {
            console.log(result);
            adminUsers.findById(result.id)
                .then((admin) => {
                    res.status(200).send({ status: true, message: "Welcome", admin })
                })
        }
    })
}


const addToIpWishlist = async (req, res) => {
    const { ip, email } = req.body;
    let admin = await adminUsers.findOne({ email });
    if (admin) {
        let newIpWishlist = new ipWishlists({
            ip,
            addBy: email
        })
        newIpWishlist.save()
            .then((response) => {
                console.log(response);
                res.status(200).json({ message: "Ip added to wishlist successfully", response })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({ message: "Ip addition failed", err })
            })
    } else {
        res.status(400).json({ message: "Admin not found" })
    }
}

const fetchAllUsers = async (req, res) => {
    try {
        let allUsers = await userModel.find({});
        res.status(200).json({ status: true, message: "All Users", allUsers })
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: "Internal server error", error })
    }
}

const adminCreditUsers = (req, res) => {
    const { userEmail, from, description, amount } = req.body;
    let user = userModel.findOne({ "emailInfo.email": userEmail })
    if (user) {
        creditUser(userEmail, from, description, amount, "From the Admin Desk")
            .then((response) => {
                console.log(response);
                res.status(200).json({ status: true, message: "User Credited successfully", response })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({ status: false, message: "User Crediting failed", err })
            })
    }
    else {
        res.status(400).json({ status: false, message: "User not found" })
    }
}

const adminDebitUsers = (req, res) => {
    const { userEmail, to, description, amount } = req.body;
    let user = userModel.findOne({ "emailInfo.email": userEmail })
    if (user) {
        debitUser(userEmail, to, description, amount, "Debited by the Admin")
            .then((response) => {
                console.log(response);
                res.status(200).json({ status: true, message: "User Debited successfully", response })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({ status: false, message: "User Debit failed", err })
            })
    }
    else {
        res.status(400).json({ status: false, message: "User not found" })
    }
}

const getAllTransactions = async (req, res) => {
    let creditTransactions = await creditTransac.find({})
    let debitTransactions = await debitTransac.find({})
    let allTransactions = []
    let allNewTransactions = allTransactions.concat(creditTransactions, debitTransactions)
    if (creditTransactions && debitTransactions) {
        res.status(200).json({ status: true, allTransactions: allNewTransactions })
    } else {
        res.status(500).json({ status: false, msg: "Am error occurred" })
    }
}

const chartForAllTransactions = async (req, res) => {
    let creditTransactions = await creditTransac.find({});
    let debitTransactions = await debitTransac.find({});
    let allTransactions = []
    let allNewTransactions = allTransactions.concat(creditTransactions, debitTransactions);

    const extractDate = (newDate) => {
        const date = new Date(newDate);
        console.log(date);
        return date.toISOString().split('T')[0];

    }

    const allData = allNewTransactions.reduce((acc, transactions) => {
        const date = extractDate(transactions.date);
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += 1;
        return acc;
    }, {})

    const result = Object.entries(allData).map(date => ({
        date,
        transactionCount: allData[date]
    }));

    if (creditTransactions && debitTransactions) {
        res.status(200).json({ status: true, message: "All Transactions", result })
    } else {
        res.status(400).json({ status: false, message: "No Transactions found" })
    }
}

const addNetworks = (req, res) => {
    const { network_Id, network_Name } = req.body;
    let network = new dataPlans({
        network_Id,
        network_Name,
        dataPlans: []
    })
    network.save()
        .then((response) => {
            console.log(response);
            res.status(200).json({ status: true, message: "Network added successfully", response })
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ status: false, message: "Network adding failed", err })
        })
}

const addDataPlans = (req, res) => {
    const { network_id, server_id, price, validationPeriod, byte } = req.body;
    let newPlan = { server_id, price, validationPeriod, byte }
    let network = dataPlans.findOne({ network_id })
    if (network) {
        let plan = network.dataPlans
        plan.push(newPlan);
        network.save()
            .then((data) => {
                console.log(data);
                res.status(200).json({ status: true, message: "Data Plan added successfully", data })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({ status: false, message: "Data Plan adding failed", err })
            })
    }
}

const getAdminSettings = async (req, res) => {
    let settings = await settings.find({})
    if (settings) {
        res.status(200).json({ status: true, msg: "Admin settings fetched successfully", settings })
    } else {
        res.status(500).json({ status: false, msg: "Server error" })
    }
}

const editAdminSettings = async (req, res) => {
    const { whatToEdit, newValue } = req.body
    let settings = await adminSetting.findById(process.env.ADMIN_SID)
    if (whatToEdit === "airtimePrice") {
        settings.airtimePrice = newValue
        settings.save()
            .then((data) => {
                console.log(data);
                res.status(200).json({ status: true, msg: "Change saved successfully" })
            })
            .catch((error) => {
                console.log(error);
                res.status(400).json({ status: false, msg: "an error occurred", error })
            })
    } else if (whatToEdit === "monnifyFee") {
        settings.monnifyTransactionFee = newValue
        settings.save()
            .then((data) => {
                console.log(data);
                res.status(200).json({ status: true, msg: "Change saved successfully" })
            })
            .catch((error) => {
                console.log(error);
                res.status(400).json({ status: false, msg: "an error occurred", error })
            })
    } else if (whatToEdit === "intraFee") {
        settings.intraTransferFee = newValue
        settings.save()
            .then((data) => {
                console.log(data);
                res.status(200).json({ status: true, msg: "Change saved successfully" })
            })
            .catch((error) => {
                console.log(error);
                res.status(400).json({ status: false, msg: "an error occurred", error })
            })
    }
}

const getDataPlan = async (req, res) => {
    let plans = await dataPlans.find({})
    if (plans) {
        console.log(plans)
        res.status(200).json({ status: true, msg: "Data plan fetched", data: plans })
    } else {
        res.status(500).json({ status: false, msg: "Server error" })
    }
}

const text = (req, res) => {
    let gb = new adminSetting({})
    gb.save()
        .then((ee) => {
            console.log("Saved");
        })
}

const verifyIp = async (req, res) => {
    let ipAddress = req.ip
    console.log(ipAddress);
    let verifyIp = await ipWishList.findOne({ ip: ipAddress })
    if (verifyIp) {
        res.status(200).json({ status: true, msg: "Ip address verified" })
    } else {
        res.status(400).json({ status: false, msg: "Ip address not allowed" })
    }

}

const searchTransac = async (req, res) => {
    const { transactionId } = req.body
    let debitTransactio = await debitTransaction.findOne({ transactionId })
    let creditTransactio = await creditTransaction.findOne({ transactionId })
    if (debitTransactio) {
        res.status(200).json({ msg: "success", transactionDetail: debitTransactio, transactionType: "Debit" })
    } else if (creditTransactio) {
        res.status(200).json({ msg: "success", transactionDetail: creditTransactio, transactionType: "Credit" })
    } else {
        res.status(400).json({ msg: "No transaction found!" })
    }
}

module.exports = {
    newAdmin, loginAdmin, adminDashboard, addToIpWishlist, fetchAllUsers, adminCreditUsers, adminDebitUsers, getAllTransactions, chartForAllTransactions, addNetworks, addDataPlans, getAdminSettings, editAdminSettings, getDataPlan, verifyIp, searchTransac
}