const express = require("express");
const User = require("../models/user");
const chalk = require("chalk");
const sharp = require("sharp");
const multer = require("multer");
const { sendWelcomeEmail, sendLeaveEmail } = require("../emails/account");
const auth = require("../middleware/auth");
/* Create the new router */

const router = new express.Router();

/* Set up the router */

// Creation endpoint for user
router.post("/users", async (req, res) => {
	const user = new User(req.body);

	// 使用async和await语法改写
	try {
		// try语句, 如果save()到数据库成功
		await user.save();
		// send new user an welcome email
		await sendWelcomeEmail(user.email, user.name);
		// Generate the token
		const token = await user.generateAuthToken();
		// 运转顺利，status code变为201，然后send back新的document至屏幕中
		res.status(201).send({ user, token });
	} catch (error) {
		res.status(400).send(error.message);
	}
});

// User Login endpoint, if going well, return that user
router.post("/users/login", async (req, res) => {
	try {
		const user = await User.finfByCredentials(
			req.body.email,
			req.body.password
		);
		console.log(chalk.bgGreen("Log in successfully!"));
		const token = await user.generateAuthToken();
		res.send({ user, token });
	} catch (error) {
		res.status(400).send("Unable to login");
	}
});

// User logout endpoint, delete the token from token array
router.post("/users/logout", auth, async (req, res) => {
	try {
		req.user.tokens = req.user.tokens.filter(
			token => token.token !== req.token
		);
		// Save user to db
		await req.user.save();
		res.status(200).send("Sign out successfully!");
	} catch (error) {
		res.status(500).send();
	}
});

// Logout all sessions for the user (delete all tokens from token array)
router.post("/users/logoutAll", auth, async (req, res) => {
	try {
		const user = req.user;
		user.tokens = [];
		await user.save();
		res.send("Sign out all sessions successfully!");
	} catch (error) {
		res.status(500).send();
	}
});

// Read specific user who is logging in abd being verified
// 设置一个针对于此route的middleware function
router.get("/users/me", auth, async (req, res) => {
	console.log("hello");
	console.log(req.user);
	res.send(req.user);
});

// 老版本
router.get("/users", async (req, res) => {
	try {
		// User.find() 返回 promise, 所以用await处理
		const users = await User.find({});
		res.send(users);
	} catch (error) {
		res.status(500).send(error);
	}
});

// Read a specific user by id  不再需要，不能允许user通过输入其他用户的id而获取到其他用户的信息
/* router.get("/users/:id", async (req, res) => {
	// 提取route中的id
	const _id = req.params.id;
	// match语句用于确保如果查找的id长度与ObjectID(24位)不同,即使id并不存在也走if block
	// 如果长度不一致走else blcok, 达到课程中返回404 status code的结果
	if (_id.match(/^[0-9a-fA-F]{24}$/)) {
		try {
			const user = await User.findById(_id);
			if (!user) {
				return res
					.status(404)
					.send(`Can not find valid user of id ${_id}`);
			}

			res.send(user);
		} catch (error) {
			res.status(500).send(error);
		}
	} else {
		res.status(404).send(`Can not find valid user of id ${_id}`);
	}
}); */

// Update user's property
router.patch("/users/me", auth, async (req, res) => {
	// 去检查body中要升级的属性是否在允许的范围内
	// 此为附加操作，即使不检查也不会报错，只是希望给用户提供更多的信息
	const allowedUpdates = ["email", "password", "age", "name"];
	const updateProperties = Object.keys(req.body);
	const isValid = updateProperties.every(singleProperty =>
		allowedUpdates.includes(singleProperty)
	);
	if (!isValid) {
		return res.status(400).send("Can not update NON-existent property!");
	}

	try {
		/*       由于要使用middleware进行hash password, 而下面的语法是直接在database上操作的, 并没有经过mongoose, 
        所以需要用更传统的方法(.save() method)以便于使用middleware
		const user = await User.findByIdAndUpdate(_id, req.body, {
			// 这样返回给'user'的就是update之后的object
			new: true,
			// 'runValidators': false by default. Set to true to enable update validators for all validators by default.
			// 通俗来说, 在update属性时会用定义model时的validator进行检测
			runValidators: true
        }); */

		// traditional way to find user and then update
		const user = req.user;
		updateProperties.forEach(property => {
			user[property] = req.body[property];
		});
		await user.save();

		// If updating successfully
		res.send(user);
	} catch (error) {
		res.status(400).send(error);
	}
});

// Delete an user by id
router.delete("/users/me", auth, async (req, res) => {
	try {
		// remove the authenticated user profile.
		await req.user.remove();
		await sendLeaveEmail(req.user.email, req.user.name);
		res.send("Delete successfully!");
	} catch (error) {
		res.status(500).send(error);
	}
});

// destination directory
const upload = multer({
	// dest: "avatar",
	limits: {
		fileSize: 1000000
	},
	fileFilter(req, file, cb) {
		if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
			return cb(new Error("Please upload an image!"));
		}
		return cb(undefined, true);
	}
});

// Endpoint used for uploading a profile
router.post(
	"/users/me/avatar",
	auth,
	upload.single("avatar"),
	async (req, res) => {
		// 只有在上面的dest参数不出现的情况下才能访问req.file
		// req.user.avatar = req.file.buffer;
		// 在储存之前用sharp module格式化并转换图片格式为png
		const buffer = await sharp(req.file.buffer)
			.resize({ width: 250, height: 250 })
			.png()
			.toBuffer();
		req.user.avatar = buffer;
		await req.user.save();
		res.send("Successfully uploaded your profile!");
	},
	// 在末尾新加的方程专门用于处理middleware中发生的error,使其能够以JSON的形式返回给client
	// Set up error handler function
	(error, req, res, next) => {
		res.status(400).send({ error: error.message });
	}
);

// Endpoint used for deleting a profile
router.delete("/users/me/avatar", auth, async (req, res) => {
	try {
		if (!req.user.avatar) {
			throw new Error("User picture does not exist!");
		}
		// 清楚avatar field(想要清除db中的field,设置为undefined)
		req.user.avatar = undefined;
		// save user to db
		await req.user.save();
		res.send("Successfully deleted your profile!");
	} catch (error) {
		res.status(500).send({ error: error.message });
	}
});

// Endpoint used for showing a profile
router.get("/users/:id/avatar", async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user || !user.avatar) {
			throw new Error("User picture does not exist!");
		}
		res.set("Content-Type", "image/png");
		res.send(user.avatar);
	} catch (error) {
		res.status(404).send({ error: error.message });
	}
});

module.exports = router;
