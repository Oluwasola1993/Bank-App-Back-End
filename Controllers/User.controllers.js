const { userModel, reservedAccount, creditTransac, debitTransac } = require("../Models/User.Model");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const secretKey = process.env.JWT_SECRET
// const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
const { Buffer } = require("buffer");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const genCode = () => {
    let text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let txtRandom = "";
    for (let i = 0; i < 11; i++) {
        txtRandom += text.charAt(Math.floor(Math.random() * text.length));
    }
    return txtRandom;
};

const signUp = (req, res) => {
    const { firstName, lastName, email, phoneNo, password } = req.body;

    let acctNo = Math.floor(1000000000 + Math.random() * 9000000000);
    let phneNoVerification = Math.floor(100000 + Math.random() * 90000);
    let emailVerificationCode = genCode();
    let emailToSend = email
    console.log(firstName, lastName, email, phoneNo, password);

    let hashPassword = bcrypt.hashSync(password, 10)
    console.log(hashPassword);
    let user = new userModel({
        firstName,
        lastName,
        emailInfo: {
            email,
            emailVerificationCode
        },
        accountNo: acctNo,
        phone: {
            phoneNo,
            phoneVerified: false,
            phoneVerificationCode: phneNoVerification,
        },
        password: hashPassword,
    })
    user.save()
        .then((response) => {
            console.log(emailToSend);
            verifyEmail(emailToSend);
            console.log("User Created");
            res.status(200).json({
                message: "User Created",
                data: response
            });
        })
        .catch((error) => {
            console.log(error);
            if (error) {
                res.status(400).json({
                    message: "Duplicate email or phone number",
                    error: error
                });
            }
        });
}

const verifyEmail = async (theEmail) => {
    try {
        let user = await userModel.findOne({ "emailInfo.email": theEmail });
        if (user) {
            const verifyToken = user.emailInfo.emailVerificationCode;
            const toEmail = user.emailInfo.email;

            // Create the verification URL with the token
            const verificationURL = `http://localhost:3000/verifyToken?token=${verifyToken}`;

            // Send the email with the verification link
            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true, // Use SSL/TLS
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: process.env.EMAIL,
                to: toEmail,
                subject: 'Email Verification',
                html: `
                    <p>Click the link below to verify your email account:</p>
                    <a href="${verificationURL}">Verify Email</a>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            // Return success message or status
            return { message: 'Verification email sent successfully.' };
        } else {
            throw new Error('User not found');
        }
    } catch (error) {
        console.log('Error verifying email:', error);
        throw new Error('An error occurred while verifying email.');
    }
};

const verifyToken = async (req, res) => {
    const { token } = req.query;

    try {
        let user = await userModel.findOne({ "emailInfo.emailVerificationCode": token });

        if (!user) {
            return res.status(404).json({
                message: "Invalid verification token"
            });
        }

        user.emailInfo.verified = true;

        await user.save();

        console.log('Email verified successfully');
        return res.status(200).json({
            message: "Email verified successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            data: error
        });
    }
};

const resendVerificationEmail = async (req, res) => {
    const { theEmail } = req.body;
    try {
        let user = await userModel.findOne({ "emailInfo.email": theEmail });

        if (user) {
            const verifyToken = user.emailInfo.emailVerificationCode;
            const toEmail = user.emailInfo.email;

            await verifyEmail(toEmail);

            console.log('Verification email resent successfully');
            return { status: 200, message: "Verification email resent successfully" };
        } else {
            return { status: 404, message: "User not found" }
        }

    } catch (error) {
        console.error('Error resending verification email:', error);
        return { status: 500, message: "Internal server error" };
    }
};


const signIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await userModel.findOne({ "emailInfo.email": email });

        if (!user) {
            return res.status(400).json({ Message: "User not found. Please sign up" });
        }

        const correctPassword = bcrypt.compareSync(password, user.password);
        if (!correctPassword) {
            return res.status(400).json({ Message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: "1d" });
        res.status(200).json({
            Message: "Login successful",
            token: token,
            user: user
        });
    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).json({ Message: "Internal server error" });
    }
};

const dashboard = async (req, res) => {
    let token = req.headers.authorization.split(" ")[1]
    console.log(token);
    jwt.verify(token, secretKey, (err, result) => {
        if (err) {
            console.log(err);
            res.status(400).send({ status: false, message: "Token is not valid", err })
        }
        else {
            console.log(result);
            userModel.findById(result.id)
                .then((user) => {
                    res.status(200).send({ status: true, message: "Welcome", user })

                })
        }
    })
}

const createReserved = async (req, res) => {
    const { accountReference, accountName, customerEmail, bvn, customerName } = req.body;
    const authKey = await getMonnifyToken()
    const url = "https://sandbox.monnify.com/api/v2/bank-transfer/reserved-accounts"
    const data = {
        accountReference,
        accountName,
        currencyCode: "NGN",
        contractCode: "7282367498",
        customerEmail,
        customerName,
        bvn,
        getAllAvailableBanks: true
    }
    const check = await reservedAccount.findOne({ userEmail: customerEmail })
    if (check) {
        res.status(400).json({
            message: "Account already exists",
            data: check
        })
    } else {
        axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authKey}`
            }
        })
            .then(response => {
                console.log(response.data.responseBody.accounts);
                const accountGotten = response.data.responseBody.accounts
                let account = new reservedAccount({
                    userEmail: customerEmail,
                    accountReference,
                    accounts: accountGotten
                })
                account.save()
                    .then((acc) => {
                        console.log(acc)
                        res.status(200).json({ status: "success", msg: "Account created successfully", data: acc })
                    })
                    .catch((error) => {
                        console.log(error)
                    })
            })
            .catch(err => {
                console.log(err);
            })
    }
}

const monnifyTransaction = async (req, res) => {
    console.log(req.body)
    const customerEmail = req.body.eventData.customer.email
    const amountPaid = req.body.eventData.amountPaid
    const paymentStatus = req.body.eventData.paymentStatus
    const eventType = req.body.eventType
    if (eventType === "SUCCESSFUL_TRANSACTION" && paymentStatus === "PAID") {
        console.log(customerEmail, eventType, amountPaid, paymentStatus);
        const amountToCredit = Number(amountPaid) - 50
        console.log(amountToCredit);
        let user = await userModel.findOne({ 'emailInfo.email': customerEmail })
        if (user) {
            let accountbal = Number(user.accountBalance)
            let newBalance = accountbal + amountToCredit
            user.accountBalance = newBalance
            user.save()
                .then((data) => {
                    console.log(data)
                })
                .catch((err) => {
                    console.log(err);
                })
        } else {

        }
    }

}

const getReservedAccounts = async (req, res) => {
    const { userEmail } = req.body;
    const account = await reservedAccount.findOne({ userEmail })
    if (account) {
        res.status(200).json({
            message: "Account found",
            data: account
        })
    } else {
        res.status(400).json({
            status: false,
            message: "No reserved account created"
        })
    }
}

const getMonnifyToken = () => {
    return new Promise((resolve, reject) => {
        const apiUrl = "https://sandbox.monnify.com/api/v1/auth/login"
        const requestData = {}
        const apiKey = process.env.MFI_KEY
        const clientSecret = process.env.MFI_SECRET
        const authString = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');
        const authHeader = `Basic ${authString}`

        axios.post(apiUrl, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        })
            .then((response) => {
                const authKey = response.data.responseBody.accessToken
                resolve(authKey)
            })
            .catch((error) => {
                console.log(error);
                reject(error)
            })
    })
}

const initFlutterPayment = (req, res) => {
    const url = 'https://api.flutterwave.com/v3/payments'
    let data = {
        tx_ref: "hooli-tx-1920bbtytty0",
        amount: "100",
        currency: "NGN",
        redirect_url: "http://localhost:5174/dashboard/flutter_payment",
        customer: {
            email: "user@gmail.com",
            phonenumber: "080****4528",
            name: "Yemi Desola"
        },
        customizations: {
            title: "Pied Piper Payments",
            logo: "http://www.piedpiper.com/app/themes/joystick-v27/images/logo.png"
        }
    }
    axios.post(url, data, {
        headers: {
            'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`
        }
    })
        .then((response) => {
            console.log(response.data)
            res.status(200).json({
                message: "Payment initialized",
                paymentLink: response.data.data.link
            })
        })
        .catch((error) => {
            console.log(error)
        })
}

const profilePix = async (req, res) => {
    let file = req.body.userFile;
    let email = req.body.email;

    cloudinary.uploader.upload(file, (error, result) => {
        if (result) {
            console.log(result);
            userModel.findOne({ 'emailInfo.email': email })
                .then((user) => {
                    user.profile_url = result.url;
                    user.save()
                        .then((data) => {
                            console.log(data);
                            res.status(200).json({ message: "File uploaded successfully", result, data })
                        })
                })

        }
        else {
            console.log(error);
            res.status(400).json({ message: "File upload failed", result })
        }
    })
}

const intraTransfer = async (req, res) => {
    const { senderEmail, receiver, amount, description } = req.body
    let sender = await userModel.findOne({ 'emailInfo.email': senderEmail })
    if (sender) {
        let userBalance = sender.accountBalance
        let amountDebit = Number(amount) + 20
        if (userBalance >= amountDebit) {
            debitUser(senderEmail, receiver, description, amountDebit)
                .then((debit) => {
                    creditUser(receiver, `${sender.firstName} ${sender.lastName}`, description, amount)
                        .then((credit) => {
                            console.log(credit);
                            res.status(200).json({ msg: "Transfer successful", debit, credit })
                        })
                        .catch((err) => {
                            console.log(err);
                            res.status(500).json({ msg: "An error occured credit", err })
                        })
                })
                .catch((err) => {
                    res.status(500).json({ msg: "An error occured debit", err })
                })
        } else {
            res.status(400).json({ msg: "Insufficient balance" })
        }
    }
}

const notifyUser = (email, subject, html) => {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL/TLS
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });


        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: subject,
            html: html
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                reject(error)
            } else {
                console.log('Email sent: ' + info.response);
                resolve(info.response)
            }
        });
    })
}

const getUserToCredit = async (req, res) => {
    console.log(req.body)
    let email = req.body.email;
    let user = await userModel.findOne({ 'emailInfo.email': email })
    if (user) {
        res.status(200).json({ msg: "User found", user })
    } else {
        res.status(400).json({ msg: "No user found!" })
    }
}

const paymentValidation = async (req, res) => {
    const { email, amount } = req.body;
    let user = await userModel.findOne({ 'emailInfo.email': email })
    if (user) {
        let userBalance = user.accountBalance
        let amountDebit = Number(amount) + 20
        if (userBalance >= amountDebit) {
            res.status(200).json({ msg: "valid", userBalance, amountDebit })
        } else {
            res.status(400).json({ msg: "Insufficient balance" })
        }
    } else {
        res.status(400).json({ msg: "User not found" })
    }
}

const test = async (req, res) => {
    try {
        let result = await saveDebitHistory("ojooluwasola7@gmail.com", "Temitope Ajulo", "Intra_transfer", 5000);
        res.send(result);
    } catch (error) {
        res.status(500).send(error);
    }
}

const saveCreditHistory = async (email, from, description, amountCred) => {
    let user = await userModel.findOne({ 'emailInfo.email': email })
    return new Promise((resolve, reject) => {
        if (user) {
            let genNumber = ""
            const randomNum = '1234567890'
            for (let index = 0; index < 17; index++) {
                genNumber += randomNum.charAt(Math.floor(Math.random() * randomNum.length));
            }
            const date = new Date()
            const hours = date.getHours()
            const minutes = date.getMinutes()
            // let period = ""
            // if (hours >= 12) {
            //     period = "PM"
            // } else {
            //     period = "AM"
            // }

            // const Time = `${hours}:${minutes} ${period}`
            const transactionId = `SOLCEMAN_${hours}:${minutes}_${genNumber}`
            const amount = amountCred
            const newBalance = user.accountBalance

            let transaction = new creditTransac({
                email,
                from,
                description,
                amount,
                transactionId,
                balanceAfterTransaction: newBalance,
                status: 'Completed',
                date
            })
            transaction.save()
                .then((res) => {
                    console.log(res);
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err)
                })
        } else {
            reject("User not found")
        }
    })
}

const saveDebitHistory = async (email, to, description, amountDebited) => {
    let user = await userModel.findOne({ 'emailInfo.email': email })
    return new Promise((resolve, reject) => {
        if (user) {
            let genNumber = ""
            const randomNum = '1234567890'
            for (let index = 0; index < 17; index++) {
                genNumber += randomNum.charAt(Math.floor(Math.random() * randomNum.length));
            }
            const date = new Date()
            const hours = date.getHours()
            const minutes = date.getMinutes()
            let period = ""
            // if (hours >= 12) {
            //     period = "PM"
            // } else {
            //     period = "AM"
            // }

            // const Time = `${hours}:${minutes} ${period}`
            const transactionId = `SOLCEMAN_${hours}:${minutes}_${genNumber}`
            const amount = amountDebited
            const newBalance = user.accountBalance

            let transaction = new debitTransac({
                email,
                to,
                description,
                amount,
                transactionId,
                balanceAfterTransaction: newBalance,
                status: 'Completed',
                date
            })
            transaction.save()
                .then((res) => {
                    console.log(res);
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err)
                })
        } else {
            reject("User not found")
        }
    })
}

const creditHtml = (amount) => {
    let html = `<body style="font-family: sans-serif;">
    <div style="color: white; 
    background-color: rgb(213, 201, 245); 
    height: 5rem; 
    font-weight: bold; 
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    ">
        New Transaction alert
    </div>
    <div style="display: flex; 
    justify-content: center;
    flex-direction: column; 
    align-items: center;
    background-color: rgb(201, 210, 223);
    height: 60vh;
    font-family: poppins;
    font-size: 1.8rem;">
        <div>
            <p style="text-align: center;">${amount}</p>
            <p style="text-align: center;">Credited</p>
        </div>
    </div>
    <div style="color: white; 
    background-color: rgb(213, 201, 245); 
    height: 5rem; 
    font-weight: bold; 
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: poppins;
    font-size: 1.5rem;
    ">
        © Solceman Bank
    </div>
</body>`
    return html
}

const creditUser = async (email, from, description, amount) => {
    let user = await userModel.findOne({ 'emailInfo.email': email })
    return new Promise((resolve, reject) => {
        if (user) {
            let balance = user.accountBalance
            let newBalance = Number(balance) + Number(amount)
            user.accountBalance = newBalance;
            user.save()
                .then((data) => {
                    const text = `<h1>Your account has been credited with ${amount}</h1>`
                    notifyUser(email, "Account credited", creditHtml(amount))
                    saveCreditHistory(email, from, description, amount)
                    resolve({ msg: "Credited" })
                })
                .catch((err) => {
                    reject({ msg: "An error occured", err })
                })
        } else {
            reject({ msg: "user not found" })
        }
    })
}

const debitUser = async (email, to, description, amount) => {
    let user = await userModel.findOne({ "emailInfo.email": email })
    return new Promise((resolve, reject) => {
        if (user) {
            let balance = user.accountBalance
            let newBalance = Number(balance) - Number(amount)
            user.accountBalance = newBalance;
            user.save()
                .then((data) => {
                    const text = `<h1>Your account has been debited with ${amount}</h1>`
                    notifyUser(email, "Account debited", text)
                    saveDebitHistory(email, to, description, amount)
                    resolve({ msg: "Debited" })
                })
                .catch((err) => {
                    reject({ msg: "An error occured", err })
                    console.log(err);
                })
        } else {
            reject({ msg: "user not found" })
        }
    })
}

const changePassword = (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    userModel.findOne({ "emailInfo.email": email })
        .then((user) => {
            const comparedPassword = bcrypt.compareSync(oldPassword, user.password);
            const comparedNewPassword = bcrypt.compareSync(newPassword, user.password);
            if (comparedNewPassword) {
                res.status(400).json({ msg: "New password is same as old password", status: false })
            } else if (comparedPassword) {
                const hashedPassword = bcrypt.hashSync(newPassword, 10)
                user.password = hashedPassword
                user.save()
                    .then((newUser) => {
                        res.status(200).json({ msg: "Password Changed successfully", newUser, status: true })
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            } else {
                res.status(400).json({ msg: "Incorrect password", status: false })
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(400).json({ msg: "User does not exist", status: false })
        })
}

const genPasswordFormat = () => {
    let randomSm = "abcdefghijklmnopqrstuvwxyz"
    let randomSmall = ""
    for (let index = 1; index <= 3; index++) {
        randomSmall += randomSm.charAt(Math.floor(Math.random() * randomSm.length));
    }

    let randomCap = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let randomCapital = ""
    for (let index = 1; index <= 2; index++) {
        randomCapital += randomCap.charAt(Math.floor(Math.random() * randomCap.length))
    }

    let randomNum = "0123456789"
    let randomNumber = ""
    for (let index = 1; index <= 2; index++) {
        randomNumber += randomNum.charAt(Math.floor(Math.random() * randomNum.length))
    }

    let randomSpec = "!@#$%^&*()?:{}"
    let randomSpecial = ""
    for (let index = 1; index <= 1; index++) {
        randomSpecial += randomSpec.charAt(Math.floor(Math.random() * randomSpec.length))
    }

    let randomText = `${randomCapital}${randomSmall}${randomNumber}${randomSpecial}`

    return (randomText)
}

const resetPassword = (req, res) => {
    const { email } = req.body;
    try {
        userModel.findOne({ "emailInfo.email": email })
            .then((user) => {
                if (user) {
                    let newPassword = genPasswordFormat();
                    console.log(newPassword);
                    let hashedNewPassword = bcrypt.hashSync(newPassword, 10)
                    user.password = hashedNewPassword
                    user.save()
                        .then((data) => {
                            const html = `<h2 color='purple'>your new password is: ${newPassword}</h2>`
                            notifyUser(email, "Password Reset", html)
                                .then((mailMsg) => {
                                    res.status(200).json({ msg: "New password sent successfully", mailMsg })
                                })
                                .catch((mailMsgErr) => {
                                    res.status(500).json({ msg: "Error sending new password", mailMsgErr })
                                })
                        })
                } else {
                    res.status(500).json({ mgs: "User not found" })
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(400).json({ msg: "User not found", err })
            })
    }
    catch (error) {
        console.log(error);
    }
}


module.exports = {
    signUp, signIn, verifyEmail, verifyToken, dashboard, resendVerificationEmail, initFlutterPayment, createReserved, monnifyTransaction, getReservedAccounts, profilePix, intraTransfer, getUserToCredit, paymentValidation, changePassword, resetPassword, test
};
