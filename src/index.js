const express = require("express");
const chalk = require("chalk");
require("./db/mongoose");

const userRouter = require("./routers/user");
const taskRouter = require("./routers/task");

const port = process.env.PORT

const app = express();

app.use((req,res,next)=>{
    // res.status(501).send("db is under maintance!")
    next();

})

// 把incoming body data parse成一个object
app.use(express.json());

/* Register the user router with express application*/
app.use(userRouter);
/* Register the task router with express application*/
app.use(taskRouter);

app.listen(port, () => {
	console.log(chalk.bold.green.inverse("Connected to server!", port));
});
