const mongoose = require("mongoose");

// 使用mongoose model然后连接到数据库,其中db的名字是task-manager-api
mongoose.connect(process.env.MONGODB_URL, {
	useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
});




