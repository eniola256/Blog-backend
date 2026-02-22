import nodemailer from "nodemailer";

/**
 * Create email transporter based on environment configuration
 */
const createTransport = () => {
  console.log("📧 Creating email transporter...");
  console.log("   EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("   EMAIL_PORT:", process.env.EMAIL_PORT);
  console.log("   EMAIL_USER:", process.env.EMAIL_USER ? "✅ Set" : "❌ Not set");
  console.log("   EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Not set");
  
  return nodemailer.createTransport({
    host: "smtp.gmail.com",  // Don't use env var - force this
    port: 587,
    secure: false,
    tls: {
      rejectUnauthorized: true
    },
    dnsOptions: {
      family: 4  // ← Move it here instead
    },
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send welcome email to new subscriber
 * @param {string} email - Subscriber's email address
 */
export const sendWelcomeEmail = async (email) => {
  console.log("📤 Sending welcome email to:", email);
  
  const transporter = createTransport();

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Blog Newsletter"}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to Our Newsletter!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Our Newsletter!</h1>
          </div>
          <div class="content">
            <p>Thank you for subscribing to our blog newsletter!</p>
            <p>You'll now receive updates about our latest posts, news, and exclusive content directly in your inbox.</p>
            <p>Stay tuned for exciting updates!</p>
          </div>
          <div class="footer">
            <p>If you didn't subscribe, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
};

/**
 * Send notification email about new blog post
 * @param {string} email - Subscriber's email address
 * @param {Object} post - Post details
 */
export const sendNewPostNotification = async (email, post) => {
  const transporter = createTransport();

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Blog Newsletter"}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New Post: ${post.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Blog Post!</h1>
          </div>
          <div class="content">
            <h2>${post.title}</h2>
            <p>${post.excerpt || "Check out our latest post!"}</p>
            <a href="${process.env.FRONTEND_URL}/posts/${post.slug}" class="button">Read More</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to our newsletter.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send notification to all subscribers
 * @param {Object} post - Post details
 * @param {Array} subscribers - Array of subscriber emails
 */
export const notifySubscribers = async (post, subscribers) => {
  const emailPromises = subscribers.map((email) =>
    sendNewPostNotification(email, post)
  );

  await Promise.allSettled(emailPromises);
};
