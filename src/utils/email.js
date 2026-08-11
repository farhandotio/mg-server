import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlTemplate = `
    <div style="max-width: 600px; margin: 20px auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #111; padding: 25px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">My Gadget</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff; color: #333;">
        <h2 style="color: #111; margin-top: 0;">${options.subject}</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">${options.message}</p>
        
        ${
          options.buttonUrl
            ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              options.buttonUrl
            }" style="background-color: #38bdf8; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
              ${options.buttonText || 'Click Here'}
            </a>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">If the button doesn't work, copy this link: <br> ${
            options.buttonUrl
          }</p>
        `
            : ''
        }
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 14px; color: #888;">If you didn't request this, please ignore this email.</p>
      </div>
      <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #aaa;">
        &copy; ${new Date().getFullYear()} My Gadget Store. All rights reserved.
      </div>
    </div>
  `;

  // ৩. ইমেইল অপশন কনফিগার করা
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"My Gadget" <noreply@mygadget.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: htmlTemplate,
  };

  // ৪. ইমেইল পাঠানো
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
