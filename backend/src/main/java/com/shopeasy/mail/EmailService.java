package com.shopeasy.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${app.frontend.url:https://shopeasy-frontend-wvvl.onrender.com}")
    private String frontendUrl;

    @Value("${brevo.sender.email:vigneshsankar1926@gmail.com}")
    private String senderEmail;

    @Value("${brevo.sender.name:ShopEasy}")
    private String senderName;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Common method to send transactional email via Brevo REST API.
     */
    public void sendEmail(String recipientName, String toEmail, String subject, String htmlContent) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.error("Brevo API key is not configured! Check BREVO_API_KEY environment variable.");
            return;
        }

        try {
            log.info("Sending email via Brevo API to: {} ({}) with subject: {}", toEmail, recipientName, subject);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey.trim());

            Map<String, Object> sender = Map.of(
                    "name", senderName,
                    "email", senderEmail
            );

            Map<String, String> recipient = Map.of(
                    "email", toEmail.trim(),
                    "name", (recipientName != null && !recipientName.isBlank()) ? recipientName : toEmail.trim()
            );

            Map<String, Object> requestBody = Map.of(
                    "sender", sender,
                    "to", List.of(recipient),
                    "subject", subject,
                    "htmlContent", htmlContent
            );

            HttpEntity> requestEntity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    BREVO_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            log.info("Email sent successfully to {}. Brevo response status: {}", toEmail, response.getStatusCode());

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("Brevo API error while sending email to {}: {} - {}", toEmail, e.getStatusCode(), e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Unexpected error while sending email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Sends password reset link. Called from AuthService.forgotPassword(email)
     */
    @Async
    public void sendPasswordResetEmail(String fullName, String toEmail, String rawToken) {
        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
        String subject = "Reset your ShopEasy password";
        
        String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;\">"
                + "<h2 style=\"color: #2563eb;\">ShopEasy</h2>"
                + "<p>Hi <strong>" + (fullName != null ? fullName : "Customer") + "</strong>,</p>"
                + "<p>We received a request to reset your password. Click the button below to choose a new one:</p>"
                + "<p style=\"text-align: center; margin: 30px 0;\">"
                + "<a href=\"" + resetLink + "\" style=\"background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;\">Reset Password</a>"
                + "</p>"
                + "<p style=\"color: #64748b; font-size: 14px;\">This link is valid for 30 minutes. If you did not make this request, you can safely ignore this email.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;\" />"
                + "<p style=\"color: #94a3b8; font-size: 12px;\">If the button doesn't work, copy and paste this link into your browser:<br/>"
                + "<a href=\"" + resetLink + "\" style=\"color: #2563eb;\">" + resetLink + "</a></p>"
                + "</div>";

        sendEmail(fullName, toEmail, subject, htmlContent);
    }

    /**
     * Sends account verification link. Called from AuthService.register() and AuthService.resendVerification()
     */
    @Async
    public void sendVerificationEmail(String fullName, String toEmail, String rawToken) {
        String verifyLink = frontendUrl + "/verify-email?token=" + rawToken;
        String subject = "Verify your ShopEasy account";

        String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;\">"
                + "<h2 style=\"color: #2563eb;\">Welcome to ShopEasy!</h2>"
                + "<p>Hi <strong>" + (fullName != null ? fullName : "Customer") + "</strong>,</p>"
                + "<p>Thank you for creating an account. Please click the button below to verify your email address:</p>"
                + "<p style=\"text-align: center; margin: 30px 0;\">"
                + "<a href=\"" + verifyLink + "\" style=\"background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;\">Verify Email</a>"
                + "</p>"
                + "<p style=\"color: #64748b; font-size: 14px;\">This link is valid for 24 hours.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;\" />"
                + "<p style=\"color: #94a3b8; font-size: 12px;\">If the button doesn't work, copy and paste this link into your browser:<br/>"
                + "<a href=\"" + verifyLink + "\" style=\"color: #16a34a;\">" + verifyLink + "</a></p>"
                + "</div>";

        sendEmail(fullName, toEmail, subject, htmlContent);
    }
}
