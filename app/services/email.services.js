const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

//const sendEmail = async (to, subject, text, html) => {
const sendEmail = async () => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: 'mail.epsindo.co.id', // Your SMTP server
      port: 465, // SMTP port (SSL)
      secure: true, // Use SSL
      auth: {
        user: 'helpdesk@epsindo.co.id', // Your email username
        pass: 'w]AQ3,9V2sT=', // Your email password
      },
    });

    // Email options
    const mailOptions = {
        from: '"Helpdesk EPSindo" <helpdesk@epsindo.co.id>', // Sender address
        to: 'tommyquiko@gmail.com', // Receiver email
        subject: 'Test Email from EPSindo', // Subject line
        text: 'This is a test email sent from EPSindo SMTP server.', // Plain text body
        html: '<h1>This is a test email</h1><p>Sent from EPSindo SMTP server.</p>', // HTML body (optional)
      };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = {
    sendEmail
}