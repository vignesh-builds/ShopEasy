package com.shopeasy.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequest(@NotBlank @Size(max = 100) String customerName,
                           @Email @NotBlank @Size(max = 190) String email,
                           @NotBlank @Size(max = 1000) String address,
                           @NotEmpty @Valid List<Item> items) {

    /** size / color are optional: only products that offer them need them. */
    public record Item(@NotNull @Positive Long productId,
                       @Min(1) @Max(50) int quantity,
                       @Size(max = 50) String size,
                       @Size(max = 50) String color) {
    }
}
