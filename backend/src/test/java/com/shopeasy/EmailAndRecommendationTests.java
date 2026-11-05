package com.shopeasy;

import com.jayway.jsonpath.JsonPath;
import com.shopeasy.mail.EmailService;
import com.shopeasy.mail.OrderMailData;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Email verification, forgot / reset password, order mails and product-page recommendations. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:shopeasy_email_test;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmailAndRecommendationTests {

    private static final String ADDRESS = "12 Test Street, Chennai 600001";

    @Autowired
    private MockMvc mvc;

    /** Replaces the real mail sender, so the tests can read the one-time tokens that would be e-mailed. */
    @MockBean
    private EmailService emailService;

    /* ---------------------------------------------------------------- verify email */

    @Test
    void registeringSendsAVerificationMailAndTheLinkVerifiesTheEmail() throws Exception {
        String email = "verify" + System.nanoTime() + "@example.com";
        String body = register(email);
        String jwt = JsonPath.read(body, "$.token");
        assertEquals(false, JsonPath.read(body, "$.user.emailVerified"));

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationEmail(anyString(), eq(email), token.capture());

        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token.getValue() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));

        // clicking the same link again is harmless
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token.getValue() + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void wrongVerificationTokenIsRejected() throws Exception {
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"not-a-real-token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void resendNeedsLoginAndIsRateLimited() throws Exception {
        mvc.perform(post("/api/auth/resend-verification")).andExpect(status().isUnauthorized());

        String body = register("resend" + System.nanoTime() + "@example.com");
        String jwt = JsonPath.read(body, "$.token");
        // a mail was sent a moment ago by registration, so asking again immediately is refused politely
        mvc.perform(post("/api/auth/resend-verification").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    /* ---------------------------------------------------------------- forgot / reset password */

    @Test
    void forgotAndResetPasswordFlow() throws Exception {
        String email = "reset" + System.nanoTime() + "@example.com";
        register(email);

        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(anyString(), eq(email), token.capture());

        // asking again straight away does not send a second mail (cooldown) but answers the same way
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());
        verify(emailService, times(1)).sendPasswordResetEmail(anyString(), eq(email), anyString());

        // too-short password is refused
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token.getValue() + "\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token.getValue() + "\",\"password\":\"brandNewPass1\"}"))
                .andExpect(status().isOk());

        // old password no longer works, new one does
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"brandNewPass1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.emailVerified").value(true));

        // the link only works once
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token.getValue() + "\",\"password\":\"anotherPass123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void forgotPasswordTellsWhenNoAccountExists() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody" + System.nanoTime() + "@example.com\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").isNotEmpty());
        verify(emailService, times(0)).sendPasswordResetEmail(anyString(), anyString(), anyString());

        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest());
    }

    /* ---------------------------------------------------------------- order mails */

    @Test
    void orderConfirmationShippedAndDeliveredMailsAreSent() throws Exception {
        String orderJson = "{\"customerName\":\"Mail Buyer\",\"email\":\"mailbuyer@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[{\"productId\":5,\"quantity\":1,\"color\":\"White\"}]}";
        String created = mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int orderId = JsonPath.read(created, "$.id");

        ArgumentCaptor<OrderMailData> placed = ArgumentCaptor.forClass(OrderMailData.class);
        verify(emailService).sendOrderPlaced(placed.capture());
        assertEquals(Long.valueOf(orderId), placed.getValue().orderId());
        assertEquals("mailbuyer@example.com", placed.getValue().email());
        assertEquals(1, placed.getValue().items().size());

        String admin = loginToken("admin@shop.com", "Admin@123");
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SHIPPED\"}"))
                .andExpect(status().isOk());
        verify(emailService).sendOrderShipped(org.mockito.ArgumentMatchers.any(OrderMailData.class));

        mvc.perform(put("/api/admin/orders/" + orderId + "/status").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk());
        verify(emailService).sendOrderDelivered(org.mockito.ArgumentMatchers.any(OrderMailData.class));
    }

    @Test
    void failedOrderSendsNoMail() throws Exception {
        String orderJson = "{\"customerName\":\"Nope\",\"email\":\"nope@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[{\"productId\":5,\"quantity\":99999,\"color\":\"White\"}]}";
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(emailService);
    }

    /* ---------------------------------------------------------------- recommendations */

    @Test
    void recommendationsAreFilledAndExcludeTheProductItself() throws Exception {
        String json = mvc.perform(get("/api/products/1/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.similar").isArray())
                .andExpect(jsonPath("$.alsoBought").isArray())
                .andReturn().getResponse().getContentAsString();

        java.util.List<Integer> similarIds = JsonPath.read(json, "$.similar[*].id");
        assertFalse(similarIds.isEmpty(), "the shop has several products, so suggestions must not be empty");
        assertFalse(similarIds.contains(1), "the product itself must not be suggested");
        assertTrue(similarIds.size() <= 8);

        mvc.perform(get("/api/products/999999/recommendations")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Product not found"));
    }

    @Test
    void productsBoughtTogetherShowUpAsAlsoBought() throws Exception {
        // product 1 and product 5 in one order
        String orderJson = "{\"customerName\":\"Combo Buyer\",\"email\":\"combo@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[{\"productId\":1,\"quantity\":1,\"size\":\"8\",\"color\":\"Black\"},"
                + "{\"productId\":5,\"quantity\":1,\"color\":\"White\"}]}";
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isCreated());

        String json = mvc.perform(get("/api/products/5/recommendations"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        java.util.List<Integer> alsoBought = JsonPath.read(json, "$.alsoBought[*].id");
        assertTrue(alsoBought.contains(1), "product 1 was bought together with product 5");
        java.util.List<Integer> similar = JsonPath.read(json, "$.similar[*].id");
        assertFalse(similar.contains(1), "a product already shown under 'also bought' is not repeated");
    }

    /* ---------------------------------------------------------------- helpers */

    private String register(String email) throws Exception {
        String json = "{\"fullName\":\"Test User\",\"email\":\"" + email + "\",\"password\":\"password123\"}";
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private String loginToken(String email, String password) throws Exception {
        String json = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }
}
