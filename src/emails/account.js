const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDFRID_APIKEY);


const sendWelcomeEmail = (email, userName) => {
	sgMail.send({
		to: email,
		from: "yz298@nau.edu",
		subject: "Welcome to sign up on Yuxuan's demo",
		text: `Hello ${userName}, it's my pleasure that you can visit my Task App Demo!`
	});
};

const sendLeaveEmail = (email, userName) => {
    sgMail.send({
        to: email,
        from: "yz298@nau.edu",
        subject: "Thank you for visiting!",
        text: `Hello ${userName}, thanks for visting my demo and consider me for this position!`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendLeaveEmail
};
