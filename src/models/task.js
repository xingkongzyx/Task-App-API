const mongoose = require("mongoose");

// Explicitly create schema
const taskSchema = new mongoose.Schema(
	{
		description: {
			type: String,
			required: true,
			trim: true
		},
		completed: {
			type: Boolean,
			default: false
		},
		owner: {
			// 限制储存于owner中的数据类型为object id
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			// ref用于轻松获取对应User的profile
			ref: "User"
		}
	},
	{
		timestamps: true
	}
);

// 用于创建task model
const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
