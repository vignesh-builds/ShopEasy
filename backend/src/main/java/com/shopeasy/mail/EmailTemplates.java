package com.shopeasy.mail;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Builds the subject + HTML + plain-text version of every mail. All user-supplied text is HTML-escaped. */
final class EmailTemplates {
    private static final String GREEN = "#234c3a";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", Locale.ENGLISH);

    private EmailTemplates() {}

    record Rendered(String subject, String html, String text) { }

    /* ------------------------------------------------------------------ account mails */

    static Rendered verifyEmail(String name, String link) {
        String html = layout("Verify your email",
                p("Hi " + esc(firstName(name)) + ",")
                        + p("Welcome to ShopEasy! Please confirm your email address so we can send you order updates and "
                        + "help you recover your account.")
                        + button(link, "Verify my email")
                        + small("This link works for 24 hours. If you did not create a ShopEasy account, you can ignore this mail."),
                link);
        String text = "Hi " + firstName(name) + ",\n\nWelcome to ShopEasy! Confirm your email address here:\n" + link
                + "\n\nThis link works for 24 hours. If you did not create an account, ignore this mail.\n";
        return new Rendered("Verify your ShopEasy email", html, text);
    }

    static Rendered resetPassword(String name, String link) {
        String html = layout("Reset your password",
                p("Hi " + esc(firstName(name)) + ",")
                        + p("We received a request to reset your ShopEasy password. Click the button below to choose a new one.")
                        + button(link, "Choose a new password"),
                null);   // null = no "Button not working? Copy this link" footer in this mail
        String text = "Hi " + firstName(name) + ",\n\nReset your ShopEasy password here:\n" + link + "\n";
        return new Rendered("Reset your ShopEasy password", html, text);
    }

    /* ------------------------------------------------------------------ order mails */

    static Rendered orderPlaced(OrderMailData o, String ordersLink) {
        String html = layout("Order #" + o.orderId() + " confirmed",
                p("Hi " + esc(firstName(o.customerName())) + ", thank you for your order!")
                        + orderTable(o)
                        + addressBlock(o)
                        + p("We will email you again when your order ships.")
                        + button(ordersLink, "View my orders"),
                ordersLink);
        String text = "Hi " + firstName(o.customerName()) + ", thank you for your order!\n\n"
                + "Order #" + o.orderId() + " (" + date(o) + ")\n" + orderText(o)
                + "\nDelivery address:\n" + o.address() + "\n\nWe will email you again when your order ships.\n";
        return new Rendered("Order #" + o.orderId() + " confirmed - thank you for shopping with ShopEasy", html, text);
    }

    static Rendered orderShipped(OrderMailData o, String ordersLink) {
        String html = layout("Your order is on the way",
                p("Hi " + esc(firstName(o.customerName())) + ", good news - order #" + o.orderId() + " has been shipped.")
                        + orderTable(o)
                        + addressBlock(o)
                        + button(ordersLink, "Track my order"),
                ordersLink);
        String text = "Hi " + firstName(o.customerName()) + ", order #" + o.orderId() + " has been shipped.\n\n"
                + orderText(o) + "\nDelivery address:\n" + o.address() + "\n";
        return new Rendered("Order #" + o.orderId() + " has shipped", html, text);
    }

    static Rendered orderDelivered(OrderMailData o, String ordersLink) {
        String html = layout("Your order was delivered",
                p("Hi " + esc(firstName(o.customerName())) + ", order #" + o.orderId() + " has been delivered. We hope you love it!")
                        + orderTable(o)
                        + p("Enjoyed your purchase? Share a quick review - it helps other shoppers.")
                        + button(ordersLink, "Write a review"),
                ordersLink);
        String text = "Hi " + firstName(o.customerName()) + ", order #" + o.orderId() + " has been delivered.\n\n"
                + orderText(o) + "\nEnjoyed your purchase? You can write a review from My orders.\n";
        return new Rendered("Order #" + o.orderId() + " was delivered", html, text);
    }

    /** Cancelled / return requested / approved / rejected / refunded. */
    static Rendered orderUpdate(OrderMailData o, String ordersLink) {
        String headline;
        String message;
        switch (o.status()) {
            case "CANCELLED" -> { headline = "Your order was cancelled";
                message = "order #" + o.orderId() + " has been cancelled and the items are back in stock. If you paid online, the amount will be returned to you."; }
            case "RETURN_REQUESTED" -> { headline = "We received your return request";
                message = "we have your return request for order #" + o.orderId() + ". Our team will review it and email you the decision."; }
            case "RETURN_APPROVED" -> { headline = "Your return was approved";
                message = "your return for order #" + o.orderId() + " was approved. Your refund will be processed shortly."; }
            case "RETURN_REJECTED" -> { headline = "Your return request was declined";
                message = "we could not approve the return for order #" + o.orderId() + ". Please contact support if you have questions."; }
            default -> { headline = "Your refund was issued";
                message = "the refund for order #" + o.orderId() + " has been issued: " + money(o.total()) + "."; }
        }
        String html = layout(headline, p("Hi " + esc(firstName(o.customerName())) + ", " + esc(message))
                + orderTable(o) + button(ordersLink, "View my orders"), ordersLink);
        String text = "Hi " + firstName(o.customerName()) + ", " + message + "\n\n" + orderText(o);
        return new Rendered("Order #" + o.orderId() + " - " + headline.toLowerCase(), html, text);
    }

    /* ------------------------------------------------------------------ pieces */

    private static String orderTable(OrderMailData o) {
        StringBuilder rows = new StringBuilder();
        for (OrderMailData.Line l : o.items()) {
            rows.append("<tr><td style=\"padding:10px 0;border-bottom:1px solid #e6e7df;font-size:14px;color:#1e2823\">")
                    .append(esc(l.name()))
                    .append(options(l))
                    .append("<br><span style=\"color:#7a817b;font-size:12px\">Qty ").append(l.quantity()).append("</span></td>")
                    .append("<td align=\"right\" style=\"padding:10px 0;border-bottom:1px solid #e6e7df;font-size:14px;color:#1e2823\">")
                    .append(money(l.unitPrice() * l.quantity())).append("</td></tr>");
        }
        rows.append("<tr><td style=\"padding:12px 0;font-size:15px;font-weight:700\">Total</td>")
                .append("<td align=\"right\" style=\"padding:12px 0;font-size:15px;font-weight:700\">")
                .append(money(o.total())).append("</td></tr>");
        return "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:8px 0 18px\">"
                + rows + "</table>";
    }

    private static String optionsPlain(OrderMailData.Line l) {
        String size = blank(l.size()) ? "" : "Size " + l.size();
        String color = blank(l.color()) ? "" : l.color();
        return size.isEmpty() ? color : color.isEmpty() ? size : size + " / " + color;
    }

    private static String options(OrderMailData.Line l) {
        String joined = optionsPlain(l);
        return joined.isEmpty() ? "" : " <span style=\"color:#7a817b;font-size:12px\">(" + esc(joined) + ")</span>";
    }

    private static String addressBlock(OrderMailData o) {
        return "<p style=\"margin:0 0 6px;font-size:13px;color:#7a817b\">Delivery address</p>"
                + "<p style=\"margin:0 0 18px;font-size:14px;line-height:1.6;color:#1e2823\">"
                + esc(o.address()).replace("\n", "<br>") + "</p>";
    }

    private static String orderText(OrderMailData o) {
        StringBuilder sb = new StringBuilder();
        for (OrderMailData.Line l : o.items()) {
            sb.append("- ").append(l.name());
            String opts = optionsPlain(l);
            if (!opts.isEmpty()) sb.append(" (").append(opts).append(')');
            sb.append("  x").append(l.quantity()).append("  ").append(money(l.unitPrice() * l.quantity())).append('\n');
        }
        sb.append("Total: ").append(money(o.total())).append('\n');
        return sb.toString();
    }

    private static String layout(String heading, String body, String fallbackLink) {
        return "<!doctype html><html><body style=\"margin:0;padding:0;background:#f7f6f1\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f7f6f1;padding:24px 0\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"560\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e7df;border-radius:14px\">"
                + "<tr><td style=\"padding:22px 28px;border-bottom:1px solid #e6e7df;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:" + GREEN + "\">ShopEasy</td></tr>"
                + "<tr><td style=\"padding:26px 28px;font-family:Arial,Helvetica,sans-serif;color:#1e2823\">"
                + "<h1 style=\"margin:0 0 16px;font-size:22px;color:" + GREEN + "\">" + esc(heading) + "</h1>"
                + body
                + (fallbackLink == null ? "" : "<p style=\"margin:22px 0 0;font-size:11px;color:#7a817b;word-break:break-all\">Button not working? Copy this link into your browser:<br>" + esc(fallbackLink) + "</p>")
                + "</td></tr></table>"
                + "<p style=\"font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7a817b;margin:14px 0 0\">This is an automated message from ShopEasy.</p>"
                + "</td></tr></table></body></html>";
    }

    private static String p(String html) {
        return "<p style=\"margin:0 0 14px;font-size:14px;line-height:1.6;color:#1e2823\">" + html + "</p>";
    }

    private static String small(String text) {
        return "<p style=\"margin:18px 0 0;font-size:12px;line-height:1.6;color:#7a817b\">" + esc(text) + "</p>";
    }

    private static String button(String link, String label) {
        return "<p style=\"margin:20px 0 0\"><a href=\"" + esc(link) + "\" style=\"display:inline-block;background:" + GREEN
                + ";color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:999px\">"
                + esc(label) + "</a></p>";
    }

    /* ------------------------------------------------------------------ helpers */

    private static String date(OrderMailData o) {
        return o.createdAt() == null ? "" : o.createdAt().format(DATE);
    }

    private static String money(double v) {
        return String.format(Locale.ENGLISH, "\u20B9%,.2f", v);
    }

    private static String firstName(String fullName) {
        if (blank(fullName)) return "there";
        return fullName.trim().split("\\s+")[0];
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    static String esc(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (char c : s.toCharArray()) {
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
