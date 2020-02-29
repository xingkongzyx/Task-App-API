const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const Task = require("../models/task");

// Creation endpoint for task
router.post("/tasks", auth, async (req, res) => {
	// const newTask = new Task(req.body);
	const newTask = new Task({
		// Use spread operator to get all properties from req.body
		...req.body,
		owner: req.user._id
	});
	console.log(newTask);
	try {
		await newTask.save();
		// 运转顺利，status code变为201，然后send back新的document至屏幕中
		res.status(201).send(newTask);
	} catch (error) {
		res.status(400).send(error);
	}
});

// 在这里对tasks进行filter(使用url中query string), /users?completed=true
// GET /tasks?completed=true
// GET /tasks?limit=5&skip=3
// GET /tasks?sortBy=createdAt:desc
router.get("/tasks", auth, async (req, res) => {
	const isCompleted = {};
	const sort = {};

	// 如果有sortBy query, 我们将提取它的值, 并以sort object形式对其进行分离
	if (req.query.sortBy) {
		// 以':'为分隔符分离query
		const parts = req.query.sortBy.split(":");
		sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
	}

	// 如果有这个completed query, 对其value(true/false)进行提取
	if (req.query.completed) {
		// 注意提取出的query数据type为string, 我们需要转换它为对应的true/false
		isCompleted.completed = req.query.completed === "true";
	}

	try {
		await req.user
			.populate({
				path: "tasks",
				match: isCompleted,
				// 为了实现分页功能新加的两个option(skip and limit)
				options: {
					limit: parseInt(req.query.limit),
					skip: parseInt(req.query.skip),
					// sort:{createdAt: 1 aescending fashion, -1 descending fashion}
					sort
				}
			})
			.execPopulate();

		res.send(req.user.tasks);
	} catch (error) {
		res.status(500).send(Error);
	}
});

// Read all tasks data from db
router.get("/tasks/readAll", async (req, res) => {
	try {
		const allTasks = await Task.find({});
		res.send(allTasks);
	} catch (error) {
		res.status(500).send(Error);
	}
});

// Read a specific task by id
// 只有经过验证的用户才可以进行查找
router.get("/tasks/:id", auth, async (req, res) => {
	const _id = req.params.id;

	if (_id.match(/^[0-9a-fA-F]{24}$/)) {
		try {
			// 只有task id正确且task就是由此人创建才可以获取此task具体内容
			const task = await Task.findOne({ _id, owner: req.user._id });
			if (!task) {
				return res
					.status(404)
					.send(`Can not find valid task of id ${_id}`);
			}
			res.send(task);
		} catch (error) {
			res.status(500).send(error);
		}
	} else {
		res.status(404).send(`Can not find valid task of id ${_id}`);
	}
});

// Update task's property
router.patch("/tasks/:id", auth, async (req, res) => {
	// Send error if unkonwn updates
	const allowedUpdates = ["description", "completed"];
	const updateProperties = Object.keys(req.body);
	const isValid = updateProperties.every(singleProperty =>
		allowedUpdates.includes(singleProperty)
	);

	if (!isValid) {
		res.status(400).send("Can not update NON-existent property!");
	}

	// Attempt to update the task
	try {
		const task = await Task.findOne({
			_id: req.params.id,
			owner: req.user._id
		});

		if (!task) {
			return res.status(404).send();
		}

		updateProperties.forEach(property => {
			task[property] = req.body[property];
		});
		await task.save();

		/* 		const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true
		}); */

		// Handle task not found, 没找到的话task值是null

		// Handle success
		res.send(task);
	} catch (error) {
		console.log("Handle validation errors");
		// Handle validation errors
		res.status(400).send(error);
	}
});

// Delete a task by id
router.delete("/tasks/:id", auth, async (req, res) => {
	const _id = req.params.id;
	try {
		// Store deleted task
		const task = await Task.findOneAndDelete({ _id, owner: req.user._id });
		// Handle task not found
		if (!task) {
			return res.status(404).send("Can not delete this task");
		}
		// Handle success
		res.send(task);
	} catch (error) {
		// Handle error
		res.status(500).send(error);
	}
});

module.exports = router;
