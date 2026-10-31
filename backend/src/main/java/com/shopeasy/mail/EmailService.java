package com.shopeasy.mail;

import com.shopeasy.mail.EmailTemplates.Rendered;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends every mail ShopEasy produces.
 *
 * - SMTP configured (spring.mail.host set, e.g. SendGrid / Amazon SES / Gmail): the mail is really sent.
 * - Not configured (default for local development): nothing is sent, the mail - including its links - is printed to
 *   the backend console, so you can still click "verify" / "reset password" while developing.
 *
 * Every method runs in the background ("mailExecutor") and never throws: a mail problem must not break
 * checkout, registration or an admin status change.
 */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final String frontendUrl;

    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${app.mail.from:ShopEasy <no-reply@shopeasy.local>}") String from,
                        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    /* ---------------------------------------------------------------- account mails */

    @Async("mailExecutor")
    public void sendVerificationEmail(String name, String to, String rawToken) {
        deliver(to, EmailTemplates.verifyEmail(name, frontendUrl + "/#/verify-email?token=" + rawToken));
    }

    @Async("mailExecutor")
    public void sendPasswordResetEmail(String name, String to, String rawToken) {
        deliver(to, EmailTemplates.resetPassword(name, frontendUrl + "/#/reset-password?token=" + rawToken));
    }

    /* ---------------------------------------------------------------- order mails */

    @Async("mailExecutor")
    public void sendOrderPlaced(OrderMailData order) {
        deliver(order.email(), EmailTemplates.orderPlaced(order, frontendUrl + "/#/orders"));
    }

    @Async("mailExecutor")
    public void sendOrderShipped(OrderMailData order) {
        deliver(order.email(), EmailTemplates.orderShipped(order, frontendUrl + "/#/orders"));
    }

    @Async("mailExecutor")
    public void sendOrderDelivered(OrderMailData order) {
        deliver(order.email(), EmailTemplates.orderDelivered(order, frontendUrl + "/#/orders"));
    }

    @Async("mailExecutor")
    public void sendOrderUpdate(OrderMailData order) {
        deliver(order.email(), EmailTemplates.orderUpdate(order, frontendUrl + "/#/orders"));
    }

    /* ---------------------------------------------------------------- delivery */

    private void deliver(String to, Rendered mail) {
        try {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                log.info("\n------------- EMAIL (SMTP not configured - printed instead of sent) -------------\n"
                        + "To:      {}\nSubject: {}\n\n{}\n---------------------------------------------------------------------------------",
                        to, mail.subject(), mail.text());
                return;
            }
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(mail.subject());
            helper.setText(mail.text(), mail.html());
            sender.send(message);
            log.info("Email '{}' sent to {}", mail.subject(), to);
        } catch (Exception e) {
            log.error("Could not send email '{}' to {}: {}", mail.subject(), to, e.getMessage());
        }
    }
}
