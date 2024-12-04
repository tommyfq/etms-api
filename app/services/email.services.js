const express = require('express');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const config = require('../../config/app.config')

const app = express();
app.use(express.json());

//const sendEmail = async (to, subject, text, html) => {
const sendEmail = async (to,subject,templateFile, templateData) => {
  console.log("send email")
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host, // Your SMTP server
      port: config.smtp_port, // SMTP port (SSL)
      secure: config.smtp_secure, // Use SSL
      auth: {
        user: config.smtp_user, // Your email username
        pass: config.stmp_pass, // Your email password
      },
    });

    const html = await ejs.renderFile(
      path.join(__basedir, 'emails', templateFile),
      templateData
    );

    // Email options
    const mailOptions = {
        from: '"Helpdesk EPSindo" <helpdesk@epsindo.co.id>', // Sender address
        to: to, // Receiver email
        subject: subject, // Subject line
        text: '', // Plain text body
        html: html, // HTML body (optional)
      };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(info)
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error);
  }
};

const verifyEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    host: config.smtp_host, // Your SMTP server
    port: config.smtp_port, // SMTP port (SSL)
    secure: config.smtp_secure, // Use SSL
    auth: {
      user: config.smtp_user, // Your email username
      pass: config.stmp_pass, // Your email password
    },
  });
  
  try {
    await transporter.sendMail({
      from: '"Helpdesk EPSindo" <helpdesk@epsindo.co.id>',
      to: email,
      subject: "Test Email",
      text: "Hello",
    });
    console.log("Email exists!");
  } catch (error) {
    console.log("Email does not exist or rejected: ", error);
    throw new Error(`Email doest exist or rejected`);
  }
};

module.exports = {
    sendEmail,
    verifyEmail
}