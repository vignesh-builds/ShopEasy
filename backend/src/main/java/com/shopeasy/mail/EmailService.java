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
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name:ShopEasy}")
    private String senderName;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void sendEmail(String toEmail, String subject, String htmlContent) {
        if (apiKey == null || apiKey.trim().isEmpty() || senderEmail == null || senderEmail.trim().isEmpty()) {
            log.error("Brevo API key or Sender Email is missing. Email not sent to: {}", toEmail);
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey.trim());
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", senderName);
            sender.put("email", senderEmail.trim());

            Map<String, String> receiver = new HashMap<>();
            receiver.put("email", toEmail.trim());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", sender);
            requestBody.put("to", List.of(receiver));
            requestBody.put("subject", subject);
            requestBody.put("htmlContent", htmlContent);

            HttpEntity> requestEntity = new HttpEntity<>(requestBody, headers);

            log.info("Sending email via Brevo API to: {} with subject: {}", toEmail, subject);
            ResponseEntity<String> response = restTemplate.exchange(
                    BREVO_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email successfully sent to {}! Response: {}", toEmail, response.getBody());
            } else {
                log.error("Failed to send email to {}. Status: {}, Body: {}", toEmail, response.getStatusCode(), response.getBody());
            }

        } catch (Exception ex) {
            log.error("Exception while sending email via Brevo API to {}: {}", toEmail, ex.getMessage(), ex);
        }
    }

    public void sendVerificationEmail(String toEmail, String token, String appUrl) {
        String link = appUrl + "/#verify-email?token=" + token;
        String subject = "ShopEasy - Verify your email";
        String html = EmailTemplates.verificationEmail(link);
        sendEmail(toEmail, subject, html);
    }

    public void sendPasswordResetEmail(String toEmail, String token, String appUrl) {
        String link = appUrl + "/#reset-password?token=" + token;
        String subject = "ShopEasy - Password Reset Request";
        String html = EmailTemplates.passwordResetEmail(link);
        sendEmail(toEmail, subject, html);
    }

    public void sendOrderConfirmation(String toEmail, OrderMailData orderData) {
        String subject = "ShopEasy - Order Confirmed #" + orderData.getOrderId();
        String html = EmailTemplates.orderConfirmationEmail(orderData);
        sendEmail(toEmail, subject, html);
    }
}
