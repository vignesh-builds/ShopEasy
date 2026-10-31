package com.shopeasy.dto;

public record AdminSummaryResponse(long products, long orders, long users, double revenue, long pendingReturns) {
}
