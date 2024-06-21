const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const userRouter = require('./Routes/User.Route');
const adminRouter = require("./Routes/Admin.route")
const port = process.env.PORT
const URI = process.env.URI

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/', userRouter);
app.use('/', adminRouter);
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
    mongoose.connect(URI)
        .then(() => {
            console.log("Connected to database");
        })
        .catch((err) => {
            console.log(err);
        })
})
