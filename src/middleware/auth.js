const jwt = require("jsonwebtoken");
const User = require("../models/user");

const auth = async (req, res, next) => {
	try {
		// 因为伴随着request传过来的token包含有Authorization header,
		// 我们只需要提取他们的值
		const token = req.header("Authorization").replace("Bearer ", "");
		// 使用verify方法获取decoded obj,格式为
		// decoded:  { id: '5e4fbbe5c7125350902294ca', iat: 1582627510 }
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// 使用id获取user,同时使用"tokens.token"确保token仍然有效(如果user log out, 将无法找到对应user)
		const user = await User.findOne({
			_id: decoded._id,
			"tokens.token": token
		});
		if (!user) {
			throw new Error();
		}
		// 这里已经fetch user, 不需要在route handler再次fetch
		// 解决方法在req上添加一个user property来传递user
		req.user = user;

		// 在logout route上使用, 方便取得已经认证的token然后进行logout(从token array中移除此token)
		req.token = token;

		// 在验证成功后确保route handler继续运行
		next();
	} catch (e) {
		res.status(401).send({ error: "Please authenticate" });
	}
};

module.exports = auth;
