package com.shopeasy;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Checks the React <-> Spring contract: public API, CORS, JWT login, roles, checkout, error format. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTests {

    private static final String REACT_ORIGIN = "http://localhost:5173";
    private static final String ADDRESS = "12 Test Street, Chennai 600001";

    @Autowired
    private MockMvc mvc;

    @Test
    void productsAndCategoriesArePublic() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").exists());
        mvc.perform(get("/api/categories")).andExpect(status().isOk()).andExpect(jsonPath("$[0]").exists());
        mvc.perform(get("/api/products/999999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Product not found"));
    }

    @Test
    void reactDevServerOriginIsAllowedByCors() throws Exception {
        mvc.perform(options("/api/products")
                        .header(HttpHeaders.ORIGIN, REACT_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, REACT_ORIGIN));
        mvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, REACT_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, REACT_ORIGIN));
    }

    @Test
    void adminRoutesNeedAnAdminToken() throws Exception {
        mvc.perform(get("/api/admin/summary")).andExpect(status().isUnauthorized());

        String userToken = register("user" + System.nanoTime() + "@example.com");
        mvc.perform(get("/api/admin/summary").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        String adminToken = login("admin@shop.com", "Admin@123");
        mvc.perform(get("/api/admin/summary").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products").exists())
                .andExpect(jsonPath("$.revenue").exists());
        mvc.perform(get("/api/admin/orders").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/orders").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateUpdateAndDeleteProducts() throws Exception {
        String adminToken = login("admin@shop.com", "Admin@123");
        String payload = "{\"name\":\"Test Lamp\",\"description\":\"A lamp\",\"category\":\"Home\","
                + "\"price\":999,\"imageUrl\":\"https://example.com/lamp.jpg\",\"stock\":7}";

        String created = mvc.perform(post("/api/admin/products").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Lamp"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(created, "$.id");

        mvc.perform(delete("/api/admin/products/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/products/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void invalidProductReturnsReadableError() throws Exception {
        String adminToken = login("admin@shop.com", "Admin@123");
        mvc.perform(post("/api/admin/products").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"price\":-5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void meEndpointNeedsAToken() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());

        String email = "me" + System.nanoTime() + "@example.com";
        String token = register(email);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void duplicateRegistrationAndWrongPasswordReturnReadableErrors() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@shop.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));

        String email = "dup" + System.nanoTime() + "@example.com";
        register(email);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Dup User\",\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Email is already registered"));
    }

    @Test
    void invalidOrderReturnsReadableError() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void checkoutReducesStockAndOrdersAreAdminOnly() throws Exception {
        String before = mvc.perform(get("/api/products/1")).andReturn().getResponse().getContentAsString();
        int stockBefore = JsonPath.read(before, "$.stock");

        String orderJson = "{\"customerName\":\"Test Buyer\",\"email\":\"buyer@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[{\"productId\":1,\"quantity\":1,\"size\":\"8\",\"color\":\"Black\"}]}";
        String created = mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PLACED"))
                .andReturn().getResponse().getContentAsString();
        int orderId = JsonPath.read(created, "$.id");

        mvc.perform(get("/api/products/1")).andExpect(jsonPath("$.stock").value(stockBefore - 1));

        mvc.perform(get("/api/orders/" + orderId)).andExpect(status().isUnauthorized());
        String adminToken = login("admin@shop.com", "Admin@123");
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value(1))
                .andExpect(jsonPath("$.items[0].size").value("8"))
                .andExpect(jsonPath("$.items[0].color").value("Black"));
    }

    @Test
    void productDetailsIncludeVariantsAndOrdersNeedAValidChoice() throws Exception {
        mvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sizes[0]").value("6"))
                .andExpect(jsonPath("$.colors[0].name").value("White"))
                .andExpect(jsonPath("$.images").isArray())
                .andExpect(jsonPath("$.mrp").isNumber());

        String head = "{\"customerName\":\"Test Buyer\",\"email\":\"buyer@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[";
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content(head + "{\"productId\":1,\"quantity\":1}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Please choose a size for Everyday Sneakers"));
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content(head + "{\"productId\":1,\"quantity\":1,\"size\":\"99\",\"color\":\"Black\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid size '99' for Everyday Sneakers"));
    }

    @Test
    void cannotOrderMoreThanStock() throws Exception {
        String orderJson = "{\"customerName\":\"Test Buyer\",\"email\":\"buyer@example.com\","
                + "\"address\":\"" + ADDRESS + "\",\"items\":[{\"productId\":1,\"quantity\":50},"
                + "{\"productId\":1,\"quantity\":50}]}";
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Not enough stock for Everyday Sneakers"));
    }

    // ---------------- reviews ----------------

    @Test
    void reviewsNeedLoginAndRatingsAreCalculatedFromRealReviews() throws Exception {
        String adminToken = login("admin@shop.com", "Admin@123");
        String created = mvc.perform(post("/api/admin/products").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'name':'Review Lamp','description':'A lamp','category':'Home','price':500,"
                                + "'imageUrl':'https://example.com/l.jpg','stock':5}")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(created, "$.id");
        String url = "/api/products/" + id + "/reviews";

        // public read, no reviews yet
        mvc.perform(get(url)).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(0))
                .andExpect(jsonPath("$.reviews").isEmpty());
        mvc.perform(get("/api/products/" + id)).andExpect(jsonPath("$.rating").doesNotExist());

        // writing needs a login
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(q("{'rating':5,'comment':'Great'}")))
                .andExpect(status().isUnauthorized());

        String alice = register("alice" + System.nanoTime() + "@example.com");
        String bob = register("bob" + System.nanoTime() + "@example.com");

        // validation
        mvc.perform(post(url).header("Authorization", "Bearer " + alice).contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'rating':6,'comment':'Great'}")))
                .andExpect(status().isBadRequest());
        mvc.perform(post(url).header("Authorization", "Bearer " + alice).contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'rating':4,'comment':'   '}")))
                .andExpect(status().isBadRequest());

        // alice 5 stars, bob 3 stars -> average 4.0
        mvc.perform(post(url).header("Authorization", "Bearer " + alice).contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'rating':5,'title':'Love it','comment':'Great lamp'}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(1))
                .andExpect(jsonPath("$.myReview.rating").value(5))
                .andExpect(jsonPath("$.myReview.userName").value("Test U."));
        mvc.perform(post(url).header("Authorization", "Bearer " + bob).contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'rating':3,'comment':'Okay'}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(2))
                .andExpect(jsonPath("$.summary.average").value(4.0))
                .andExpect(jsonPath("$.summary.breakdown['5']").value(1))
                .andExpect(jsonPath("$.summary.breakdown['3']").value(1))
                .andExpect(jsonPath("$.summary.breakdown['4']").value(0));
        mvc.perform(get("/api/products/" + id))
                .andExpect(jsonPath("$.rating").value(4.0))
                .andExpect(jsonPath("$.ratingCount").value(2));

        // a guest sees both reviews but none is "mine"; alice sees hers flagged
        mvc.perform(get(url)).andExpect(jsonPath("$.reviews.length()").value(2))
                .andExpect(jsonPath("$.myReview").doesNotExist());
        mvc.perform(get(url).header("Authorization", "Bearer " + alice))
                .andExpect(jsonPath("$.myReview.title").value("Love it"));

        // editing replaces (still 2 reviews), deleting removes
        mvc.perform(post(url).header("Authorization", "Bearer " + alice).contentType(MediaType.APPLICATION_JSON)
                        .content(q("{'rating':1,'comment':'Broke after a week'}")))
                .andExpect(jsonPath("$.summary.count").value(2))
                .andExpect(jsonPath("$.summary.average").value(2.0));
        mvc.perform(delete(url + "/mine").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.count").value(1))
                .andExpect(jsonPath("$.myReview").doesNotExist());
        mvc.perform(delete(url + "/mine").header("Authorization", "Bearer " + alice))
                .andExpect(status().isNotFound());

        // unknown product
        mvc.perform(get("/api/products/999999/reviews")).andExpect(status().isNotFound());
    }

    // ---------------- my orders ----------------

    @Test
    void myOrdersShowOnlyTheLoggedInUsersOrdersAndAdminMovesStatusForward() throws Exception {
        mvc.perform(get("/api/orders/mine")).andExpect(status().isUnauthorized());

        String token = register("shopper" + System.nanoTime() + "@example.com");
        String other = register("other" + System.nanoTime() + "@example.com");
        mvc.perform(get("/api/orders/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

        String orderJson = q("{'customerName':'Shopper','email':'shopper@example.com','address':'" + ADDRESS + "',"
                + "'items':[{'productId':2,'quantity':1,'color':'Black'}]}");

        // logged-in order is linked to the user ...
        String created = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int orderId = JsonPath.read(created, "$.id");
        // ... a guest order is not
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(orderJson))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/orders/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(orderId))
                .andExpect(jsonPath("$[0].status").value("PLACED"))
                .andExpect(jsonPath("$[0].items[0].productId").value(2))
                .andExpect(jsonPath("$[0].items[0].color").value("Black"));
        mvc.perform(get("/api/orders/mine").header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$").isEmpty());

        // admin status: only forward, one step at a time, admin only
        String adminToken = login("admin@shop.com", "Admin@123");
        String statusUrl = "/api/admin/orders/" + orderId + "/status";
        mvc.perform(put(statusUrl).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'status':'SHIPPED'}")))
                .andExpect(status().isForbidden());
        mvc.perform(put(statusUrl).header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'status':'DELIVERED'}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Cannot change order status from PLACED to DELIVERED"));
        mvc.perform(put(statusUrl).header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'status':'shipped'}")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SHIPPED"));
        mvc.perform(put(statusUrl).header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'status':'DELIVERED'}")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DELIVERED"));
        mvc.perform(get("/api/orders/mine").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].status").value("DELIVERED"));

        // the buyer's review of that product carries the "Verified purchase" flag
        mvc.perform(post("/api/products/2/reviews").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'rating':5,'comment':'Sounds great'}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myReview.verifiedPurchase").value(true));
        mvc.perform(post("/api/products/2/reviews").header("Authorization", "Bearer " + other)
                        .contentType(MediaType.APPLICATION_JSON).content(q("{'rating':4,'comment':'Looks good'}")))
                .andExpect(jsonPath("$.myReview.verifiedPurchase").value(false));
    }

    // ---------------- wishlist ----------------

    @Test
    void wishlistNeedsLoginAndIsPerUser() throws Exception {
        mvc.perform(get("/api/wishlist")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/wishlist/1")).andExpect(status().isUnauthorized());

        String alice = register("wish-alice" + System.nanoTime() + "@example.com");
        String bob = register("wish-bob" + System.nanoTime() + "@example.com");

        mvc.perform(get("/api/wishlist").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

        // add (twice = still one), newest first
        mvc.perform(put("/api/wishlist/1").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(put("/api/wishlist/1").header("Authorization", "Bearer " + alice))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(put("/api/wishlist/2").header("Authorization", "Bearer " + alice))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0]").value(2));

        // unknown product, and another user does not see alice's list
        mvc.perform(put("/api/wishlist/999999").header("Authorization", "Bearer " + alice))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/wishlist").header("Authorization", "Bearer " + bob))
                .andExpect(jsonPath("$").isEmpty());

        // guest items are merged after login (duplicates / unknown ids skipped)
        mvc.perform(post("/api/wishlist/merge").header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productIds\":[3,3,999999,4]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));

        // remove (removing something not saved is fine)
        mvc.perform(delete("/api/wishlist/1").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(delete("/api/wishlist/1").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void customerCanCancelAPlacedOrderAndStockComesBack() throws Exception {
        String token = register("canceller" + System.nanoTime() + "@example.com");
        int stockBefore = JsonPath.read(mvc.perform(get("/api/products/1")).andReturn().getResponse().getContentAsString(), "$.stock");
        int orderId = placeOrderAs(token, 1);
        mvc.perform(get("/api/products/1")).andExpect(jsonPath("$.stock").value(stockBefore - 1));

        // a reason is required, and strangers cannot cancel it
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        String other = register("stranger" + System.nanoTime() + "@example.com");
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"not mine\"}")).andExpect(status().isNotFound());
        mvc.perform(post("/api/orders/" + orderId + "/cancel").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"x\"}")).andExpect(status().isUnauthorized());

        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Ordered by mistake\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Ordered by mistake"));
        mvc.perform(get("/api/products/1")).andExpect(jsonPath("$.stock").value(stockBefore));

        // already cancelled
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"again\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void shippedOrdersCannotBeCancelledAndDeliveredOnesCanBeReturnedAndRefunded() throws Exception {
        String token = register("returner" + System.nanoTime() + "@example.com");
        String admin = login("admin@shop.com", "Admin@123");
        int orderId = placeOrderAs(token, 1);

        // return only after delivery
        mvc.perform(post("/api/orders/" + orderId + "/return").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Too small\"}")).andExpect(status().isBadRequest());

        setStatus(admin, orderId, "SHIPPED", 200);
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Changed my mind\"}")).andExpect(status().isBadRequest());
        setStatus(admin, orderId, "DELIVERED", 200);

        mvc.perform(post("/api/orders/" + orderId + "/return").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Too small\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETURN_REQUESTED"))
                .andExpect(jsonPath("$.returnReason").value("Too small"));

        // the admin sees the open return (list + dashboard counter)
        mvc.perform(get("/api/admin/orders").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + orderId + ")].status").value("RETURN_REQUESTED"))
                .andExpect(jsonPath("$[?(@.id == " + orderId + ")].returnReason").value("Too small"));
        mvc.perform(get("/api/admin/summary").header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.pendingReturns").isNumber());

        // admin must approve before a refund, and cannot refund twice
        setStatus(admin, orderId, "REFUNDED", 400);
        setStatus(admin, orderId, "RETURN_APPROVED", 200);
        setStatus(admin, orderId, "REFUNDED", 200);
        setStatus(admin, orderId, "REFUNDED", 400);
    }

    // ---- helpers ----
    /** Lets the JSON in the tests use 'single quotes'. */
    private static String q(String json) {
        return json.replace('\'', '"');
    }

    private int placeOrderAs(String token, int productId) throws Exception {
        String json = "{\"customerName\":\"Test Buyer\",\"email\":\"buyer@example.com\",\"address\":\"" + ADDRESS
                + "\",\"items\":[{\"productId\":" + productId + ",\"quantity\":1,\"size\":\"8\",\"color\":\"Black\"}]}";
        String body = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private void setStatus(String adminToken, int orderId, String status, int expected) throws Exception {
        mvc.perform(put("/api/admin/orders/" + orderId + "/status").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\"}"))
                .andExpect(status().is(expected));
    }

    private String register(String email) throws Exception {
        String json = "{\"fullName\":\"Test User\",\"email\":\"" + email + "\",\"password\":\"password123\"}";
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private String login(String email, String password) throws Exception {
        String json = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }
}
