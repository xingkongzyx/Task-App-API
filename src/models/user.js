const mongoose = require("mongoose");
const validator = require("validator");

const bcrypt = require("bcryptjs");
const Task = require("../models/task");
const jwt = require("jsonwebtoken");
// 如果不手动创建schema, 在创建model时第二个params会被转化成schema(behind the scene),
// 为了利用mongoose middleware的特性，我们需要把schema、model分离开来
const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		age: {
			type: Number,
			validate(value) {
				if (value < 0) {
					throw new Error("Value should be positive");
				}
			},
			default: 0
		},
		email: {
			type: String,
			required: true,
			validate(value) {
				if (!validator.isEmail(value)) {
					throw new Error("Email is not valid!");
				}
			},
			trim: true,
			lowercase: true,
			// 确保Email会类似于id一样独一无二，不会重复
			unique: true
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
			trim: true,
			validate(value) {
				if (value.toLowerCase().includes("password")) {
					throw new Error(
						"Should not include 'password' in your password"
					);
				}
			}
		},
		// 其中的token field会是一个array, 每个元素都会是一个object
		tokens: [
			{
				token: {
					type: "String",
					required: true
				}
			}
		],
		// 用于存储profile图片包含的二进制数据
		avatar: {
			type: Buffer
		}
	},
	{
		/* If set timestamps, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date. 默认是false,所以在这里设定为true */
		timestamps: true
	}
);

// Not stored in db. 不会改变document本身，仅仅用于mongoose可以知道哪两个entity有关联
userSchema.virtual("tasks", {
	ref: "Task",
	localField: "_id",
	foreignField: "owner"
});

// 对于user route中所有res.send(user)的节点，都会在调用本方法后在返回response到前端
// 本method将用于隐藏要发回的user中的password属性和tokens属性
userSchema.methods.toJSON = function() {
	const user = this;
	const userObject = user.toObject();
	delete userObject.password;
	delete userObject.tokens;
	delete userObject.avatar;
	return userObject;
};

// 使用methods, 意味着Instances(不是model本身)可以access it, 一般称为instance method
userSchema.methods.generateAuthToken = async function() {
	const user = this;
	// Generate token using sign method
	const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
	// Add new token to its tokens field
	user.tokens = user.tokens.concat({ token });
	// Save to database
	await user.save();
	return token;
};

// 在userSchema.statics上定义的方程可以直接以model.funcName的形式调用
// Model可以access it, 一般称为model method
userSchema.statics.finfByCredentials = async (email, password) => {
	const user = await User.findOne({ email });
	// Can not find the user by email
	if (!user) {
		throw new Error("Unable to login");
	}

	// Find the user, and then match the password
	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		throw new Error("Unable to login");
	}

	// If password matches, mean log in well
	return user;
};

// The name of the event
// The function to run as middleware
// Hash the plaintext password before saving
userSchema.pre("save", async function(next) {
	const user = this;

	// 下面就是middleware具体的执行
	// 在用户的password发生变化时(create user and update user), 会对user新的password进行hash
	// middleware的加入使得我们不用在两个router中进行修改, 只需要在这一处添加信息
	if (user.isModified("password")) {
		user.password = await bcrypt.hash(user.password, 8);
	}

	// next()用于提升程序进行下面code的运行
	next();
});

// 另一个middleware, 在完成remove 任务前删除所有owner为此user._id的任务
userSchema.pre("remove", async function(next) {
	const user = this;
	await Task.deleteMany({ owner: user._id });
	// 用于在完成删除任务后可以继续运行
	next();
});
// 用于创建user model
const User = mongoose.model("User", userSchema);

module.exports = User;
