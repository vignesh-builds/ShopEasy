package com.shopeasy.dto;

/** Every error the API returns looks like { "error": "message" }; the React client displays that text. */
public record ErrorResponse(String error) {
}
