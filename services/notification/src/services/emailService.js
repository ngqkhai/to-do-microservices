const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const env = require('../config/env');
const { logger } = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
  }

  async initialize() {
    try {
      // Create Gmail SMTP transporter
      this.transporter = nodemailer.createTransport({
        service: env.EMAIL_SERVICE,
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_SECURE,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD
        },
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14 // Max 14 emails per second (Gmail limit)
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('✅ Gmail SMTP connection verified successfully');

      // Load email templates
      await this.loadTemplates();
      
    } catch (error) {
      logger.error('❌ Failed to initialize email service:', { error: error.message });
      throw error;
    }
  }

  async loadTemplates() {
    try {
      // Register Handlebars helpers
      handlebars.registerHelper('eq', function(a, b) {
        return a === b;
      });

      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Load reminder template
      const reminderTemplate = await fs.readFile(
        path.join(templatesDir, 'reminder.html'), 
        'utf8'
      );
      this.templates.set('reminder', handlebars.compile(reminderTemplate));
      
      logger.info('✅ Email templates loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load email templates:', { error: error.message });
      // Don't throw error, use fallback templates
    }
  }

  async sendReminderEmail(reminderData) {
    try {
      const { userId, taskId, dueDate, message, title, description, priority, status } = reminderData;

      // Get user email (you'll need to implement this based on your user service)
      const userEmail = await this.getUserEmail(userId);
      
      if (!userEmail) {
        throw new Error(`No email found for user ${userId}`);
      }

      // Format due date
      const formattedDueDate = new Date(dueDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Prepare email content
      const subject = `⏰ Task Reminder: ${title || 'Your task is due soon!'}`;
      
      // Use template if available, otherwise use simple HTML
      let html;
      if (this.templates.has('reminder')) {
        html = this.templates.get('reminder')({
          message,
          dueDate: formattedDueDate,
          taskId,
          userId,
          title: title || 'Untitled Task',
          description: description || null,
          priority: priority || 'medium',
          status: status || 'pending'
        });
      } else {
        html = this.createFallbackReminderHTML(message, formattedDueDate, title, description, priority);
      }

      // Send email
      const result = await this.transporter.sendMail({
        from: {
          name: 'To-Do App',
          address: env.EMAIL_FROM
        },
        to: userEmail,
        subject,
        html,
        headers: {
          'X-Task-ID': taskId,
          'X-User-ID': userId,
          'X-Notification-Type': 'reminder'
        }
      });

      logger.info('✅ Reminder email sent successfully', {
        messageId: result.messageId,
        userId,
        taskId,
        email: userEmail
      });

      return {
        success: true,
        messageId: result.messageId,
        email: userEmail
      };

    } catch (error) {
      logger.error('❌ Failed to send reminder email:', {
        error: error.message,
        userId: reminderData.userId,
        taskId: reminderData.taskId
      });
      throw error;
    }
  }

  createFallbackReminderHTML(message, formattedDueDate, title, description, priority) {
    const priorityColor = priority === 'high' ? '#dc3545' : priority === 'medium' ? '#ffc107' : '#28a745';
    const priorityText = priority === 'high' ? '🔴 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .task-title { font-size: 20px; font-weight: bold; margin: 15px 0; color: #333; }
          .task-description { background: #fff; padding: 15px; border-left: 3px solid #4CAF50; margin: 15px 0; }
          .priority-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Task Reminder</h1>
          </div>
          <div class="content">
            <p><strong>Hello!</strong></p>
            <div class="task-title">📋 ${title || 'Untitled Task'}</div>
            ${description ? `<div class="task-description">${description}</div>` : ''}
            <div style="margin: 15px 0;">
              <span class="priority-badge" style="background-color: ${priorityColor}; color: white;">${priorityText} Priority</span>
            </div>
            <p>${message}</p>
            <p><strong>Due Date:</strong> ${formattedDueDate}</p>
            <p>Don't forget to complete your task on time!</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from your To-Do App.</p>
            <p>If you no longer wish to receive these emails, please update your notification preferences.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getUserEmail(userId) {
    try {
      // TODO: Implement user service API call
      // For now, return a placeholder email for testing
      // In production, you would call the user service API:
      // const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      // return response.data.email;
      
      logger.warn('⚠️ Using placeholder email - implement user service integration', { userId });
      return 'nqkhai22@clc.fitus.edu.vn'; // Placeholder for testing
      
    } catch (error) {
      logger.error('❌ Failed to get user email:', { error: error.message, userId });
      throw error;
    }
  }

  async getConnectionStatus() {
    try {
      if (!this.transporter) {
        return { connected: false, error: 'Transporter not initialized' };
      }
      
      await this.transporter.verify();
      return { 
        connected: true, 
        service: env.EMAIL_SERVICE,
        user: env.EMAIL_USER 
      };
    } catch (error) {
      return { 
        connected: false, 
        error: error.message 
      };
    }
  }

  async close() {
    if (this.transporter) {
      this.transporter.close();
      logger.info('✅ Email service connection closed');
    }
  }
}

module.exports = new EmailService(); 