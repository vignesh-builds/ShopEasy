package com.shopeasy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of "cancel order" and "request return": the customer must say why. */
public record ReasonRequest(@NotBlank @Size(min = 3, max = 500) String reason) {
}
