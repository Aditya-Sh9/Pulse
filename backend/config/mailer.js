const nodemailer = require('nodemailer');

// One transporter for the whole process (invites + digests)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const sendMail = (options) => transporter.sendMail({
  from: `"Pulse Workspace" <${process.env.EMAIL_USER}>`,
  ...options
});

module.exports = { sendMail, mailConfigured };
